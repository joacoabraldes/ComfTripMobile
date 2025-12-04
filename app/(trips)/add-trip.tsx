import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import SecondaryLayout from '@/components/layouts/SecondaryLayout';
import { useTranslation } from '@/i18n';
import { useAppColors } from '@/hooks/useAppColors';
interface CalendarDay {
  date: number;
  selected: boolean;
}

export default function AddTrip() {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const [destination, setDestination] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // búsqueda con Nominatim
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat:string, lon:string, display_name:string, address?:any} | null>(null);
  const debounceRef = useRef<any>(null);

  const today = new Date();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [saving, setSaving] = useState(false);
  const [existingTrips, setExistingTrips] = useState<any[]>([]);
  const router = useRouter();

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const days: CalendarDay[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: i, selected: false });
    }
    return { days, firstDayOfMonth };
  };

  const isPastDate = (day: number) => {
    const currentDate = new Date(currentYear, currentMonth, day);
    const today = new Date();
    today.setHours(0,0,0,0);
    return currentDate < today;
  };

  // Get all dates that are already booked by existing trips
  const getBookedDates = useCallback(() => {
    const booked = new Set<string>();
    existingTrips.forEach((trip) => {
      if (trip.start_date && trip.end_date) {
        const start = new Date(trip.start_date);
        const end = new Date(trip.end_date);
        const current = new Date(start);
        while (current <= end) {
          booked.add(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      }
    });
    return booked;
  }, [existingTrips]);

  const bookedDates = getBookedDates();

  const isDateBooked = (day: number) => {
    const currentDate = new Date(currentYear, currentMonth, day);
    const isoDate = currentDate.toISOString().split('T')[0];
    return bookedDates.has(isoDate);
  };

  const { days, firstDayOfMonth } = generateCalendarDays();

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);

    if (!startDate || (startDate && endDate)) {
      setStartDate(selectedDate);
      setEndDate(null);
    } else {
      if (selectedDate < startDate) {
        setStartDate(selectedDate);
        setEndDate(startDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const isDateInRange = (day: number) => {
    if (!startDate) return false;
    if (!endDate) return startDate.getDate() === day && startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;

    const currentDate = new Date(currentYear, currentMonth, day);
    return currentDate >= startDate && currentDate <= endDate;
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((year) => year - 1);
        return 11;
      }
      return prev - 1;
    });
    setStartDate(null);
    setEndDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((year) => year + 1);
        return 0;
      }
      return prev + 1;
    });
    setStartDate(null);
    setEndDate(null);
  };

  const monthNames = [
    t('addTrip.months.january'),
    t('addTrip.months.february'),
    t('addTrip.months.march'),
    t('addTrip.months.april'),
    t('addTrip.months.may'),
    t('addTrip.months.june'),
    t('addTrip.months.july'),
    t('addTrip.months.august'),
    t('addTrip.months.september'),
    t('addTrip.months.october'),
    t('addTrip.months.november'),
    t('addTrip.months.december'),
  ];

  const weekDays = [
    t('addTrip.weekDays.sun'),
    t('addTrip.weekDays.mon'),
    t('addTrip.weekDays.tue'),
    t('addTrip.weekDays.wed'),
    t('addTrip.weekDays.thu'),
    t('addTrip.weekDays.fri'),
    t('addTrip.weekDays.sat'),
  ];

  const formatISODate = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

  // ==== Nominatim: funciones ====
  const fetchSuggestions = useCallback(async (text: string) => {
    if (!text || text.length < 3) {
      setSuggestions([]);
      setOpenSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5&accept-language=es`;
      const res = await fetch(url, {
        headers: {
          'Referer': 'ConfTrip://', 
        },
      });
      if (!res.ok) throw new Error(t('addTrip.searchError'));
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
      setOpenSuggestions(true);
    } catch (e) {
      console.warn('Nominatim error', e);
      setSuggestions([]);
      setOpenSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Debounce: 400ms
  const onChangeQuery = (text: string) => {
    setQuery(text);
    setSelectedLocation(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text || text.length < 3) {
      setSuggestions([]);
      setOpenSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Load existing trips to check for booked dates
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { apiGet } = await import('@/helpers/api');
        const res = await apiGet('/trips');
        const data = res?.data ?? res;
        const tripsData = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        if (mounted) {
          setExistingTrips(tripsData);
        }
      } catch (err) {
        console.warn('Error loading existing trips:', err);
        // Continue without blocking if this fails
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectSuggestion = (item: any) => {
    setDestination(item.display_name);
    setQuery(item.display_name);
    setSuggestions([]);
    setOpenSuggestions(false);
    setSelectedLocation({ lat: item.lat, lon: item.lon, display_name: item.display_name, address: item.address });
    
    if (item.address) {
      setCountry(item.address.country || null);
      const inferredCity = item.address.city || item.address.town || item.address.village || item.address.county || item.address.state || null;
      setCity(inferredCity);
    }
  };

  const openMap = () => {
    if (!selectedLocation) {
      Alert.alert(t('addTrip.locationNotSelected'), t('addTrip.locationNotSelectedMessage'));
      return;
    }
    setShowMap(true);
  };

  // save trip to backend, then navigate to load-trip screen
  const handleSaveTrip = async () => {
    if (saving) return;
    if (!startDate || !endDate) {
      Alert.alert(t('addTrip.selectDatesAlert'), t('addTrip.selectDatesMessage'));
      return;
    }
    if (!destination || destination.trim().length === 0) {
      Alert.alert(t('addTrip.emptyDestination'), t('addTrip.emptyDestinationMessage'));
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        destination: (city && country) ? `${city}, ${country}` : destination.trim(),
        start_date: formatISODate(startDate),
        end_date: formatISODate(endDate),
        budget: null,
        notes: null,
      };

      if (selectedLocation) {
        payload.lat = selectedLocation.lat;
        payload.lon = selectedLocation.lon;
      }

      // Navegar a load-trip y pasar el payload como query param (url-encoded JSON)
      const qs = encodeURIComponent(JSON.stringify(payload));
      router.push(`/(trips)/load-trip?payload=${qs}`);

    } catch (err: any) {
      console.error('Error preparando payload:', err);
      const message = (err && err.message) || t('addTrip.saveError');
      Alert.alert(t('common.error'), message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SecondaryLayout title={t('addTrip.selectDestination')}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* BARRA DE BÚSQUEDA (Nominatim) */}
      <View style={[styles.destinationInput, { marginBottom: openSuggestions ? 0 : 20 }]}>
        <TextInput
          style={[{ flex:1, borderWidth:0, outline:"none", color: destination ? AppColors.text : AppColors.textMuted}]}
          placeholder={t('addTrip.searchPlaceholder')}
          value={query}
          onChangeText={onChangeQuery}
          onFocus={() => { if (suggestions.length > 0) setOpenSuggestions(true); }}
        />
        {loadingSuggestions ? <ActivityIndicator /> : null}
      </View>

      {openSuggestions && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.place_id?.toString() || item.osm_id?.toString() || item.lat + item.lon}
                style={styles.item}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Text>{item.display_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!showMap && selectedLocation && (
        <TouchableOpacity style={styles.mapButton} onPress={openMap}>
          <Text style={styles.mapButtonText}>{t('addTrip.viewMap')}</Text>
        </TouchableOpacity>
      )}

      {showMap && selectedLocation && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: parseFloat(selectedLocation.lat),
              longitude: parseFloat(selectedLocation.lon),
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker
              coordinate={{
                latitude: parseFloat(selectedLocation.lat),
                longitude: parseFloat(selectedLocation.lon),
              }}
              title={selectedLocation.display_name}
            />
          </MapView>
          <TouchableOpacity style={styles.closeMapBtn} onPress={() => setShowMap(false)}>
            <Text style={styles.closeMapBtnText}>{t('addTrip.closeMap')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.header}>{t('addTrip.selectDates')}</Text>

      <View style={styles.calendarHeader}>
        <Text style={styles.monthYear}>{monthNames[currentMonth]} {currentYear}</Text>
        <View style={styles.arrows}>
          <TouchableOpacity onPress={handlePrevMonth}>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextMonth}>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendar}>
        <View style={styles.weekDays}>
          {weekDays.map((day, index) => (
            <Text key={index} style={styles.weekDay}>{day}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {Array(firstDayOfMonth).fill(null).map((_, index) => (
            <View key={`empty-${index}`} style={styles.emptyDay} />
          ))}

          {days.map((day) => {
            const past = isPastDate(day.date);
            const booked = isDateBooked(day.date);

            return (
                <TouchableOpacity
                    key={day.date}
                    style={[
                      styles.day,
                      isDateInRange(day.date) && styles.selectedDay,
                      booked && styles.bookedDay,
                    ]}
                    disabled={past || booked}
                    onPress={() => handleDateSelect(day.date)}
                >
                  <Text
                      style={[
                        styles.dayText,
                        past && styles.pastDayText,
                        booked && styles.bookedDayText,
                        isDateInRange(day.date) && styles.selectedDayText
                      ]}
                  >
                    {day.date}
                  </Text>
                </TouchableOpacity>
            );
          })}

        </View>
      </View>

      {startDate && endDate && (
        <Text style={styles.dateRange}>
          {t('addTrip.tripPlanMessage', {
            destination: city && country ? `${city}, ${country}` : (destination ?? ''),
            startDate: `${startDate.getDate()}/${startDate.getMonth() + 1}/${startDate.getFullYear()}`,
            endDate: `${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}`,
          })}
        </Text>
      )}

      <TouchableOpacity
        style={styles.createTripButton}
        onPress={handleSaveTrip}
        disabled={saving}
      >
        <Text style={styles.createTripButtonText}>{t('addTrip.createTrip')}</Text>
      </TouchableOpacity>
      </ScrollView>
    </SecondaryLayout>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    backgroundColor: AppColors.backgroundPrimary,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  mapButton: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: AppColors.backgroundPrimary,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mapButtonText: { color: AppColors.text, fontWeight: '600' },
  mapContainer: {
    marginTop: 12,
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  map: { flex: 1 },
  closeMapBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: AppColors.overlay,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeMapBtnText: { color: AppColors.white },
  header: {
    fontSize: 16,
    marginBottom: 10,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  destinationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 25,
    backgroundColor: AppColors.backgroundTertiary,
  },
  destinationText: {
    fontSize: 16,
    color: AppColors.text,
  },
  closeIcon: {
    fontSize: 24,
    color: AppColors.textSecondary,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  arrows: {
    flexDirection: 'row',
    gap: 20,
  },
  arrow: {
    fontSize: 20,
    color: AppColors.primary,
  },
  calendar: {
    marginTop: 10,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDay: {
    color: AppColors.textMutedDark,
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDay: {
    width: '14.28%',
    height: 40,
  },
  dayText: {
    fontSize: 16,
    color: AppColors.text,
  },
  selectedDay: {
    backgroundColor: AppColors.primaryLight,
  },
  selectedDayText: {
    color: AppColors.primary,
  },
  pastDayText: {
    color: AppColors.textDisabled,
  },
  bookedDay: {
    backgroundColor: AppColors.backgroundTertiary,
    opacity: 0.6,
  },
  bookedDayText: {
    color: AppColors.textSecondary,
  },
  dateRange: {
    textAlign: 'center',
    marginTop: 20,
    color: AppColors.textSecondary,
  },
  createTripButton: {
    backgroundColor: AppColors.primary,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  createTripButtonText: {
    color: AppColors.white,
    fontSize: 16,
  },

  dropdown: { left: 0, right: 0,
    backgroundColor: AppColors.backgroundPrimary,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 20,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10 },

  item: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: AppColors.backgroundPrimary },
  itemHover: { backgroundColor: AppColors.backgroundHover },
  itemSelected: { backgroundColor: AppColors.backgroundHover },
});