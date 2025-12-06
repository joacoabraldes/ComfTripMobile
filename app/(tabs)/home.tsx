import FloatingActionButton from '@/components/buttons/FloatingActionButton';
import LogoSvg from '@/components/icons/LogoSvg';
import PrimaryLayout from '@/components/layouts/PrimaryLayout';
import TripCard from '@/components/trip/TripCard';
import { AdditionalColors, ShadowColors, StateColors } from '@/constants/Colors';
import { useCommonStyles } from "@/constants/Styles";
import { apiGet } from '@/helpers/api';
import { formatDateOrEmpty, formatTimeOrEmpty } from '@/helpers/dateUtils';
import { extractCoords } from '@/helpers/locationUtils';
import { getResponsiveValues, responsiveSize } from '@/helpers/responsive';
import { getTripFirstPlaceImage } from '@/helpers/tripUtils';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/i18n';
import { Trip } from '@/types';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Place = {
  id: number;
  date?: string; // "YYYY-MM-DD" or ISO
  start_hour?: string; // "HH:mm"
  end_hour?: string;   // "HH:mm"
  notes?: string | null;
  fk_location?: number;
  location?: {
    titulo?: string;
    imagenes?: string[];
    descripcion?: string; // Added description field
    latitude?: number | string;
    longitude?: number | string;
    latitud?: number | string;
    longitud?: number | string;
  };
};

function isUpcoming(start?: string, end?: string) {
  if (!start || !end) return -1;
  const now = new Date();
  const s = new Date(start);
  const e = new Date(end);
  if (s > now) return 2; // Proximo
  if (s <= now && e >= now) return 1; // Actual
  return 0; // Pasado
}

