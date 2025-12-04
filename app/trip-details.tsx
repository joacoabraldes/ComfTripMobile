import { apiDelete, apiGet } from '@/helpers/api';
import { formatDate, formatDateRange, formatTime } from '@/helpers/dateUtils';
import { getTripStatus, isTripCompleted } from '@/helpers/tripUtils';
import { Activity, Trip, TripReview } from '@/types';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import { CommonStyles } from '@/constants/Styles';
import TripSummary from '@/components/trip/TripSummary';
import ReviewForm from '@/components/trip/ReviewForm';
import ShareTripButton from '@/components/trip/ShareTripButton';
import { useTranslation } from '@/i18n';

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

        const mapped: Activity[] = (places || []).map((p: any, idx: number) => {
          const loc = p.location || {};
          const title = loc?.titulo ?? t('addTrip.placeNumber', { number: p.fk_location ?? p.id ?? idx + 1 });
          const firstImg = Array.isArray(loc?.imagenes) && loc.imagenes.length > 0 ? loc.imagenes[0] : null;

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
            // Review doesn't exist yet, that's okay
            if (err?.status !== 404) {
              console.error('Error loading review:', err);
            }
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

  // Preserve local edit sync (if any)
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      const checkUpdates = async () => {
        try {
          const raw = await AsyncStorage.getItem('updatedActivity');
          if (!raw) return;
          const parsed = JSON.parse(raw) as { key: string; newTitle?: string; imageUri?: string } | null;
          if (!parsed || !mounted) return;

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
        } catch {}
      };

      checkUpdates();

      return () => {
        mounted = false;
      };
    }, [])
  );

  const onEdit = (a: Activity) => {
    const encodedTitle = encodeURIComponent(a.title);
    router.push(`/add-activity?mode=edit&title=${encodedTitle}&key=${a.key}`);
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
      // Review doesn't exist, ignore
      console.error('Error reloading review:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={CommonStyles.backButtonContainer}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{destination}</Text>
          <Text style={styles.subtitle}>{dateRangeStr}</Text>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.completedBadgeText}>{t('tripDetails.completedBadge')}</Text>
            </View>
          )}
        </View>

        {/* Trip Summary for completed trips */}
        {isCompleted && trip && (
          <TripSummary trip={trip} />
        )}

        {/* Review Section for completed trips */}
        {isCompleted && Number.isFinite(tripId) && (
          <>
            {!showReviewForm ? (
              <View style={styles.reviewSection}>
                <View style={styles.reviewSectionHeader}>
                  <Text style={styles.sectionTitle}>{t('review.title')}</Text>
                  <TouchableOpacity
                    style={styles.editReviewButton}
                    onPress={() => setShowReviewForm(true)}
                  >
                    <MaterialIcons
                      name={review ? 'edit' : 'add-circle-outline'}
                      size={20}
                      color="#FF3951"
                    />
                    <Text style={styles.editReviewButtonText}>
                      {review ? t('common.edit') : t('common.add')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {review ? (
                  <View style={styles.reviewDisplay}>
                    <View style={styles.reviewRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcons
                          key={star}
                          name={star <= (review.rating || 0) ? 'star' : 'star-border'}
                          size={20}
                          color={star <= (review.rating || 0) ? '#FFD700' : '#CCC'}
                        />
                      ))}
                      <Text style={styles.reviewRatingText}>
                        {review.rating || 0}/5
                      </Text>
                    </View>
                    {review.title && (
                      <Text style={styles.reviewTitle}>{review.title}</Text>
                    )}
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.noReviewText}>
                    {t('review.noReview')}
                  </Text>
                )}
              </View>
            ) : (
              <ReviewForm
                tripId={tripId}
                existingReview={review}
                onSaved={handleReviewSaved}
              />
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>{t('tripDetails.itinerary')}</Text>

        <View style={{ height: 8 }} />

        {loading ? (
          <View style={{ width: '100%', alignItems: 'center', paddingVertical: 20 }}>
            <ActivityIndicator size="small" color="#FF3951" />
            <Text style={{ marginTop: 8, color: '#777' }}>{t('tripDetails.loadingActivities')}</Text>
          </View>
        ) : error ? (
          <View style={{ width: '100%', alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: '#B00020' }}>{error}</Text>
          </View>
        ) : activities.length === 0 ? (
          <View style={{ width: '100%', alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: '#777' }}>{t('tripDetails.noActivities')}</Text>
          </View>
        ) : (
          activities.map((a) => (
            <View key={a.key} style={styles.activityCard}>
              {a.img ? (
                <Image source={{ uri: a.img }} style={styles.activityImage} resizeMode="cover" />
              ) : (
                <View style={[styles.activityImage, { backgroundColor: '#CFCFCF' }]} />
              )}

              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{a.title}</Text>
                <Text style={styles.activityDate}>{a.dateStr}</Text>
              </View>
              <TouchableOpacity style={styles.pencil} onPress={() => onEdit(a)}>
                <MaterialIcons name="edit" size={20} color="#555" />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      <View style={styles.actionButtons}>
        {isCompleted && Number.isFinite(tripId) && (
          <ShareTripButton tripId={tripId} tripDestination={destination} />
        )}
        <TouchableOpacity
          style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
          onPress={confirmAndDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel={t('tripDetails.deleteButton')}
        >
          <MaterialIcons name="delete-outline" size={22} color="#2d2d2dff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFCFC' },
  scroll: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 50, alignItems: 'center' },
  header: { width: '100%', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '800', color: '#000' },
  subtitle: { marginTop: 8, fontSize: 16, color: '#757575' },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  completedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  sectionTitle: { alignSelf: 'flex-start', fontSize: 22, fontWeight: '800', marginTop: 6, color: '#111' },
  reviewSection: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
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
    color: '#FF3951',
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
    color: '#333',
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  noReviewText: {
    fontSize: 14,
    color: '#999',
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
      paddingTop: Platform.OS === 'android' ? 0 : 20,
  },

  activityCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  activityImage: { width: 56, height: 56, borderRadius: 10, marginRight: 12, backgroundColor: '#ddd' },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  activityDate: { marginTop: 4, fontSize: 13, color: '#777' },

  pencil: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },

  addBtn: {
    width: '100%',
    backgroundColor: '#FF3951',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  deleteBtn: {
    backgroundColor: '#edededff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 6,
  },
});