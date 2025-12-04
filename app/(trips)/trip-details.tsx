import { apiDelete, apiGet } from '@/helpers/api';
import { formatDate, formatDateRange, formatTime } from '@/helpers/dateUtils';
import { getTripStatus, isTripCompleted } from '@/helpers/tripUtils';
import { Activity, Trip, TripReview } from '@/types';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SecondaryLayout from '@/components/layouts/SecondaryLayout';
import TripSummary from '@/components/trip/TripSummary';
import ReviewForm from '@/components/trip/ReviewForm';
import ShareTripButton from '@/components/trip/ShareTripButton';
import ContextMenu from '@/components/ui/ContextMenu';
import { useTranslation } from '@/i18n';
import { AppColors, ShadowColors, StateColors } from '@/constants/Colors';
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
  const insets = useSafeAreaInsets();

  // Header uses params (as in trips.tsx navigation)
  const destination = params.destination ?? t('tripSummary.destination');
  const dateRangeStr = formatDateRange(params.start_date, params.end_date);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [review, setReview] = useState<TripReview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);

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

        // Helper to parse images
        const safeParseImages = (im: any): string[] => {
          if (!im) return [];
          if (Array.isArray(im)) {
            return im
              .map((it) => {
                if (!it) return null;
                if (typeof it === 'string') return it;
                if (typeof it === 'object') return it.url ?? it.src ?? it.image ?? null;
                return String(it);
              })
              .filter(Boolean) as string[];
          }
          if (typeof im === 'string') {
            try {
              const parsed = JSON.parse(im);
              if (Array.isArray(parsed)) {
                return parsed
                  .map((it) => (typeof it === 'object' && it !== null ? it.url ?? it.src ?? it.image ?? String(it) : String(it)))
                  .filter(Boolean);
              }
              return [String(parsed)];
            } catch (e) {
              if (im.includes(',')) return im.split(',').map((s) => s.trim()).filter(Boolean);
              return [im];
            }
          }
          if (typeof im === 'object' && im !== null) {
            if (Array.isArray((im as any).urls)) return (im as any).urls;
            if ((im as any).url) return [(im as any).url];
            if ((im as any).src) return [(im as any).src];
          }
          return [];
        };

        const mapped: Activity[] = (places || []).map((p: any, idx: number) => {
          const loc = p.location || {};
          const title = loc?.titulo ?? t('addTrip.placeNumber', { number: p.fk_location ?? p.id ?? idx + 1 });
          const images = safeParseImages(loc?.imagenes);
          const firstImg = images.length > 0 ? images[0] : null;

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
            img: firstImg,
            dateStr,
            sortTs: isNaN(ts) ? undefined : ts,
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

        // Load review for completed trips
        if (mounted && isTripCompleted(tripData)) {
          try {
            const reviewRes = await apiGet(`/trips/${tripId}/review`);
            const reviewData = reviewRes?.data || reviewRes;
            if (reviewData && reviewData.id) {
              setReview(reviewData);
            }
          } catch (err: any) {
            // Review doesn't exist yet, that's okay (404 or endpoint not found)
            const status = err?.status || (typeof err === 'string' && err.includes('Cannot GET') ? 404 : null);
            if (status !== 404 && status !== null) {
              // Only log non-404 errors
              console.error('Error loading review:', err?.message || err);
            }
            // Silently ignore 404s and endpoint not found errors
          }
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

            const safeParseImages = (im: any): string[] => {
              if (!im) return [];
              if (Array.isArray(im)) {
                return im
                  .map((it) => {
                    if (!it) return null;
                    if (typeof it === 'string') return it;
                    if (typeof it === 'object') return it.url ?? it.src ?? it.image ?? null;
                    return String(it);
                  })
                  .filter(Boolean) as string[];
              }
              if (typeof im === 'string') {
                try {
                  const parsed = JSON.parse(im);
                  if (Array.isArray(parsed)) {
                    return parsed
                      .map((it) => (typeof it === 'object' && it !== null ? it.url ?? it.src ?? it.image ?? String(it) : String(it)))
                      .filter(Boolean);
                  }
                  return [String(parsed)];
                } catch (e) {
                  if (im.includes(',')) return im.split(',').map((s) => s.trim()).filter(Boolean);
                  return [im];
                }
              }
              if (typeof im === 'object' && im !== null) {
                if (Array.isArray((im as any).urls)) return (im as any).urls;
                if ((im as any).url) return [(im as any).url];
                if ((im as any).src) return [(im as any).src];
              }
              return [];
            };

            const mapped: Activity[] = (places || []).map((p: any, idx: number) => {
              const loc = p.location || {};
              const title = loc?.titulo ?? t('addTrip.placeNumber', { number: p.fk_location ?? p.id ?? idx + 1 });
              const images = safeParseImages(loc?.imagenes);
              const firstImg = images.length > 0 ? images[0] : null;

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
                img: firstImg,
                dateStr,
                sortTs: isNaN(ts) ? undefined : ts,
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

  const handleReviewSaved = async () => {
    setShowReviewForm(false);
    // Reload review
    try {
      const reviewRes = await apiGet(`/trips/${tripId}/review`);
      const reviewData = reviewRes?.data || reviewRes;
      if (reviewData && reviewData.id) {
        setReview(reviewData);
      }
    } catch (err: any) {
      // Review doesn't exist or endpoint not found, ignore (don't log expected errors)
      const status = err?.status || (typeof err === 'string' && err.includes('Cannot GET') ? 404 : null);
      if (status !== 404 && status !== null) {
        // Only log non-404 errors
        console.error('Error reloading review:', err?.message || err);
      }
    }
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
            <View key={a.key} style={styles.activityCard}>
              {a.img ? (
                <Image source={{ uri: a.img }} style={styles.activityImage} resizeMode="cover" />
              ) : (
                <View style={[styles.activityImage, { backgroundColor: AppColors.borderLight }]} />
              )}

              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{a.title}</Text>
                <Text style={styles.activityDate}>{a.dateStr}</Text>
              </View>
              <TouchableOpacity style={styles.pencil} onPress={() => onEdit(a)}>
                <MaterialIcons name="edit" size={20} color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>
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

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, alignItems: 'center' },
  header: { width: '100%', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '800', color: AppColors.black },
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
  reviewSection: {
    width: '100%',
    backgroundColor: AppColors.backgroundPrimary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: ShadowColors.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editReviewButtonText: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  reviewDisplay: {
    marginTop: 8,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  reviewRatingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 15,
    color: AppColors.textSecondary,
    lineHeight: 22,
  },
  noReviewText: {
    fontSize: 14,
    color: AppColors.textMutedDark,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 18,
    top: 36,
    gap: 8,
  },

  activityCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: AppColors.backgroundTertiary,
    marginTop: 10,
    shadowColor: ShadowColors.black,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  activityImage: { width: 56, height: 56, borderRadius: 10, marginRight: 12, backgroundColor: AppColors.borderLight },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text },
  activityDate: { marginTop: 4, fontSize: 13, color: AppColors.textSecondary },

  pencil: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
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