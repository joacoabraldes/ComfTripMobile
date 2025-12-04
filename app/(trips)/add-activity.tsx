import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SecondaryLayout from '@/components/layouts/SecondaryLayout';
import { useTranslation } from '@/i18n';
import { AppColors } from '@/constants/Colors';
import { apiGet, apiPost } from '@/helpers/api';
import TimePicker from '@/components/forms/TimePicker';
import LocationSelector from '@/components/forms/LocationSelector';
import PrimaryButton from '@/components/buttons/PrimaryButton';

interface CalendarDay {
  date: number;
  selected: boolean;
}

interface Location {
  id: number;
  titulo?: string;
  city?: string;
  ciudad?: string;
  localidad?: string;
  locality?: string;
  admin_area?: string;
  region?: string;
  province?: string;
  state?: string;
  town?: string;
  municipio?: string;
  country?: string;
  address?: string;
  descripcion?: string;
  latitude?: number | string;
  longitude?: number | string;
  latitud?: number | string;
  longitud?: number | string;
}

export default function AddActivity() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const tripId = params.tripId ? Number(params.tripId) : NaN;

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [date, setDate] = useState<string>('');
  const [startHour, setStartHour] = useState<string>('');
  const [endHour, setEndHour] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllLocations, setShowAllLocations] = useState(false);

  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Helper functions
  const getTripCity = (dest: string) => {
    if (!dest) return '';
    return dest.toString().split(',')[0].toLowerCase().trim();
  };

  const normalizeDate = (d: string) => {
    if (!d) return null;
    const date = d.split('T')[0].split('-');
    const yy = Number(date[0]);
    const mm = Number(date[1]) - 1;
    const dd = Number(date[2]);
    return new Date(yy, mm, dd);
  };

  // Filter locations by trip city
  const filteredLocations = useMemo(() => {
    if (!trip || !Array.isArray(locations) || locations.length === 0) return [];
    const tripCity = getTripCity(trip.destination);
    if (!tripCity) return [];

    const cityFields = [
      'city',
      'ciudad',
      'localidad',
      'locality',
      'admin_area',
      'region',
      'province',
      'state',
      'town',
      'municipio',
    ];

    return locations.filter((l) => {
      for (const f of cityFields) {
        const val = (l as any)[f];
        if (val && val.toString().toLowerCase().includes(tripCity)) return true;
      }
      if ((l.country || '').toString().toLowerCase().includes(trip.destination?.toString().split(',')[1]?.trim()?.toLowerCase() ?? '')) {
        return true;
      }
      if (l.address && l.address.toString().toLowerCase().includes(tripCity)) return true;
      if (l.descripcion && l.descripcion.toString().toLowerCase().includes(tripCity)) return true;
      if ((!l.city && !l.localidad && !l.region && !l.province) && l.titulo && l.titulo.toString().toLowerCase().includes(tripCity)) {
        return true;
      }
      return false;
    });
  }, [trip, locations]);


  // Calendar functions
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

  const { days, firstDayOfMonth } = generateCalendarDays();

  const bookedDates = useMemo(() => {
    if (!trip?.places) return new Set<string>();
    return new Set(
      (trip.places || []).map((p: any) => (p.date ? p.date.split('T')[0] : ''))
    );
  }, [trip?.places]);

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    const isoDate = selectedDate.toISOString().split('T')[0];
    setDate(isoDate);
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((year) => year - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((year) => year + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const occupiedSlots = useMemo(() => {
    if (!trip?.places || !date) return [];
    return trip.places
      .filter((p: any) => p.date && p.date.split('T')[0] === date)
      .map((p: any) => ({
        start: p.start_hour || '',
        end: p.end_hour || null,
      }));
  }, [trip?.places, date]);

  const nextOccupiedStart = occupiedSlots
    .map((s: { start: string; end: string | null }) => s.start)
    .filter((t: string) => t > startHour)
    .sort()[0];

  // Load trip and locations
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!Number.isFinite(tripId) || tripId <= 0) {
        setError(t('addActivity.invalidTripId'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const tripRes = await apiGet(`/trips/${tripId}`);
        const locs = await apiGet('/locations');

        if (!mounted) return;
        setTrip(tripRes?.data || tripRes);
        setLocations(Array.isArray(locs) ? locs : (Array.isArray(locs?.data) ? locs.data : []));

        if (tripRes?.data || tripRes) {
          const tripData = tripRes?.data || tripRes;
          setStartDate(normalizeDate(tripData.start_date));
          setEndDate(normalizeDate(tripData.end_date));

          const start = tripData.start_date ? new Date(tripData.start_date) : new Date();
          setCurrentYear(start.getFullYear());
          setCurrentMonth(start.getMonth());
        }
      } catch (err: any) {
        console.error('Error loading trip:', err);
        setError(err?.message || t('addActivity.loading'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tripId, t]);

  useEffect(() => {
    setStartHour('');
    setEndHour('');
  }, [date]);

  useEffect(() => {
    if (startHour && !startHour.split(':')[1]) {
      setEndHour('');
    } else if (startHour && endHour && startHour.split(':')[0] === endHour.split(':')[0] && startHour.split(':')[1] > endHour.split(':')[1]) {
      setEndHour(`${endHour.split(':')[0]}:`);
    }
  }, [startHour, endHour]);

  const handleAddPlace = async () => {
    if (!selectedLocation) {
      Alert.alert(t('addActivity.selectLocation'));
      return;
    }
    if (!date) {
      Alert.alert(t('addActivity.selectDate'));
      return;
    }
    if (!startHour || !startHour.split(':')[1]) {
      Alert.alert(t('addActivity.selectStartTime'));
      return;
    }
    if (!endHour || !endHour.split(':')[1]) {
      Alert.alert(t('addActivity.selectEndTime'));
      return;
    }

    setAdding(true);
    setError(null);
    try {
      const payload = {
        places: [
          {
            fk_location: Number(selectedLocation),
            date,
            start_hour: startHour || null,
            end_hour: endHour || null,
            notes: notes || null,
          },
        ],
      };
      await apiPost(`/trips/${tripId}/places`, payload);
      router.back();
    } catch (err: any) {
      console.error('Add place error:', err);
      setError(err?.message || t('addActivity.addPlaceError'));
    } finally {
      setAdding(false);
    }
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

  if (loading) {
    return (
      <SecondaryLayout title={t('addActivity.title')}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
          <Text style={{ marginTop: 16 }}>{t('addActivity.loading')}</Text>
        </View>
      </SecondaryLayout>
    );
  }

  if (error && !trip) {
    return (
      <SecondaryLayout title={t('addActivity.title')}>
        <View style={styles.center}>
          <Text style={{ color: AppColors.error, marginBottom: 8 }}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: AppColors.white }}>{t('addActivity.backToTrips')}</Text>
          </TouchableOpacity>
        </View>
      </SecondaryLayout>
    );
  }

  return (
    <SecondaryLayout title={t('addActivity.title')}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.subtitle}>{trip?.destination || ''}</Text>
        {trip?.start_date && trip?.end_date && (
          <Text style={styles.dates}>
            {new Date(trip.start_date).toLocaleDateString()} — {new Date(trip.end_date).toLocaleDateString()}
          </Text>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>{t('addActivity.location')}</Text>
          <LocationSelector
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
            placeholder={filteredLocations.length ? t('addActivity.searchLocation') : t('addActivity.noLocationsFound', { destination: trip?.destination || '' })}
            noLocationsMessage={filteredLocations.length === 0 && locations.length > 0 && !showAllLocations
              ? t('addActivity.noMatchingLocations')
              : t('addActivity.noLocationsFound', { destination: trip?.destination || '' })}
            showAllLocations={showAllLocations}
            onShowAllLocations={() => setShowAllLocations(true)}
            filteredLocations={filteredLocations}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('addActivity.date')}</Text>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.monthYear}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
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
                  <Text key={index} style={styles.weekDay}>
                    {day}
                  </Text>
                ))}
              </View>
              <View style={styles.daysGrid}>
                {Array(firstDayOfMonth)
                  .fill(null)
                  .map((_, index) => (
                    <View key={`empty-${index}`} style={styles.emptyDay} />
                  ))}
                {days.map((day) => {
                  const currentDate = new Date(currentYear, currentMonth, day.date);
                  const isoDate = currentDate.toISOString().split('T')[0];
                  const isPast = !!(startDate && currentDate < startDate);
                  const isAfter = !!(endDate && currentDate > endDate);
                  const isBooked = bookedDates.has(isoDate);
                  const isSelected = date === isoDate;

                  return (
                    <TouchableOpacity
                      key={day.date}
                      style={[
                        styles.day,
                        isSelected && styles.selectedDay,
                        (isPast || isAfter) && styles.disabledDay,
                        isBooked && styles.bookedDay,
                      ]}
                      disabled={isPast || isAfter}
                      onPress={() => handleDateSelect(day.date)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.selectedDayText,
                          (isPast || isAfter) && styles.disabledDayText,
                          isBooked && styles.bookedDayText,
                        ]}
                      >
                        {day.date}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('addActivity.startTime')}</Text>
          <TimePicker
            value={startHour}
            onChange={setStartHour}
            occupiedSlots={occupiedSlots}
            disabled={!date}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('addActivity.endTime')}</Text>
          <TimePicker
            value={endHour}
            onChange={setEndHour}
            occupiedSlots={occupiedSlots}
            minTime={startHour}
            maxTime={nextOccupiedStart || undefined}
            disabled={!startHour || !startHour.split(':')[1]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('addActivity.notes')}</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('addActivity.notes')}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <PrimaryButton
          title={adding ? t('addActivity.adding') : t('addActivity.addToItinerary')}
          onPress={handleAddPlace}
          disabled={adding || !selectedLocation || !date || !startHour || !endHour}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SecondaryLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundPrimary,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 4,
  },
  dates: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 12,
  },
  calendarContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    backgroundColor: AppColors.backgroundPrimary,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 24,
    color: AppColors.text,
    fontWeight: '600',
  },
  calendar: {
    marginTop: 8,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDay: {
    fontSize: 12,
    color: AppColors.textMutedDark,
    fontWeight: '600',
    width: '14.28%',
    textAlign: 'center',
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
  selectedDay: {
    backgroundColor: AppColors.primary,
    borderRadius: 8,
  },
  disabledDay: {
    opacity: 0.3,
  },
  bookedDay: {
    backgroundColor: AppColors.primaryLight,
  },
  emptyDay: {
    width: '14.28%',
    height: 40,
  },
  dayText: {
    fontSize: 16,
    color: AppColors.text,
  },
  selectedDayText: {
    color: AppColors.white,
    fontWeight: '700',
  },
  disabledDayText: {
    color: AppColors.textDisabled,
  },
  bookedDayText: {
    color: AppColors.primary,
  },
  notesInput: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: AppColors.backgroundTertiary,
    fontSize: 16,
    color: AppColors.text,
    minHeight: 80,
  },
  errorText: {
    color: AppColors.error,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
});

