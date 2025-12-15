import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import SecondaryLayout from '@/components/layouts/SecondaryLayout';
import { useTranslation } from '@/i18n';
import { useAppColors } from '@/hooks/useAppColors';
import FlightSearchCard from '@/components/trip/FlightSearchCard';
import { useSnackbar } from '@/contexts/SnackbarContext';
interface CalendarDay {
  date: number;
  selected: boolean;
}

export default function AddTrip() {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const { showError, showWarning } = useSnackbar();
  const params = useLocalSearchParams<{ destination?: string }>();
  const [destination, setDestination] = useState<string | null>(params.destination || null);
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // búsqueda con Nominatim
  const [query, setQuery] = useState(params.destination || "");
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
  const [selectedFlight, setSelectedFlight] = useState<any | null>(null);
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

  // Get the maximum available end date when a start date is selected
  const getMaxAvailableEndDate = useCallback((start: Date): Date | null => {
    if (existingTrips.length === 0) return null;
    
    // Find the earliest trip that starts after the selected start date
    let earliestNextTripStart: Date | null = null;
    
    existingTrips.forEach((trip) => {
      if (trip.start_date) {
        const tripStart = new Date(trip.start_date);
        tripStart.setHours(0, 0, 0, 0);
        
        if (tripStart > start) {
          if (!earliestNextTripStart || tripStart < earliestNextTripStart) {
            earliestNextTripStart = tripStart;
          }
        }
      }
    });
    
    // If there's a next trip, return the day before it
    if (earliestNextTripStart) {
      const maxEnd = new Date(earliestNextTripStart);
      return maxEnd;
    }
    
    return null;
  }, [existingTrips]);

  const isDateBooked = (day: number) => {
    const currentDate = new Date(currentYear, currentMonth, day);
    const isoDate = currentDate.toISOString().split('T')[0];
    return bookedDates.has(isoDate);
  };

  // Check if a date is disabled due to startDate selection
  const isDateDisabledByStartDate = (day: number): boolean => {
    if (!startDate || endDate) return false;
    
    const currentDate = new Date(currentYear, currentMonth, day);
    currentDate.setHours(0, 0, 0, 0);
    
    // If the date is before startDate, it's not disabled by this logic
    if (currentDate < startDate) return false;
    
    const maxEndDate = getMaxAvailableEndDate(startDate);
    if (maxEndDate && currentDate > maxEndDate) {
      return true;
    }
    
    return false;
  };

  const { days, firstDayOfMonth } = generateCalendarDays();

  // Check if there are any booked dates between startDate and endDate
  const hasBookedDatesInRange = useCallback((start: Date, end: Date): boolean => {
    const current = new Date(start);
    while (current <= end) {
      const isoDate = current.toISOString().split('T')[0];
      if (bookedDates.has(isoDate)) {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    return false;
  }, [bookedDates]);

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    selectedDate.setHours(0, 0, 0, 0);

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      const normalizedStart = new Date(selectedDate);
      normalizedStart.setHours(0, 0, 0, 0);
      setStartDate(normalizedStart);
      setEndDate(null);
    } else {
      // Complete range selection
      let newStart = new Date(startDate);
      newStart.setHours(0, 0, 0, 0);
      let newEnd = new Date(selectedDate);
      newEnd.setHours(0, 0, 0, 0);

      if (selectedDate < startDate) {
        newStart = new Date(selectedDate);
        newStart.setHours(0, 0, 0, 0);
        newEnd = new Date(startDate);
        newEnd.setHours(0, 0, 0, 0);
      }

      // Validate that the range doesn't contain booked dates
      if (hasBookedDatesInRange(newStart, newEnd)) {
        showWarning(t('addTrip.bookedDatesInRange'));
        return;
      }

      setStartDate(newStart);
      setEndDate(newEnd);
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
    // Don't reset dates - allow selecting across months
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((year) => year + 1);
        return 0;
      }
      return prev + 1;
    });
    // Don't reset dates - allow selecting across months
  };

  // Navigate to the month of startDate when it's first selected (only once)
  useEffect(() => {
    if (startDate && !endDate) {
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      // Only navigate if we're not already viewing that month
      if (currentMonth !== startMonth || currentYear !== startYear) {
        setCurrentMonth(startMonth);
        setCurrentYear(startYear);
      }
    }
  }, [startDate]); // Only depend on startDate to avoid loops

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

  // Format location name to show only city/province and country
  const formatLocationName = (item: any): string => {
    const addr = item.address || {};
    const parts: string[] = [];
    
    // Priority: city > town > village > municipality
    const city = addr.city || addr.town || addr.village || addr.municipality;
    // Province/state
    const province = addr.state || addr.region || addr.province;
    // Country
    const country = addr.country;
    
    // Add city if available
    if (city) {
      parts.push(city);
    }
    
    // Add province if available and different from city
    if (province && province !== city) {
      parts.push(province);
    }
    
    // Add country if available
    if (country) {
      parts.push(country);
    }
    
    // If we have at least country, return formatted string
    if (parts.length > 0) {
      return parts.join(', ');
    }
    
    // Fallback: use display_name but try to extract city and country
    const displayParts = item.display_name?.split(',') || [];
    if (displayParts.length >= 2) {
      // Take first part (usually city) and last part (usually country)
      return `${displayParts[0].trim()}, ${displayParts[displayParts.length - 1].trim()}`;
    }
    
    return item.display_name || '';
  };

  // Filter suggestions to prioritize cities, provinces, and countries
  // Also validates that results match the search query
  const filterSuggestions = (suggestions: any[], searchText: string): any[] => {
    if (!searchText || searchText.length < 3) return [];
    
    const searchLower = searchText.toLowerCase().trim();
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 1); // Ignore single character words
    
    // Prioritize by type: city, town, village, municipality, state, country
    const priorityTypes = ['city', 'town', 'village', 'municipality', 'administrative', 'state', 'country'];
    
    return suggestions
      .filter(item => {
        const type = (item.type || item.class || '').toLowerCase();
        const addr = item.address || {};
        
        // Must be a city, town, village, municipality, state, or country
        const isRelevantType = priorityTypes.some(pt => type.includes(pt));
        if (!isRelevantType) return false;
        
        // Get relevant names
        const city = addr.city || addr.town || addr.village || addr.municipality;
        const state = addr.state || addr.region || addr.province;
        const country = addr.country;
        
        // For cities/towns/villages, must have a city name
        if (type.includes('city') || type.includes('town') || type.includes('village') || type.includes('municipality')) {
          if (!city) return false;
        }
        
        // For states, must have state name
        if (type.includes('administrative') || type.includes('state')) {
          if (!state) return false;
        }
        
        // For countries, must have country name
        if (type.includes('country')) {
          if (!country) return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        const typeA = (a.type || a.class || '').toLowerCase();
        const typeB = (b.type || b.class || '').toLowerCase();
        
        // Prioritize exact matches in city/state/country name
        const addrA = a.address || {};
        const addrB = b.address || {};
        const nameA = (addrA.city || addrA.town || addrA.village || addrA.state || addrA.country || '').toLowerCase();
        const nameB = (addrB.city || addrB.town || addrB.village || addrB.state || addrB.country || '').toLowerCase();
        
        const exactMatchA = nameA === searchLower;
        const exactMatchB = nameB === searchLower;
        if (exactMatchA && !exactMatchB) return -1;
        if (!exactMatchA && exactMatchB) return 1;
        
        // Check if name starts with search
        const startsWithA = nameA.startsWith(searchLower);
        const startsWithB = nameB.startsWith(searchLower);
        if (startsWithA && !startsWithB) return -1;
        if (!startsWithA && startsWithB) return 1;
        
        // Check if name contains search
        const containsA = nameA.includes(searchLower);
        const containsB = nameB.includes(searchLower);
        if (containsA && !containsB) return -1;
        if (!containsA && containsB) return 1;
        
        // Then prioritize by type
        const priorityA = priorityTypes.findIndex(pt => typeA.includes(pt));
        const priorityB = priorityTypes.findIndex(pt => typeB.includes(pt));
        
        if (priorityA !== -1 && priorityB !== -1) {
          return priorityA - priorityB;
        }
        if (priorityA !== -1) return -1;
        if (priorityB !== -1) return 1;
        return 0;
      })
      .slice(0, 5); // Limit to 5 results
  };

  // ==== Nominatim: funciones ====
  const fetchSuggestions = useCallback(async (text: string) => {
    const searchText = text.trim();
    
    // Require at least 3 characters to search
    if (!searchText || searchText.length < 3) {
      setSuggestions([]);
      setOpenSuggestions(false);
      setLoadingSuggestions(false);
      return;
    }
    
    setLoadingSuggestions(true);
    try {
      // Request more results to have better options after filtering
      // Remove featuretype restriction to get more results, we'll filter client-side
      const url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchText)}&format=json&addressdetails=1&limit=10&accept-language=es&dedupe=1`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout
      
      const res = await fetch(url, {
        headers: {
          'Referer': 'ConfTrip://',
          'User-Agent': 'ComfTripMobile/1.0',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(t('addTrip.searchError'));
      const data = await res.json();
      
      // Filter results (less strict now)
      const filtered = filterSuggestions(Array.isArray(data) ? data : [], searchText);
      setSuggestions(filtered);
      setOpenSuggestions(filtered.length > 0);
    } catch (e: any) {
      // Ignore abort errors (timeout)
      if (e.name !== 'AbortError') {
        console.warn('Nominatim error', e);
      }
      setSuggestions([]);
      setOpenSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Debounce: 500ms to balance responsiveness and API calls
  const onChangeQuery = (text: string) => {
    setQuery(text);
    setSelectedLocation(null);
    
    // Clear any pending search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    
    // Clear suggestions immediately if text is too short
    const trimmedText = text.trim();
    if (!trimmedText || trimmedText.length < 3) {
      setSuggestions([]);
      setOpenSuggestions(false);
      setLoadingSuggestions(false);
      return;
    }
    
    // Only search after user stops typing for 500ms
    // This balances responsiveness with reducing API calls
    debounceRef.current = setTimeout(() => {
      if (trimmedText.length >= 3) {
        fetchSuggestions(trimmedText);
      }
      debounceRef.current = null;
    }, 500);
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
    const formattedName = formatLocationName(item);
    setDestination(formattedName);
    setQuery(formattedName);
    setSuggestions([]);
    setOpenSuggestions(false);
    setSelectedLocation({ lat: item.lat, lon: item.lon, display_name: formattedName, address: item.address });
    
    if (item.address) {
      setCountry(item.address.country || null);
      const inferredCity = item.address.city || item.address.town || item.address.village || item.address.municipality || null;
      setCity(inferredCity);
    }
  };

  const openMap = () => {
    if (!selectedLocation) {
      showError(t('addTrip.locationNotSelectedMessage'));
      return;
    }
    setShowMap(true);
  };

  // save trip to backend, then navigate to load-trip screen
  const handleSaveTrip = async () => {
    if (saving) return;
    if (!startDate || !endDate) {
      showError(t('addTrip.selectDatesMessage'));
      return;
    }
    if (!destination || destination.trim().length === 0) {
      showError(t('addTrip.emptyDestinationMessage'));
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

      // Include selected flight if available
      // Build canonical flight id exactly like the web version
      if (selectedFlight) {
        let canonicalFlightId = null;
        const datePart = startDate ? startDate.toISOString().split('T')[0] : '';
        
        const metaCode = selectedFlight?.meta?.flightCode;
        if (metaCode && String(metaCode).trim()) {
          // Clean the flight code: remove spaces and convert to uppercase (same as web version)
          const clean = String(metaCode)
            .replace(/\s+/g, '')
            .toUpperCase();
          canonicalFlightId = datePart ? `${clean}|${datePart}` : clean;
        } else if (selectedFlight?.id) {
          canonicalFlightId = selectedFlight.id;
        } else if (selectedFlight?.raw?.id) {
          canonicalFlightId = selectedFlight.raw.id;
        }
        
        if (canonicalFlightId) {
          payload.selectedFlight = {
            flight_id: canonicalFlightId,
            raw: selectedFlight.raw || null, // Include the full flight data
          };
          console.log('Including flight in payload:', payload.selectedFlight);
        } else {
          console.log('No valid flight ID found');
        }
      } else {
        console.log('No flight selected');
      }

      // Navegar a load-trip y pasar el payload como query param (url-encoded JSON)
      const qs = encodeURIComponent(JSON.stringify(payload));
      router.push(`/(trips)/load-trip?payload=${qs}`);

    } catch (err: any) {
      console.error('Error preparando payload:', err);
      const message = (err && err.message) || t('addTrip.saveError');
      showError(message);
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
                <Text>{formatLocationName(item)}</Text>
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
            const disabledByStartDate = isDateDisabledByStartDate(day.date);
            const isDisabled = past || booked || disabledByStartDate;

            return (
                <TouchableOpacity
                    key={day.date}
                    style={[
                      styles.day,
                      isDateInRange(day.date) && styles.selectedDay,
                      booked && styles.bookedDay,
                      disabledByStartDate && styles.disabledDay,
                    ]}
                    disabled={isDisabled}
                    onPress={() => handleDateSelect(day.date)}
                >
                  <Text
                      style={[
                        styles.dayText,
                        past && styles.pastDayText,
                        booked && styles.bookedDayText,
                        disabledByStartDate && styles.disabledDayText,
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

      {/* Flight Search Card */}
      <FlightSearchCard
        startDate={startDate}
        destinationCity={city || destination}
        onFlightSelected={(flight) => setSelectedFlight(flight)}
      />

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
    paddingBottom: 100,
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
  disabledDay: {
    backgroundColor: AppColors.backgroundTertiary,
    opacity: 0.4,
  },
  disabledDayText: {
    color: AppColors.textDisabled,
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