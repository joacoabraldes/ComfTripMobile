import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  useWindowDimensions,
  Text,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapSvg from '@/components/icons/MapSvg';
import PrimaryButton from '@/components/buttons/PrimaryButton';
import { ArrowIcon } from '@/components/icons/ArrowIcon';
import { Image } from 'expo-image';
import { apiGet } from '@/helpers/api';

type Trip = {
  id: number;
  destination: string;
  start_date: string;
  end_date: string;
  flag_url?: string | null;
  notes?: string | null;
  budget?: number | null;
  created_at?: string | null;
};

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
    latitude?: number | string;
    longitude?: number | string;
    latitud?: number | string;
    longitud?: number | string;
  };
};

function fmtDate(d?: string) {
  if (!d) return '';
  try {
    const onlyDate = d.includes('T') ? d.split('T')[0] : d;
    const [yy, mm, dd] = onlyDate.split('-');
    return `${dd}/${mm}/${yy}`;
  } catch {
    return d;
  }
}

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
  const topInset = insets?.top ?? 0;
  const router = useRouter();

  // Estimated tab bar height (adjust if your tab bar is taller)
  const TABBAR_HEIGHT = 64;

  // measurements
  const horizontalPadding = Math.round(Math.max(16, Math.min(32, width * 0.06)));
  const contentMaxWidth = Math.round(width - horizontalPadding * 2);
  const baseSvgWidth = 321;
  const baseSvgHeight = 251;
  const svgAspect = baseSvgHeight / baseSvgWidth;
  const btnWidth = Math.round(Math.max(240, Math.min(320, width * 0.83)));
  const btnHeight = Math.round(Math.max(44, Math.min(64, width * 0.13)));
  const btnRadius = 8;
  const ctaBottomBase = 20 + bottomInset + TABBAR_HEIGHT;
  const ctaBottom = ctaBottomBase + 20;

  const contentTop = topInset + 24;
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

  const copyFontSize = Math.round(Math.max(14, Math.min(20, width * 0.048)));
  const contentPaddingBottom = btnHeight + bottomInset + TABBAR_HEIGHT + 32;

  // New state for trips and activities
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [loadingTrips, setLoadingTrips] = useState<boolean>(true);
  const [upcomingTrip, setUpcomingTrip] = useState<Trip | null>(null);
  const [ongoingTrip, setOngoingTrip] = useState<Trip | null>(null);

  // Ongoing trip activities
  const [currentActivity, setCurrentActivity] = useState<Place | null>(null);
  const [nextActivity, setNextActivity] = useState<Place | null>(null);

  // load trips
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiGet('/trips');
        const data = res?.data ?? res;
        const list: Trip[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        if (!mounted) return;

        setTrips(list);
        // Determine ongoing and closest upcoming
        const now = new Date();

        const ongoing = list.filter(t => isUpcoming(t.start_date, t.end_date) === 1);
        const selectedOngoing = ongoing.length > 0
          ? ongoing.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())[0]
          : null;

        const upcoming = list.filter(t => isUpcoming(t.start_date, t.end_date) === 2);
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

  // Render helpers
  const renderUpcomingCard = (trip: Trip) => {
    const imageSource = trip.flag_url || 'https://placehold.co/76x76?text=%F0%9F%87%AB%F0%9F%87%B7';
    return (
      <View style={styles.upcomingWrap}>
        <Text style={styles.upcomingLabel}>Próximo Viaje:</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.card, { backgroundColor: '#F8F1EF' }]}
          onPress={() => {
            router.push({
              pathname: '../trip-details',
              params: {
                id: String(trip.id),
                destination: trip.destination,
                start_date: trip.start_date,
                end_date: trip.end_date,
                flag_url: trip.flag_url ?? '',
              },
            });
          }}
        >
          <Image
            source={imageSource}
            style={styles.flag}
            contentFit="cover"
          />
          <View style={styles.cardContent}>
            <Text style={styles.destination}>{trip.destination}</Text>
            <Text style={styles.dates}>{`${fmtDate(trip.start_date)} - ${fmtDate(trip.end_date)}`}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#FFD8D8' }]}>
            <Text style={[styles.badgeText, { color: '#333' }]}>Próximo</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderOngoingSummary = (trip: Trip) => {
    const currTitle = currentActivity?.location?.titulo;
    const nextTitle = nextActivity?.location?.titulo;
    const currTime = currentActivity ? `${currentActivity.start_hour ?? ''}${currentActivity.end_hour ? ` - ${currentActivity.end_hour}` : ''}` : '-';
    const nextTime = nextActivity ? `${nextActivity.start_hour ?? ''}${nextActivity.end_hour ? ` - ${nextActivity.end_hour}` : ''}` : '-';

    return (
      <View style={styles.ongoingWrap}>
        <Text style={styles.ongoingHeader}>{trip.destination}</Text>
        <Text style={styles.ongoingDates}>{`${fmtDate(trip.start_date)} - ${fmtDate(trip.end_date)}`}</Text>

        <View style={styles.activityRow}>
          <Text style={styles.activityRowLabel}>En curso:</Text>
          <Text style={styles.activityRowText}>{currTitle ?? '-'}</Text>
          <Text style={styles.activityRowTime}>{currTime}</Text>
        </View>

        <View style={styles.activityRow}>
          <Text style={styles.activityRowLabel}>Siguiente:</Text>
          <Text style={styles.activityRowText}>{nextTitle ?? '-'}</Text>
          <Text style={styles.activityRowTime}>{nextTime}</Text>
        </View>

        <TouchableOpacity
          style={styles.viewDetailsBtn}
          onPress={() => {
            router.push({
              pathname: '../trip-details',
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
          <Text style={{ color: '#fff', fontWeight: '700' }}>Ver detalles</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const showHeaderSection = (!!ongoingTrip || (!!upcomingTrip && !ongoingTrip)) && !loadingTrips;

  return (
    <SafeAreaView style={styles.safeArea}>
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
              <View style={{ width: '100%', marginBottom: 12 }}>
                {ongoingTrip ? renderOngoingSummary(ongoingTrip) : (upcomingTrip ? renderUpcomingCard(upcomingTrip) : null)}
              </View>
            )}



            {!showHeaderSection && (
              <>
                <View style={styles.svgWrapper}>
                  <MapSvg width={svgMaxWidth} height={svgMaxHeight} />
                </View>
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
                    No tienes ningún viaje activo actualmente{"\n"}
                    ¡Planea tu siguiente viaje!
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* PrimaryButton positioned above tab bar and raised by RAISE_UP */}
        <View style={[styles.buttonWrapper, { bottom: ctaBottom }]}>
          <PrimaryButton
            title="Nuevo Viaje"
            onPress={() => router.push('/add-trip')}
            height={btnHeight}
            borderRadius={btnRadius}
            rightIcon={<ArrowIcon color="#FFFFFF" />}
            style={{ width: btnWidth }}
            activeOpacity={0.95}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FCFCFC' },
  root: { flex: 1, backgroundColor: '#FCFCFC' },

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
    color: 'rgba(0,0,0,0.60)',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto', default: 'System' }),
    fontWeight: '500' as any,
    letterSpacing: 0.18,
  },

  buttonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // Reuse card styles similar to trips.tsx
  upcomingWrap: { width: '100%', alignItems: 'center' },
  upcomingLabel: { alignSelf: 'flex-start', marginBottom: 6, color: '#252525', fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  flag: {
    width: 76,
    height: 76,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#ddd',
  },
  cardContent: { flex: 1, justifyContent: 'center' },
  destination: { fontSize: 20, color: '#000', fontWeight: '600' },
  dates: { fontSize: 14, color: '#757575', marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  badgeText: { fontSize: 12, color: '#333', fontWeight: '700' },

  // Ongoing summary styles
  ongoingWrap: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  ongoingHeader: { fontSize: 22, color: '#000', fontWeight: '800' },
  ongoingDates: { marginTop: 4, color: '#757575' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  activityRowLabel: { fontWeight: '800', color: '#111', marginRight: 6 },
  activityRowText: { flex: 1, color: '#111' },
  activityRowTime: { color: '#777', marginLeft: 8 },
  viewDetailsBtn: {
    marginTop: 12,
    backgroundColor: '#FF3951',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
});