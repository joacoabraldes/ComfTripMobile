import SecondaryLayout from '@/components/layouts/SecondaryLayout';
import FlightSearchCard from '@/components/trip/FlightSearchCard';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/i18n';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
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
  const [showDropdown, setShowDropdown] = useState(false);

  // Opciones de ciudades predefinidas (igual que AddTrip.js)
  const cityOptions = [
    {
      value: "barcelona_spain",
      label: "Barcelona, España",
      city: "Barcelona",
      country: "España",
      countryCode: "ES",
      lat: "41.3851",
      lon: "2.1734",
    },
    {
      value: "buenosaires_argentina",
      label: "Buenos Aires, Argentina",
      city: "Buenos Aires",
      country: "Argentina",
      countryCode: "AR",
      lat: "-34.6037",
      lon: "-58.3816",
    },
    {
      value: "rome_italy",
      label: "Roma, Italia",
      city: "Rome",
      country: "Italia",
      countryCode: "IT",
      lat: "41.9028",
      lon: "12.4964",
    },
    {
      value: "berlin_germany",
      label: "Berlín, Alemania",
      city: "Berlin",
      country: "Alemania",
      countryCode: "DE",
      lat: "52.5200",
      lon: "13.4050",
    },
    {
      value: "paris_france",
      label: "París, Francia",
      city: "Paris",
      country: "Francia",
      countryCode: "FR",
      lat: "48.8566",
      lon: "2.3522",
    },
  ];

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

  // Handle city selection from dropdown
  const handleSelectCity = (option: typeof cityOptions[0]) => {
    setDestination(option.label);
    setCity(option.city);
    setCountry(option.country);
    setShowDropdown(false);
  };

  const openMap = () => {
    if (!destination) {
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

      // Get coordinates from the selected city option
      const selectedOption = cityOptions.find(opt => opt.label === destination);
      if (selectedOption) {
        payload.lat = selectedOption.lat;
        payload.lon = selectedOption.lon;
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

      {/* DROPDOWN DE CIUDADES PREDEFINIDAS */}
      <View style={styles.dropdownContainer}>
        <TouchableOpacity 
          style={styles.destinationInput}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={[
            styles.destinationText,
            !destination && styles.placeholderText
          ]}>
            {destination || t('addTrip.searchPlaceholder')}
          </Text>
          <Text style={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showDropdown && (
          <View style={styles.dropdown}>
            <ScrollView nestedScrollEnabled={true}>
              {cityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.item,
                    destination === option.label && styles.itemSelected
                  ]}
                  onPress={() => handleSelectCity(option)}
                >
                  <Text style={[
                    styles.itemText,
                    destination === option.label && styles.itemSelectedText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {!showMap && destination && (
        <TouchableOpacity style={styles.mapButton} onPress={openMap}>
          <Text style={styles.mapButtonText}>{t('addTrip.viewMap')}</Text>
        </TouchableOpacity>
      )}

      {showMap && destination && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: parseFloat(cityOptions.find(opt => opt.label === destination)?.lat || '0'),
              longitude: parseFloat(cityOptions.find(opt => opt.label === destination)?.lon || '0'),
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {destination && cityOptions.find(opt => opt.label === destination) && (
              <Marker
                coordinate={{
                  latitude: parseFloat(cityOptions.find(opt => opt.label === destination)?.lat || '0'),
                  longitude: parseFloat(cityOptions.find(opt => opt.label === destination)?.lon || '0'),
                }}
                title={destination}
              />
            )}
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
    marginBottom: 20,
  },
  destinationText: {
    fontSize: 16,
    color: AppColors.text,
    flex: 1,
  },
  placeholderText: {
    color: AppColors.textMuted,
  },
  dropdownArrow: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginLeft: 10,
  },
  dropdownContainer: {
    zIndex: 1000,
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

  dropdown: { 
    left: 0, 
    right: 0,
    backgroundColor: AppColors.backgroundPrimary,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 20,
    maxHeight: 250,
    zIndex: 1001,
    elevation: 10,
  },

  item: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 12, 
    backgroundColor: AppColors.backgroundPrimary,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  itemText: {
    fontSize: 15,
    color: AppColors.text,
  },
  itemHover: { 
    backgroundColor: AppColors.backgroundTertiary,
  },
  itemSelected: { 
    backgroundColor: AppColors.primaryLight,
  },
  itemSelectedText: {
    color: AppColors.primary,
    fontWeight: '600',
  },
});