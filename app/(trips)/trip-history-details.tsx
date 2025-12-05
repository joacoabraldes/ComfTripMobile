import { apiGet } from '@/helpers/api';
import { formatDate, formatDateRange, formatTime } from '@/helpers/dateUtils';
import { getTripStatus, isTripCompleted, normalizeTripData } from '@/helpers/tripUtils';
import { mapPlacesToActivities } from '@/helpers/activityUtils';
import { Activity, Trip } from '@/types';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SecondaryLayout from '@/components/layouts/SecondaryLayout';
import TripSummary from '@/components/trip/TripSummary';
import ReviewSection from '@/components/trip/ReviewSection';
import ActivityCard from '@/components/trip/ActivityCard';
import { useTranslation } from '@/i18n';
import { ShadowColors, StateColors } from '@/constants/Colors';
import { useAppColors } from '@/hooks/useAppColors';

type Params = {
  id?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  flag_url?: string;
};

export default function TripHistoryDetails() {
  const router = useRouter();
  const params = useLocalSearchParams() as Params;
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);

  // Header uses params (as in trips.tsx navigation)
  const destination = params.destination ?? t('tripSummary.destination');
  const dateRangeStr = formatDateRange(params.start_date, params.end_date);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const tripId = params.id ? Number(params.id) : NaN;
  // Check if trip is completed based on dates (use params if trip not loaded yet)
  const isCompleted = trip
    ? isTripCompleted(trip)
    : params.start_date && params.end_date
    ? getTripStatus(params.start_date, params.end_date) === 'past'
    : false;

  // Fetch trip and derive activities from trip.places (web parity)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!Number.isFinite(tripId) || tripId <= 0) {
        setError(t('tripDetails.invalidId'));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet(`/trips/${tripId}`);
        const data = res?.data ?? res;

        // Store the full trip object
        const tripData = normalizeTripData(data, tripId, params, t);

        if (mounted) {
          setTrip(tripData);
        }

        // Map places to activities (without place object for trip-history-details)
        const places: any[] = tripData.places || [];
        const activities = mapPlacesToActivities(places, t, false);

        if (mounted) {
          setActivities(activities);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || t('tripDetails.failedToLoad'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [params.id, tripId]);

  // Refresh on focus
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      const checkUpdates = async () => {
        if (mounted && Number.isFinite(tripId) && tripId > 0) {
          try {
            const res = await apiGet(`/trips/${tripId}`);
            const data = res?.data ?? res;

            const tripData = normalizeTripData(data, tripId, params, t);

            if (mounted) {
              setTrip(tripData);
            }

            const places: any[] = tripData.places || [];
            const activities = mapPlacesToActivities(places, t, false);

            if (mounted) {
              setActivities(activities);
            }
          } catch (err: any) {
            console.error('Error refreshing trip:', err);
          }
        }
      };

      checkUpdates();

      return () => {
        mounted = false;
      };
    }, [tripId, params, t])
  );


  return (
    <SecondaryLayout title={destination}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{destination}</Text>
          <Text style={styles.subtitle}>{dateRangeStr}</Text>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <MaterialIcons name="check-circle" size={16} color={AppColors.success} />
              <Text style={styles.completedBadgeText}>{t('tripDetails.completedBadge')}</Text>
            </View>
          )}
        </View>

        {/* Trip Summary for completed trips */}
        {isCompleted && trip && (
          <TripSummary trip={trip} />
        )}

        {/* Review Section for completed trips */}
        {isCompleted && <ReviewSection tripId={tripId} trip={trip} />}

        <Text style={styles.sectionTitle}>{t('tripDetails.itinerary')}</Text>

        <View style={{ height: 8 }} />

        {loading ? (
          <View style={{ width: '100%', alignItems: 'center', paddingVertical: 20 }}>
            <ActivityIndicator size="small" color={AppColors.primary} />
            <Text style={{ marginTop: 8, color: AppColors.textSecondary }}>{t('tripDetails.loadingActivities')}</Text>
          </View>
        ) : error ? (
          <View style={{ width: '100%', alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: AppColors.error }}>{error}</Text>
          </View>
        ) : activities.length === 0 ? (
          <View style={{ width: '100%', alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: AppColors.textSecondary }}>{t('tripDetails.noActivities')}</Text>
          </View>
        ) : (
          activities.map((a) => (
            <ActivityCard
              key={a.key}
              activity={a}
              place={a.place}
              showEditButton={false}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SecondaryLayout>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, alignItems: 'center' },
  header: { width: '100%', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '800', color: AppColors.text },
  subtitle: { marginTop: 8, fontSize: 16, color: AppColors.textTertiary },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: StateColors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  completedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.success,
  },
  sectionTitle: { alignSelf: 'flex-start', fontSize: 22, fontWeight: '800', marginTop: 6, color: AppColors.text },
});