function toDateSafe(date?: string, time?: string) {
  if (!date) return null;
  const baseDate = (typeof date === 'string' && date.includes('T')) ? date.split('T')[0] : date;
  const iso = time ? `${baseDate}T${time}:00` : `${baseDate}T00:00:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = insets?.bottom ?? 0;
  const router = useRouter();
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
    const CommonStyles = useCommonStyles();

  // Estimated tab bar height (adjust if your tab bar is taller)
  const TABBAR_HEIGHT = 64;

  // measurements
  const responsive = getResponsiveValues(width, height);
  const horizontalPadding = responsiveSize(width, 0.06, 16, 32);
  const contentMaxWidth = Math.round(width - horizontalPadding * 2);
  const baseSvgWidth = 321;
  const baseSvgHeight = 251;
  const svgAspect = baseSvgHeight / baseSvgWidth;
  const btnWidth = responsive.widths.button;
  const btnHeight = responsive.heights.buttonSmall;
  const btnRadius = 8;
  const ctaBottomBase = 20 + bottomInset + TABBAR_HEIGHT;
  const ctaBottom = ctaBottomBase + 20;

  const contentTop = 24; // TopBar ya maneja el safe area
  const contentBottom = height - (ctaBottom + 40);
  const availableContentHeight = Math.max(260, contentBottom - contentTop);
  const maxSvgHeightFromWidth = Math.round(
    Math.min(
      baseSvgHeight,
      Math.min(321, Math.round(contentMaxWidth * 0.95)) * svgAspect
    )
  );
  const svgMaxHeight = Math.min(maxSvgHeightFromWidth, Math.round(availableContentHeight * 0.55));
  const svgMaxWidth = Math.round(svgMaxHeight / svgAspect);

  const copyFontSize = responsive.fontSizes.copy;
  const cardWidth = Math.min(340, Math.round(width - horizontalPadding * 2));

  const [ongoingPlaces, setOngoingPlaces] = useState<Place[]>([]);
  const mapRef = useRef<MapView | null>(null);

  // New state for trips and activities
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [loadingTrips, setLoadingTrips] = useState<boolean>(true);
  const [upcomingTrip, setUpcomingTrip] = useState<Trip | null>(null);
  const [ongoingTrip, setOngoingTrip] = useState<Trip | null>(null);

  // When there's an ongoing trip, we need more flexibility with height
  const hasOngoingTrip = !!ongoingTrip;
  const contentPaddingBottom = hasOngoingTrip ? 24 : (btnHeight + bottomInset + TABBAR_HEIGHT + 32);

  // Ongoing trip activities
  const [currentActivity, setCurrentActivity] = useState<Place | null>(null);
  const [nextActivity, setNextActivity] = useState<Place | null>(null);
  
  // Upcoming trip places (for map display)
  const [upcomingPlaces, setUpcomingPlaces] = useState<Place[]>([]);
  const [loadingUpcomingPlaces, setLoadingUpcomingPlaces] = useState<boolean>(false);
  const upcomingMapRef = useRef<MapView | null>(null);

  // load trips
  useEffect(() => {
    let mounted = true;
    setLoadingTrips(true);
    (async () => {
      try {
        const res = await apiGet('/trips');
        const data = res?.data ?? res;
        const tripsData: Trip[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        if (!mounted) return;

        // Enrich trips with first place image (only if places are already included)
        const enrichedTrips = tripsData.map((trip) => {
          const firstPlaceImage = getTripFirstPlaceImage(trip);
          return firstPlaceImage ? { ...trip, firstPlaceImage } : trip;
        });

        setTrips(enrichedTrips);
        // Determine ongoing and closest upcoming
        const now = new Date();

        const ongoing = enrichedTrips.filter(t => isUpcoming(t.start_date, t.end_date) === 1);
        const selectedOngoing = ongoing.length > 0
          ? ongoing.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())[0]
          : null;

        const upcoming = enrichedTrips.filter(t => isUpcoming(t.start_date, t.end_date) === 2);
        const selectedUpcoming = upcoming.length > 0
          ? upcoming.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0]
          : null;

        setOngoingTrip(selectedOngoing);
        setUpcomingTrip(selectedOngoing ? null : selectedUpcoming); // if ongoing exists, don't show upcoming
      } catch {
        setTrips([]);
        setOngoingTrip(null);
        setUpcomingTrip(null);
      } finally {
        if (mounted) setLoadingTrips(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load places for ongoing trip to compute current and next
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!ongoingTrip) {
        setCurrentActivity(null);
        setNextActivity(null);
        return;
      }
      try {
        const res = await apiGet(`/trips/${ongoingTrip.id}`);
        const tripData = res?.data ?? res;
        const places: Place[] = Array.isArray(tripData?.places)
          ? tripData.places
          : (Array.isArray(tripData?.data?.places) ? tripData.data.places : []);

        // Sort places by date + start_hour
        const sorted = places.slice().sort((a, b) => {
          const aStart = toDateSafe(a.date, a.start_hour)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const bStart = toDateSafe(b.date, b.start_hour)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          return aStart - bStart;
        });

        const now = new Date();

        let current: Place | null = null;
        let next: Place | null = null;

        for (const p of sorted) {
          const s = toDateSafe(p.date, p.start_hour);
          const e = toDateSafe(p.date, p.end_hour) || (s ? new Date(s.getTime() + 60 * 60 * 1000) : null);
          if (s && e && now >= s && now <= e) {
            current = p;
          } else if (s && now < s && !next) {
            next = p;
          }
          if (current && next) break;
        }

        if (mounted) {
          setCurrentActivity(current);
          setNextActivity(next);
          setOngoingPlaces(places);
        }
      } catch {
        if (mounted) {
          setCurrentActivity(null);
          setNextActivity(null);
        }
      }
    })();
    return () => { mounted = false; };
  }, [ongoingTrip]);

  // Load places for upcoming trip (for map display when no ongoing trip)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!upcomingTrip || ongoingTrip) {
        setUpcomingPlaces([]);
        setLoadingUpcomingPlaces(false);
        return;
      }
      setLoadingUpcomingPlaces(true);
      try {
        const res = await apiGet(`/trips/${upcomingTrip.id}`);
        const tripData = res?.data ?? res;
        const places: Place[] = Array.isArray(tripData?.places)
          ? tripData.places
          : (Array.isArray(tripData?.data?.places) ? tripData.data.places : []);

        if (mounted) {
          setUpcomingPlaces(places);
          setLoadingUpcomingPlaces(false);
          // Debug: log places and coordinates
          const coords = places.map(extractCoords).filter((c): c is {lat:number; lng:number} => !!c);
          console.log('[home] Upcoming trip places loaded:', places.length, 'places,', coords.length, 'with coordinates');
        }
      } catch (err) {
        console.error('Error loading upcoming trip places:', err);
        if (mounted) {
          setUpcomingPlaces([]);
          setLoadingUpcomingPlaces(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [upcomingTrip, ongoingTrip]);

  // Render helpers
  const renderUpcomingCard = (trip: Trip) => {
    // Get coordinates from upcoming trip places
    const coords = (upcomingPlaces ?? [])
      .map(extractCoords)
      .filter((c): c is {lat:number; lng:number} => !!c);

    const hasMap = coords.length > 0;

    // For map region
    const initialRegion = hasMap ? {
      latitude: coords[0].lat,
      longitude: coords[0].lng,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    } : null;

    const fitAll = () => {
      if (!upcomingMapRef.current || coords.length < 2) return;
      upcomingMapRef.current.fitToCoordinates(
        coords.map(c => ({ latitude: c.lat, longitude: c.lng })),
        {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        }
      );
    };

    return (
      <View style={styles.upcomingWrap}>
        <Text style={styles.upcomingLabel}>{t('home.upcomingTrip')}</Text>
        <TripCard
          trip={trip}
          width={cardWidth}
          destinationPath="/(trips)/trip-details"
          t={t}
        />
        {/* Map for upcoming trip destination */}
        {loadingUpcomingPlaces ? (
          <View style={{ marginTop: 16, height: 220, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="small" color={AppColors.primary} />
          </View>
        ) : hasMap && initialRegion ? (
          <View style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden', width: '100%' }}>
            <MapView
              ref={upcomingMapRef}
              provider={PROVIDER_GOOGLE}
              style={{ width: '100%', height: 220 }}
              initialRegion={initialRegion}
              onMapReady={fitAll}
              onLayout={fitAll}
            >
              {coords.map((c, idx) => (
                <Marker
                  key={`upcoming-${c.lat}-${c.lng}-${idx}`}
                  coordinate={{ latitude: c.lat, longitude: c.lng }}
                  title={upcomingPlaces[idx]?.location?.titulo ?? t('home.placeNumber', { number: idx + 1 })}
                  description={
                    (() => {
                      const p = upcomingPlaces[idx];
                      const hour =
                        (p?.start_hour ? ` ${formatTimeOrEmpty(p.start_hour)}` : '') +
                        (p?.end_hour ? ` - ${formatTimeOrEmpty(p.end_hour)}` : '');
                      const date = p?.date ? formatDateOrEmpty(p.date) : '';
                      return [date, hour.trim()].filter(Boolean).join(' · ');
                    })()
                  }
                />
              ))}
            </MapView>
          </View>
        ) : null}
      </View>
    );
  };

  const renderOngoingSummary = (trip: Trip) => {
    const currTitle = currentActivity?.location?.titulo;
    const nextTitle = nextActivity?.location?.titulo;
    const currTime = currentActivity ? `${formatTimeOrEmpty(currentActivity.start_hour)}${currentActivity.end_hour ? ` - ${formatTimeOrEmpty(currentActivity.end_hour)}` : ''}` : '-';
    const nextTime = nextActivity ? `${formatTimeOrEmpty(nextActivity.start_hour)}${nextActivity.end_hour ? ` - ${formatTimeOrEmpty(nextActivity.end_hour)}` : ''}` : '-';

    // Get current activity image and description
    const currImage = currentActivity?.location?.imagenes?.[0];
    const currDescription = currentActivity?.location?.descripcion;
    
    // Get next activity image and description
    const nextImage = nextActivity?.location?.imagenes?.[0];
    const nextDescription = nextActivity?.location?.descripcion;
    
    // Reduced image size for compact layout
    const activityImageSize = 50;
    const mapHeight = 160;

    return (
      <>
        <Text style={styles.ongoingHeader}>{trip.destination}</Text>
        <Text style={styles.ongoingDates}>{`${formatDateOrEmpty(trip.start_date)} - ${formatDateOrEmpty(trip.end_date)}`}</Text>

        {/* Current Activity Image and Description */}
        {currentActivity && (currImage || currDescription) && (
          <View style={styles.currentActivityPreview}>
            <Text style={styles.currentActivityLabel}>{t('home.currentActivity')}</Text>
            <View style={styles.currentActivityContent}>
              {currImage && (
                <Image
                  source={currImage}
                  style={[styles.currentActivityImage, { width: activityImageSize, height: activityImageSize }]}
                  contentFit="cover"
                />
              )}
              <View style={styles.currentActivityInfo}>
                <Text style={styles.currentActivityTitle}>{currTitle}</Text>
                <Text style={styles.currentActivityTime}>{currTime}</Text>
                {currDescription && (
                  <Text style={styles.currentActivityDescription} numberOfLines={2}>
                    {currDescription}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {nextActivity && nextActivity.start_hour && nextActivity.date && (() => {
          // Calculate time remaining to next activity
          const now = new Date();
          const nextDate = toDateSafe(nextActivity.date, nextActivity.start_hour);
          if (nextDate && nextDate > now) {
            const diffMs = nextDate.getTime() - now.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(diffMins / 60) + 3;
            const mins = diffMins % 60;
            const hoursText = hours === 1 ? t('home.hour') : t('home.hours');
            const minutesText = mins === 1 ? t('home.minute') : t('home.minutes');
            let timeRemainingText = '';
            if (hours > 0 && mins > 0) {
              timeRemainingText = t('home.timeRemainingBoth', { hours, hoursText, minutes: mins, minutesText });
            } else if (hours > 0) {
              timeRemainingText = t('home.timeRemainingHoursOnly', { hours, hoursText });
            } else {
              timeRemainingText = t('home.timeRemainingMinutesOnly', { minutes: mins, minutesText });
            }
            return (
              <Text style={{ marginTop: 8, color: AppColors.success, fontWeight: '600', fontSize: 14 }}>
                {timeRemainingText}
              </Text>
            );
          }
          return null;
        })()}

        {/* Next Activity Image and Description */}
        {nextActivity && (nextImage || nextDescription) && (
          <View style={styles.nextActivityPreview}>
            <Text style={styles.nextActivityLabel}>{t('home.nextActivity')}</Text>
            <View style={styles.nextActivityContent}>
              {nextImage && (
                <Image
                  source={nextImage}
                  style={[styles.nextActivityImage, { width: activityImageSize, height: activityImageSize }]}
                  contentFit="cover"
                />
              )}
              <View style={styles.nextActivityInfo}>
                <Text style={styles.nextActivityTitle}>{nextTitle}</Text>
                <Text style={styles.nextActivityTime}>{nextTime}</Text>
                {nextDescription && (
                  <Text style={styles.nextActivityDescription} numberOfLines={2}>
                    {nextDescription}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* --- Mapa con todas las ubicaciones del itinerario --- */}
        {(() => {
          const coords = (ongoingPlaces ?? [])
            .map(extractCoords)
            .filter((c): c is {lat:number; lng:number} => !!c);

          if (!coords.length) return null;

          // Región inicial fallback (centra en el primer punto)
          const first = coords[0];
          const initialRegion = {
            latitude: first.lat,
            longitude: first.lng,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          };

          // Para ajustar cámara a todos los pines luego del layout
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
            <View style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden' }}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={{ width: '100%', height: mapHeight }}
                initialRegion={initialRegion}
                onMapReady={fitAll}
                onLayout={fitAll}
              >
                {coords.map((c, idx) => (
                  <Marker
                    key={`${c.lat}-${c.lng}-${idx}`}
                    coordinate={{ latitude: c.lat, longitude: c.lng }}
                    title={ongoingPlaces[idx]?.location?.titulo ?? t('home.placeNumber', { number: idx + 1 })}
                    description={
                      (() => {
                        const p = ongoingPlaces[idx];
                        const hour =
                          (p?.start_hour ? ` ${formatTimeOrEmpty(p.start_hour)}` : '') +
                          (p?.end_hour ? ` - ${formatTimeOrEmpty(p.end_hour)}` : '');
                        const date = p?.date ? formatDateOrEmpty(p.date) : '';
                        return [date, hour.trim()].filter(Boolean).join(' · ');
                      })()
                    }
                  />
                ))}
              </MapView>
            </View>
          );
        })()}

        <TouchableOpacity
          style={styles.viewDetailsBtn}
          onPress={() => {
            router.push({
              pathname: '/(trips)/trip-details',
              params: {
                id: String(trip.id),
                destination: trip.destination,
                start_date: trip.start_date,
                end_date: trip.end_date,
                flag_url: trip.flag_url ?? '',
              },
            });
          }}
          activeOpacity={0.9}
        >
          <Text style={{ color: AppColors.white, fontWeight: '700' }}>{t('home.viewDetails')}</Text>
        </TouchableOpacity>
      </>
    );
  };

  const showHeaderSection = (!!ongoingTrip || (!!upcomingTrip && !ongoingTrip)) && !loadingTrips;
    if (loadingTrips) {
        return (
            <PrimaryLayout title={t('tabs.home')}>
                <View style={{flex: 1, justifyContent: 'center', alignItems: 'center',}}>
                    <ActivityIndicator size="large" color="#FF3951" />
                    <Text style={CommonStyles.loadingText}>{t('common.loading')}</Text>
                </View>
            </PrimaryLayout>
        );
    }
  return (
    <PrimaryLayout title={t('tabs.home')}>
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
        <View style={styles.root}>
          <View
            style={[
              styles.centerArea,
              {
                paddingHorizontal: horizontalPadding,
                paddingBottom: contentPaddingBottom,
                minHeight: availableContentHeight + 40,
              },
            ]}
          >
            <View style={[styles.centeredContent, { height: availableContentHeight }]}>
              {showHeaderSection && (
                <View style={{ width: '100%', marginBottom: 6 }}>
                  {ongoingTrip ? renderOngoingSummary(ongoingTrip) : (upcomingTrip ? renderUpcomingCard(upcomingTrip) : null)}
                </View>
              )}

              {!showHeaderSection && (
                <>
                  <LogoSvg width={150} height={150} />
                  <View style={styles.copyWrapper}>
                    <Text
                      style={[
                        styles.copyText,
                        {
                          fontSize: copyFontSize,
                          lineHeight: Math.round(copyFontSize * 1.15),
                        },
                      ]}
                    >
                      {t('home.noActiveTrips')}{"\n"}
                      {t('home.planNextTrip')}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      {/* FAB positioned in bottom right corner */}
      <FloatingActionButton
        onPress={() => router.push('/(trips)/add-trip')}
        accessibilityLabel={t('home.newTrip')}
        bottom={(Platform.OS === 'android' ? 100 : 125) + insets.bottom}
        right={20}
      />
    </PrimaryLayout>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: AppColors.background, paddingTop: 8 },

  centerArea: {
    width: '100%',
    alignItems: 'center',
  },

  centeredContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  svgWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },

  copyWrapper: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  copyText: {
    textAlign: 'center',
    color: AppColors.textMuted,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto', default: 'System' }),
    fontWeight: '500' as any,
    letterSpacing: 0.18,
  },

  // Reuse card styles similar to trips.tsx
  upcomingWrap: { width: '100%', alignItems: 'center' },
  upcomingLabel: { alignSelf: 'flex-start', marginBottom: 6, color: AppColors.text, fontWeight: '700' },

  // Ongoing summary styles
  ongoingWrap: {
    width: '100%',
    backgroundColor: AppColors.backgroundCard,
    borderRadius: 16,
    padding: 14,
    shadowColor: ShadowColors.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  ongoingHeader: { fontSize: 20, color: AppColors.text, fontWeight: '800' },
  ongoingDates: { marginTop: 2, color: AppColors.textTertiary, fontSize: 13 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  activityRowLabel: { fontWeight: '800', color: AppColors.text, marginRight: 6 },
  activityRowText: { flex: 1, color: AppColors.text },
  activityRowTime: { color: AppColors.textSecondary, marginLeft: 8 },
  viewDetailsBtn: {
    marginTop: 12,
    backgroundColor: AppColors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  currentActivityPreview: {
    marginTop: 12,
    padding: 10,
    backgroundColor: StateColors.successLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: StateColors.successBorder,
  },
  currentActivityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.success,
    marginBottom: 6,
  },
  currentActivityContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currentActivityImage: {
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: AppColors.borderLight,
  },
  currentActivityInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  currentActivityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 2,
  },
  currentActivityTime: {
    fontSize: 11,
    color: AppColors.success,
    fontWeight: '500',
    marginBottom: 2,
  },
  currentActivityDescription: {
    fontSize: 12,
    color: AdditionalColors.lightGray,
    lineHeight: 16,
  },

  // Next Activity Preview Styles
  nextActivityPreview: {
    marginTop: 12,
    padding: 10,
    backgroundColor: AppColors.backgroundSection,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  nextActivityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AdditionalColors.darkGray,
    marginBottom: 6,
  },
  nextActivityContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nextActivityImage: {
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: AppColors.borderLight,
  },
  nextActivityInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nextActivityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 2,
  },
  nextActivityTime: {
    fontSize: 11,
    color: AdditionalColors.darkGray,
    fontWeight: '500',
    marginBottom: 2,
  },
  nextActivityDescription: {
    fontSize: 12,
    color: AdditionalColors.lightGray,
    lineHeight: 16,
  },
});