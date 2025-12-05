import { apiDelete, apiGet } from '@/helpers/api';
import { formatDate, formatDateRange, formatTime } from '@/helpers/dateUtils';
import { getTripStatus, isTripCompleted } from '@/helpers/tripUtils';
import { Activity, Trip } from '@/types';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SecondaryLayout from '@/components/layouts/SecondaryLayout';
import TripSummary from '@/components/trip/TripSummary';
import ShareTripButton from '@/components/trip/ShareTripButton';
import ActivityCard from '@/components/trip/ActivityCard';
import ContextMenu from '@/components/ui/ContextMenu';
import { useTranslation } from '@/i18n';
import { ShadowColors, StateColors } from '@/constants/Colors';
import { useAppColors } from '@/hooks/useAppColors';
import FloatingActionButton from '@/components/buttons/FloatingActionButton';

type Params = {
  id?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  flag_url?: string;
};

export default function TripDetails() {
  const router = useRouter();
  const params = useLocalSearchParams() as Params;
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const insets = useSafeAreaInsets();

  // Header uses params (as in trips.tsx navigation)
  const destination = params.destination ?? t('tripSummary.destination');
  const dateRangeStr = formatDateRange(params.start_date, params.end_date);

  const tripId = params.id ? Number(params.id) : NaN;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

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
        const tripData: Trip = {
          id: data.id || tripId,
          user_id: data.user_id || 0,
          destination: data.destination || params.destination || t('tripSummary.destination'),
          start_date: data.start_date || params.start_date || '',
          end_date: data.end_date || params.end_date || '',
          flag_url: data.flag_url || params.flag_url || null,
          notes: data.notes || null,
          budget: data.budget || null,
          created_at: data.created_at || null,
          places: Array.isArray(data?.places) ? data.places : (Array.isArray(data?.data?.places) ? data.data.places : []),
        };

        if (mounted) {
          setTrip(tripData);
        }

        // Expecting trip object with places array, like the web
        const places: any[] = tripData.places || [];

        const mapped: Activity[] = (places || []).map((p: any, idx: number) => {
          const loc = p.location || {};
          const title = loc.titulo ?? p.location?.titulo ?? t('addTrip.placeNumber', { number: p.fk_location ?? p.id ?? idx + 1 });

          // Build sortable timestamp from date + start_hour
          let ts = Number.NaN;
          if (p.date) {
            const base = (typeof p.date === 'string' && p.date.includes('T')) ? p.date : `${p.date}T00:00:00`;
            const start = p.start_hour ? `${base.split('T')[0]}T${p.start_hour}:00` : base;
            const d = new Date(start);
            ts = d.getTime();
          }

          const dateStr = `${formatDate(p.date)} ${formatTime(p.start_hour)}${p.end_hour ? ` - ${formatTime(p.end_hour)}` : ''}`.trim();

          return {
            key: String(p.id ?? idx),
            title,
            img: null, // Image will be extracted in ActivityCard from place object
            dateStr,
            sortTs: isNaN(ts) ? undefined : ts,
            place: p, // Store raw place object for image extraction
          };
        });

        const sorted = mapped.slice().sort((a, b) => {
          const aa = a.sortTs ?? Number.MAX_SAFE_INTEGER;
          const bb = b.sortTs ?? Number.MAX_SAFE_INTEGER;
          return aa - bb;
        });

        if (mounted) {
          setActivities(sorted);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || t('tripDetails.failedToLoad'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [params.id, tripId]);

  // Preserve local edit sync and refresh on focus (for deleted activities)
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      const checkUpdates = async () => {
        try {
          const raw = await AsyncStorage.getItem('updatedActivity');
          if (raw) {
            const parsed = JSON.parse(raw) as { key: string; newTitle?: string; imageUri?: string } | null;
            if (parsed && mounted) {
              setActivities((prev) =>
                prev.map((a) =>
                  a.key === parsed.key
                    ? {
                        ...a,
                        title: parsed.newTitle ?? a.title,
                        img: parsed.imageUri !== undefined ? parsed.imageUri : a.img ?? null,
                      }
                    : a
                )
              );
              await AsyncStorage.removeItem('updatedActivity');
            }
          }
        } catch {}

        // Refresh trip data to get updated activities (in case one was deleted)
        if (mounted && Number.isFinite(tripId) && tripId > 0) {
          try {
            const res = await apiGet(`/trips/${tripId}`);
            const data = res?.data ?? res;

            const tripData: Trip = {
              id: data.id || tripId,
              user_id: data.user_id || 0,
              destination: data.destination || params.destination || t('tripSummary.destination'),
              start_date: data.start_date || params.start_date || '',
              end_date: data.end_date || params.end_date || '',
              flag_url: data.flag_url || params.flag_url || null,
              notes: data.notes || null,
              budget: data.budget || null,
              created_at: data.created_at || null,
              places: Array.isArray(data?.places) ? data.places : (Array.isArray(data?.data?.places) ? data.data.places : []),
            };

            if (mounted) {
              setTrip(tripData);
            }

            const places: any[] = tripData.places || [];

            const mapped: Activity[] = (places || []).map((p: any, idx: number) => {
              const loc = p.location || {};
              const title = loc.titulo ?? p.location?.titulo ?? t('addTrip.placeNumber', { number: p.fk_location ?? p.id ?? idx + 1 });

              let ts = Number.NaN;
              if (p.date) {
                const base = (typeof p.date === 'string' && p.date.includes('T')) ? p.date : `${p.date}T00:00:00`;
                const start = p.start_hour ? `${base.split('T')[0]}T${p.start_hour}:00` : base;
                const d = new Date(start);
                ts = d.getTime();
              }

              const dateStr = `${formatDate(p.date)} ${formatTime(p.start_hour)}${p.end_hour ? ` - ${formatTime(p.end_hour)}` : ''}`.trim();

              return {
                key: String(p.id ?? idx),
                title,
                img: null, // Image will be extracted in ActivityCard from place object
                dateStr,
                sortTs: isNaN(ts) ? undefined : ts,
                place: p, // Store raw place object for image extraction
              };
            });

            const sorted = mapped.slice().sort((a, b) => {
              const aa = a.sortTs ?? Number.MAX_SAFE_INTEGER;
              const bb = b.sortTs ?? Number.MAX_SAFE_INTEGER;
              return aa - bb;
            });

            if (mounted) {
              setActivities(sorted);
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

  const onEdit = (a: Activity) => {
    router.push(`/(trips)/edit-activity?tripId=${tripId}&placeId=${a.key}`);
  };

  const confirmAndDelete = () => {
    if (!Number.isFinite(tripId) || tripId <= 0) {
      Alert.alert(t('common.error'), t('tripDetails.invalidId'));
      return;
    }

    Alert.alert(
      t('tripDetails.deleteTitle'),
      t('tripDetails.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            if (deleting) return;
            setDeleting(true);
            try {
              await apiDelete(`/trips/${tripId}`);
              Alert.alert(t('common.success'), t('tripDetails.deleteSuccess'));
              router.back();
            } catch (e: any) {
              const msg = e?.message || t('tripDetails.deleteError');
              Alert.alert(t('common.error'), msg);
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const [showShareModal, setShowShareModal] = useState(false);

  const menuOptions = [
    {
      label: t('tripDetails.shareButton'),
      icon: 'share-outline' as const,
      onPress: () => setShowShareModal(true),
    },
    {
      label: t('common.delete'),
      icon: 'trash-outline' as const,
      onPress: confirmAndDelete,
      destructive: true,
    },
  ];

  return (
    <SecondaryLayout title={destination} rightActions={<ContextMenu options={menuOptions} />}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{destination}</Text>
          <Text style={styles.subtitle}>{dateRangeStr}</Text>
        </View>

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
              onEdit={onEdit}
              showEditButton={true}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <FloatingActionButton
        onPress={() => router.push(`/(trips)/add-activity?tripId=${tripId}`)}
        accessibilityLabel={t('tripDetails.addActivity')}
        bottom={(Platform.OS === 'android' ? 100 : 125) + insets.bottom}
        right={20}
      />

      {showShareModal && (
        <ShareTripButton 
          tripId={tripId} 
          tripDestination={destination}
          showButton={false}
          initialVisible={true}
          onClose={() => setShowShareModal(false)}
        />
      )}
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 18,
    top: 36,
    gap: 8,
  },


  addBtn: {
    width: '100%',
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  addBtnText: { color: AppColors.white, fontSize: 18, fontWeight: '700' },

  deleteBtn: {
    backgroundColor: AppColors.backgroundTertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 6,
  },
});