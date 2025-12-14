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
import FlightInfoCard from '@/components/trip/FlightInfoCard';
import { useTranslation } from '@/i18n';
import { ShadowColors, StateColors } from '@/constants/Colors';
import { useAppColors } from '@/hooks/useAppColors';
import { useFlightInfo } from '@/hooks/useFlightInfo';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { extractCoords } from '@/helpers/locationUtils';
import { useRef } from 'react';

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
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const tripId = params.id ? Number(params.id) : NaN;
  const { flightInfo, refreshFlight } = useFlightInfo(tripId);
  const mapRef = useRef<MapView | null>(null);
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
        const placesData: any[] = tripData.places || [];
        const activities = mapPlacesToActivities(placesData, t, false);

        if (mounted) {
          setActivities(activities);
          setPlaces(placesData);
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

            const placesData: any[] = tripData.places || [];
            const activities = mapPlacesToActivities(placesData, t, false);

            if (mounted) {
              setActivities(activities);
              setPlaces(placesData);
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

  // Group activities by date
  const groupActivitiesByDate = (activities: Activity[]) => {
    const grouped: { [key: string]: { dateLabel: string; activities: Activity[] } } = {};

    activities.forEach((activity) => {
      // Extract date from places array (since activity.place is undefined in trip-history-details)
      let dateStr = '';
      const place = places.find(p => String(p.id) === activity.key);
      if (place?.date) {
        dateStr = place.date.split('T')[0]; // Get YYYY-MM-DD part
      }

      if (!dateStr) {
        // Fallback: try to parse from activity.dateStr (format varies)
        dateStr = 'unknown';
      }

      if (!grouped[dateStr]) {
        // Format the date label (e.g., "Sábado, 6 de diciembre")
        if (dateStr !== 'unknown') {
          const actDate = new Date(dateStr + 'T00:00:00');
          const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(actDate);
          const dateLabel = new Intl.DateTimeFormat('es-ES', {
            day: 'numeric',
            month: 'long',
          }).format(actDate);

          grouped[dateStr] = {
            dateLabel: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}`,
            activities: [],
          };
        } else {
          grouped[dateStr] = {
            dateLabel: t('tripDetails.dateNotSpecified') || 'Fecha no especificada',
            activities: [],
          };
        }
      }

      grouped[dateStr].activities.push(activity);
    });

    // Sort by date
    return Object.entries(grouped)
      .sort((a, b) => {
        if (a[0] === 'unknown') return 1;
        if (b[0] === 'unknown') return -1;
        return new Date(a[0]).getTime() - new Date(b[0]).getTime();
      })
      .map(([_, group]) => group);
  };


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

        {/* Flight Info Card (read-only) */}
        {flightInfo && (
          <FlightInfoCard
            tripId={tripId}
            flightInfo={flightInfo}
            onRefresh={refreshFlight}
            readOnly={true}
          />
        )}

        {/* Map with all locations */}
        {places.length > 0 && (() => {
          const coords = places
            .map(p => extractCoords(p))
            .filter((c): c is {lat:number; lng:number} => !!c);

          if (coords.length > 0) {
            const first = coords[0];
            const initialRegion = {
              latitude: first.lat,
              longitude: first.lng,
              latitudeDelta: 0.06,
              longitudeDelta: 0.06,
            };

            const fitAll = () => {
              if (!mapRef.current || coords.length < 2) return;
              mapRef.current.fitToCoordinates(
                coords.map(c => ({ latitude: c.lat, longitude: c.lng })),
                {
                  edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                  animated: true,
                }
              );
            };

            return (
              <View style={{ marginTop: 12, marginBottom: 20, borderRadius: 12, overflow: 'hidden', width: '100%' }}>
                <Text style={styles.sectionTitle}>{t('tripDetails.map') || 'Mapa'}</Text>
                <View style={{ height: 8 }} />
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={{ width: '100%', height: 240 }}
                  initialRegion={initialRegion}
                  onMapReady={fitAll}
                  onLayout={fitAll}
                >
                  {coords.map((c, idx) => {
                    const place = places.find(p => {
                      const placeCoords = extractCoords(p);
                      return placeCoords && placeCoords.lat === c.lat && placeCoords.lng === c.lng;
                    });
                    const activity = activities.find(a => a.key === String(place?.id));
                    const title = place?.location?.titulo ?? activity?.title ?? `Lugar ${idx + 1}`;
                    return (
                      <Marker
                        key={`${c.lat}-${c.lng}-${idx}`}
                        coordinate={{ latitude: c.lat, longitude: c.lng }}
                        title={title}
                        description={activity?.dateStr || ''}
                      />
                    );
                  })}
                </MapView>
              </View>
            );
          }
          return (
            <View style={{ marginTop: 12, marginBottom: 20, width: '100%' }}>
              <Text style={styles.sectionTitle}>{t('tripDetails.map') || 'Mapa'}</Text>
              <View style={{ height: 8 }} />
              <View style={{ width: '100%', height: 240, backgroundColor: AppColors.backgroundTertiary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: AppColors.textSecondary }}>{t('tripDetails.noMapData') || 'No hay coordenadas disponibles para mostrar en el mapa'}</Text>
              </View>
            </View>
          );
        })()}

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
          groupActivitiesByDate(activities).map((group, groupIdx) => (
            <View key={`date-group-${groupIdx}`} style={{ width: '100%' }}>
              <Text style={styles.dateGroupTitle}>{group.dateLabel}</Text>
              <View style={{ height: 12 }} />
              {group.activities.map((a) => (
                <ActivityCard
                  key={a.key}
                  activity={a}
                  place={a.place}
                  showEditButton={false}
                />
              ))}
              <View style={{ height: 16 }} />
            </View>
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
  dateGroupTitle: { alignSelf: 'flex-start', fontSize: 18, fontWeight: '700', marginTop: 12, color: AppColors.text },
});