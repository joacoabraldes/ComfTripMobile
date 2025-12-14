import FloatingActionButton from '@/components/buttons/FloatingActionButton';
import SecondaryLayout from '@/components/layouts/SecondaryLayout';
import ActivityCard from '@/components/trip/ActivityCard';
import FlightInfoCard from '@/components/trip/FlightInfoCard';
import FlightSearchCard from '@/components/trip/FlightSearchCard';
import ShareTripButton from '@/components/trip/ShareTripButton';
import ContextMenu from '@/components/ui/ContextMenu';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { StateColors } from '@/constants/Colors';
import { mapPlacesToActivities } from '@/helpers/activityUtils';
import { apiDelete, apiGet, apiPost, apiPut } from '@/helpers/api';
import { formatDateRange } from '@/helpers/dateUtils';
import { normalizeTripData } from '@/helpers/tripUtils';
import { useAppColors } from '@/hooks/useAppColors';
import { useFlightInfo } from '@/hooks/useFlightInfo';
import { useTranslation } from '@/i18n';
import { useSnackbar } from '@/contexts/SnackbarContext';
import flightsApi from '@/services/flightsApi';
import { Activity, Trip } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { extractCoords } from '@/helpers/locationUtils';

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
  const { showSuccess, showError } = useSnackbar();

  // Header uses params (as in trips.tsx navigation)
  const destination = params.destination ?? t('tripSummary.destination');
  const dateRangeStr = formatDateRange(params.start_date, params.end_date);

  const tripId = params.id ? Number(params.id) : NaN;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [showFlightSearch, setShowFlightSearch] = useState(false);
  const [isFlightFormValid, setIsFlightFormValid] = useState<boolean>(false);
  const saveFlightFnRef = React.useRef<(() => Promise<void>) | null>(null);
  const [initialFlightData, setInitialFlightData] = useState<{
    originCountry: string | null;
    originCity: string | null;
    originAirport: any | null;
    destinationAirport: any | null;
  } | null>(null);

  const { flightInfo, loading: flightLoading, refreshFlight } = useFlightInfo(tripId);

  // Memoize the callback to avoid recreating it on every render
  const handleSaveRequest = useCallback((fn: () => Promise<void>) => {
    saveFlightFnRef.current = fn;
  }, []);

  // Memoize the onSave callback to handle flight saving
  const handleFlightSave = useCallback(async (flightId: string) => {
    console.log('handleFlightSave: called with', { flightId, tripId });
    // Save or update the flight
    try {
      // Check if there's already a flight for this trip
      const existingFlightsRes = await apiGet(`/flights?trip_id=${tripId}`);
      const existingFlights = existingFlightsRes?.data?.flights || (Array.isArray(existingFlightsRes?.data) ? existingFlightsRes.data : []);
      const existingFlight = existingFlights.length > 0 ? existingFlights[0] : null;

      console.log('handleFlightSave: existing flight', { existingFlight, flightId });

      if (existingFlight) {
        // If the flight_id is different, update the existing flight
        if (existingFlight.flight_id !== flightId) {
          console.log('handleFlightSave: updating to different flight', { old: existingFlight.flight_id, new: flightId });
          // Disassociate old flight
          await apiPut(`/flights/${encodeURIComponent(existingFlight.flight_id)}`, {
            trip_id: null,
          });
          // Create new flight
          await apiPost('/flights', {
            flight_id: flightId,
            trip_id: tripId,
          });
          console.log('handleFlightSave: new flight created');
        } else {
          console.log('handleFlightSave: same flight_id, updating association');
          // Same flight_id, just ensure it's associated with the trip
          await apiPut(`/flights/${encodeURIComponent(flightId)}`, {
            trip_id: tripId,
          });
        }
      } else {
        console.log('handleFlightSave: no existing flight, creating new one');
        // No existing flight, create new one
        try {
          await apiPost('/flights', {
            flight_id: flightId,
            trip_id: tripId,
          });
          console.log('handleFlightSave: flight created successfully');
        } catch (postErr: any) {
          console.log('handleFlightSave: POST failed, trying PUT', postErr);
          // If POST fails with 409 (already exists), try to update it
          if (postErr?.status === 409 || postErr?.response?.status === 409 || postErr?.message?.includes('ya existe')) {
            await apiPut(`/flights/${encodeURIComponent(flightId)}`, {
              trip_id: tripId,
            });
            console.log('handleFlightSave: flight updated via PUT');
          } else {
            throw postErr;
          }
        }
      }
      setShowFlightSearch(false);
      await refreshFlight();
      console.log('handleFlightSave: completed successfully');
    } catch (err: any) {
      console.error('handleFlightSave: error saving flight', err);
      throw err; // Re-throw so FlightSearchCard can handle the alert
    }
  }, [tripId, refreshFlight]);

  // Extract flight data from flightInfo when available
  useEffect(() => {
    if (flightInfo && flightInfo.fromIata && flightInfo.toIata) {
      (async () => {
        try {
          // Get origin airport info
          const fromIata = flightInfo.fromIata;
          const toIata = flightInfo.toIata;
          if (!fromIata || !toIata) return;
          
          const originAirportRow = await flightsApi.getAirportRowByIata(fromIata);
          const originCountry = originAirportRow?.iso_country || null;
          const originCity = originAirportRow?.municipality || originAirportRow?.city || null;
          
          // Get airport options for select
          const originAirportOptions = originAirportRow && originCountry ? await flightsApi.getAirportOptionsForSelect('', 1, originCountry, originCity || undefined) : [];
          const originAirport = originAirportOptions.find(opt => opt.value === fromIata) || null;
          
          // Get destination airport info
          const destAirportOptions = await flightsApi.getAirportOptionsForSelect('', 1);
          const destinationAirport = destAirportOptions.find(opt => opt.value === toIata) || null;
          
          setInitialFlightData({
            originCountry: originCountry ? originCountry.toLowerCase() : null,
            originCity,
            originAirport,
            destinationAirport,
          });
        } catch (err) {
          console.error('Error loading flight airport data:', err);
        }
      })();
    } else {
      setInitialFlightData(null);
    }
  }, [flightInfo]);

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

        // Map places to activities
        const places: any[] = tripData.places || [];
        const activities = mapPlacesToActivities(places, t, true);

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

            const tripData = normalizeTripData(data, tripId, params, t);

            if (mounted) {
              setTrip(tripData);
            }

            const places: any[] = tripData.places || [];
            const activities = mapPlacesToActivities(places, t, true);

            if (mounted) {
              setActivities(activities);
            }
          } catch (err: any) {
            // If trip was deleted (404), navigate back
            if (err?.status === 404 || err?.response?.status === 404 || err?.message?.includes('404') || err?.message?.includes('No encontrado')) {
              console.log('Trip was deleted, navigating back');
              if (mounted) {
                router.back();
              }
            } else {
              console.error('Error refreshing trip:', err);
            }
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

  // Group activities by date
  const groupActivitiesByDate = (activities: Activity[]) => {
    const grouped: { [key: string]: { dateLabel: string; activities: Activity[] } } = {};

    activities.forEach((activity) => {
      // Extract date from place object or dateStr
      let dateStr = '';
      if (activity.place?.date) {
        dateStr = activity.place.date.split('T')[0]; // Get YYYY-MM-DD part
      }

      if (!dateStr) {
        // Fallback: try to parse from activity.dateStr (format varies)
        // This is a fallback; usually place.date should exist
        dateStr = 'unknown';
      }

      if (!grouped[dateStr]) {
        // Format the date label (e.g., "Sábado, 6 de diciembre")
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
      }

      grouped[dateStr].activities.push(activity);
    });

    // Sort by date
    return Object.entries(grouped)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([_, group]) => group);
  };

  const confirmAndDelete = () => {
    if (!Number.isFinite(tripId) || tripId <= 0) {
      showError(t('tripDetails.invalidId'));
      return;
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiDelete(`/trips/${tripId}`);
      showSuccess(t('tripDetails.deleteSuccess'));
      setShowDeleteDialog(false);
      router.back();
    } catch (e: any) {
      const msg = e?.message || t('tripDetails.deleteError');
      showError(msg);
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
  };

  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const mapRef = useRef<MapView | null>(null);

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

        {/* Flight Info Card */}
        {!showFlightSearch && flightInfo && (
          <FlightInfoCard
            tripId={tripId}
            flightInfo={flightInfo}
            onRefresh={refreshFlight}
            onEdit={() => setShowFlightSearch(true)}
            readOnly={false}
          />
        )}

        {/* Flight Search Card (when editing) */}
        {showFlightSearch && (
          <>
            <FlightSearchCard
              tripId={tripId}
              startDate={trip?.start_date ? new Date(trip.start_date) : null}
              destinationCity={trip?.destination || destination}
              initialOriginCountry={initialFlightData?.originCountry || null}
              initialOriginCity={initialFlightData?.originCity || null}
              initialOriginAirport={initialFlightData?.originAirport || null}
              initialDestinationAirport={initialFlightData?.destinationAirport || null}
              onFlightSelected={() => {
                // Don't close automatically, wait for confirm button
              }}
              onSave={handleFlightSave}
              onValidationChange={setIsFlightFormValid}
              onSaveRequest={handleSaveRequest}
              showSaveButton={false}
            />
            <View style={styles.flightActionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowFlightSearch(false);
                  setInitialFlightData(null);
                  saveFlightFnRef.current = null;
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !isFlightFormValid && styles.confirmButtonDisabled]}
                onPress={async () => {
                  if (!isFlightFormValid || !saveFlightFnRef.current) {
                    console.warn('Confirm button: cannot save', { isFlightFormValid, hasSaveFn: !!saveFlightFnRef.current });
                    return;
                  }
                  try {
                    console.log('Confirm button: calling saveFlightFn');
                    await saveFlightFnRef.current();
                    console.log('Confirm button: saveFlightFn completed');
                    setShowFlightSearch(false);
                    setInitialFlightData(null);
                    saveFlightFnRef.current = null;
                    await refreshFlight();
                  } catch (err) {
                    console.error('Confirm button: error in saveFlightFn', err);
                    // Error is already handled in FlightSearchCard
                  }
                }}
                disabled={!isFlightFormValid || !saveFlightFnRef.current}
              >
                <Text style={[styles.confirmButtonText, !isFlightFormValid && styles.confirmButtonTextDisabled]}>
                  {t('common.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!showFlightSearch && !flightInfo && !flightLoading && (
          <TouchableOpacity
            style={styles.addFlightButton}
            onPress={() => setShowFlightSearch(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={AppColors.primary} />
            <Text style={styles.addFlightButtonText}>{t('addTrip.flights')}</Text>
          </TouchableOpacity>
        )}

        {/* Map with all locations */}
        {(() => {
          const coords = activities
            .map(a => extractCoords(a.place))
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
                    const activity = activities.find(a => {
                      const coords = extractCoords(a.place);
                      return coords && coords.lat === c.lat && coords.lng === c.lng;
                    });
                    return (
                      <Marker
                        key={`${c.lat}-${c.lng}-${idx}`}
                        coordinate={{ latitude: c.lat, longitude: c.lng }}
                        title={activity?.title ?? activity?.place?.location?.titulo ?? `Lugar ${idx + 1}`}
                        description={activity?.dateStr || ''}
                      />
                    );
                  })}
                </MapView>
              </View>
            );
          }
          return null;
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
                  onEdit={onEdit}
                  showEditButton={true}
                />
              ))}
              <View style={{ height: 16 }} />
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

      <ConfirmDialog
        visible={showDeleteDialog}
        title={t('tripDetails.deleteTitle')}
        message={t('tripDetails.deleteMessage')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        destructive={true}
      />
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
  addFlightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AppColors.backgroundTertiary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginVertical: 12,
  },
  addFlightButtonText: {
    color: AppColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  flightActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: AppColors.backgroundTertiary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: AppColors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: AppColors.backgroundTertiary,
    opacity: 0.5,
  },
  confirmButtonText: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: AppColors.textMuted,
  },
});