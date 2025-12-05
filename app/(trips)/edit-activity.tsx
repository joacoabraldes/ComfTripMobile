import React, { useState, useEffect, useMemo } from 'react';
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
import { apiGet, apiPut, apiDelete } from '@/helpers/api';
import TimePicker from '@/components/forms/TimePicker';
import LocationSelector from '@/components/forms/LocationSelector';
import PrimaryButton from '@/components/buttons/PrimaryButton';
import TextButton from '@/components/buttons/TextButton';
import { useAppColors } from '@/hooks/useAppColors';  

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
}

export default function EditActivity() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const tripId = params.tripId ? Number(params.tripId) : NaN;
  const placeId = params.placeId ? Number(params.placeId) : NaN;

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [place, setPlace] = useState<any>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [date, setDate] = useState<string>('');
  const [startHour, setStartHour] = useState<string>('');
  const [endHour, setEndHour] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const AppColors = useAppColors();
  const styles = getStyles(AppColors);

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
      (trip.places || [])
        .filter((p: any) => p.id !== placeId)
        .map((p: any) => (p.date ? p.date.split('T')[0] : ''))
    );
  }, [trip?.places, placeId]);

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
      .filter((p: any) => p.id !== placeId && p.date && p.date.split('T')[0] === date)
      .map((p: any) => ({
        start: p.start_hour || '',
        end: p.end_hour || null,
      }));
  }, [trip?.places, date, placeId]);

  const nextOccupiedStart = occupiedSlots
    .map((s: { start: string; end: string | null }) => s.start)
    .filter((t: string) => t > startHour)
    .sort()[0];

  // Load trip and place
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!Number.isFinite(tripId) || tripId <= 0 || !Number.isFinite(placeId) || placeId <= 0) {
        setError(t('editActivity.placeNotFound'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const tripRes = await apiGet(`/trips/${tripId}`);
        const locs = await apiGet('/locations');

        if (!mounted) return;
        const tripData = tripRes?.data || tripRes;
        setTrip(tripData);
        setLocations(Array.isArray(locs) ? locs : (Array.isArray(locs?.data) ? locs.data : []));

        const p = tripData.places?.find((pl: any) => Number(pl.id) === Number(placeId));
        if (!p) {
          setError(t('editActivity.placeNotFound'));
        } else {
          setPlace(p);
          const dateStr = p.date ? p.date.split('T')[0] : '';
          setDate(dateStr);
          // Normalize hours to have 00 or 30 minutes
          const normalizeTime = (time: string) => {
            if (!time) return '';
            const parts = time.split(':');
            if (parts.length < 2) return time;
            const h = parts[0];
            const m = parseInt(parts[1] || '0', 10);
            return `${h}:${m < 30 ? '00' : '30'}`;
          };
          setStartHour(normalizeTime(p.start_hour || ''));
          setEndHour(normalizeTime(p.end_hour || ''));
          setNotes(p.notes || '');
          setSelectedLocation(p.fk_location || p.location?.id || null);

          if (tripData.start_date) {
            setStartDate(normalizeDate(tripData.start_date));
          }
          if (tripData.end_date) {
            setEndDate(normalizeDate(tripData.end_date));
          }

          if (p.date) {
            const dateObj = normalizeDate(p.date);
            if (dateObj) {
              setCurrentYear(dateObj.getFullYear());
              setCurrentMonth(dateObj.getMonth());
            }
          }
        }
      } catch (err: any) {
        console.error('Error loading trip:', err);
        setError(err?.message || t('editActivity.loadTripError'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tripId, placeId, t]);

  // Only reset hours if date actually changed (not on initial load)
  useEffect(() => {
    if (date && place?.date) {
      const currentDateStr = place.date.split('T')[0];
      if (date !== currentDateStr) {
        // Date changed, reset hours
        setStartHour('');
        setEndHour('');
      }
    }
  }, [date]);

  useEffect(() => {
    if (startHour && !startHour.split(':')[1]) {
      setEndHour('');
    } else if (startHour && endHour && startHour.split(':')[0] === endHour.split(':')[0] && startHour.split(':')[1] > endHour.split(':')[1]) {
      setEndHour(`${endHour.split(':')[0]}:`);
    }
  }, [startHour, endHour]);

  const handleSave = async () => {
    if (!date) {
      Alert.alert(t('editActivity.selectDate'));
      return;
    }
    if (!startHour || !endHour || !startHour.split(':')[1] || !endHour.split(':')[1]) {
      Alert.alert(t('editActivity.selectStartAndEndTime'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updatedPlaces = trip.places.map((p: any) =>
        Number(p.id) === Number(placeId)
          ? {
              ...p,
              fk_location: selectedLocation || p.fk_location || p.location?.id,
              date,
              start_hour: startHour,
              end_hour: endHour,
              notes,
            }
          : p
      );

      await apiPut(`/trips/${tripId}`, {
        destination: trip.destination,
        start_date: trip.start_date,
        end_date: trip.end_date,
        budget: trip.budget,
        notes: trip.notes,
        places: updatedPlaces.map((p: any) => ({
          fk_location: p.fk_location ?? p.location?.id,
          date: p.date,
          start_hour: p.start_hour,
          end_hour: p.end_hour,
          notes: p.notes,
        })),
      });

      router.back();
    } catch (err: any) {
      console.error('Error updating place:', err);
      setError(err?.message || t('editActivity.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('editActivity.delete'),
      t('editActivity.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            if (deleting) return;
            setDeleting(true);
            try {
              await apiDelete(`/trips/${tripId}/places/${placeId}`);
              router.back();
            } catch (err: any) {
              console.error('Error deleting place:', err);
              Alert.alert(t('common.error'), err?.message || t('editActivity.deleteError'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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
      <SecondaryLayout title={t('editActivity.title')}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
          <Text style={{ marginTop: 16 }}>{t('editActivity.loading')}</Text>
        </View>
      </SecondaryLayout>
    );
  }

  if (error || !place) {
    return (
      <SecondaryLayout title={t('editActivity.title')}>
        <View style={styles.center}>
          <Text style={{ color: AppColors.error, marginBottom: 8 }}>{error || t('editActivity.placeNotFound')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: AppColors.white }}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SecondaryLayout>
    );
  }

  const selectedLocationData = locations.find((l) => Number(l.id) === Number(selectedLocation));
  const currentLocationData = place.location || locations.find((l) => Number(l.id) === Number(place.fk_location || place.location?.id));

  return (
    <SecondaryLayout title={t('editActivity.title')}>
      <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      nestedScrollEnabled={true}>
        <Text style={styles.subtitle}>{trip?.destination || ''}</Text>
        {trip?.start_date && trip?.end_date && (
          <Text style={styles.dates}>
            {new Date(trip.start_date).toLocaleDateString()} — {new Date(trip.end_date).toLocaleDateString()}
          </Text>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>{t('editActivity.changeLocation')}</Text>
          <Text style={styles.currentLocation}>{currentLocationData?.titulo || t('editActivity.title')}</Text>
          <LocationSelector
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
            placeholder={t('addActivity.searchLocation')}
            noLocationsMessage={t('addActivity.noLocationsFound', { destination: trip?.destination || '' })}
            filteredLocations={filteredLocations}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('editActivity.date')}</Text>
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
                      onPress={() => setDate(isoDate)}
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
          <Text style={styles.label}>{t('editActivity.startTime')}</Text>
          <TimePicker
            value={startHour}
            onChange={setStartHour}
            occupiedSlots={occupiedSlots}
            disabled={!date}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('editActivity.endTime')}</Text>
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
          <Text style={styles.label}>{t('editActivity.notes')}</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('editActivity.notes')}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <PrimaryButton
          title={saving ? t('editActivity.saving') : t('editActivity.saveChanges')}
          onPress={handleSave}
          disabled={saving || !date || !startHour || !endHour}
          style={{ marginTop: 24 }}
        />

        <TextButton
          title={t('editActivity.delete')}
          onPress={handleDelete}
          textStyle={{ color: AppColors.error }}
          style={{ marginTop: 16, alignSelf: 'center' }}
        />
      </ScrollView>
    </SecondaryLayout>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
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
  currentLocation: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  arrow: {
    fontSize: 24,
    color: AppColors.text,
    fontWeight: '600',
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
