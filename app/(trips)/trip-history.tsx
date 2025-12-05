import { apiGet } from '@/helpers/api';
import { formatDateRange } from '@/helpers/dateUtils';
import { getTripStatus, getTripStatusValue, isTripCompleted } from '@/helpers/tripUtils';
import { useTranslation } from '@/i18n';
import { Trip } from '@/types';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import SecondaryLayout from '@/components/layouts/SecondaryLayout';
import { ShadowColors } from '@/constants/Colors';
import { useAppColors } from '@/hooks/useAppColors';
import ContextMenu from '@/components/ui/ContextMenu';
import SortTripsModal, { SortOption, SortOrder } from '@/components/modals/SortTripsModal';
import {useCommonStyles} from "@/constants/Styles";

export default function TripHistoryScreen() {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const { width } = useWindowDimensions();
  const router = useRouter();
    const CommonStyles = useCommonStyles();

  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSortModal, setShowSortModal] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const cardWidth = Math.min(340, Math.round(width - 40));

  // Helper to parse images from location imagenes field
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

  const fetchTrips = useCallback(async () => {
    setError(null);
    try {
      const res = await apiGet('/trips'); 
      const data = res?.data ?? res;
      const tripsData = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []) as Trip[];
      
      // Enrich trips with first place image (only if places are already included)
      const enrichedTrips = tripsData.map((trip) => {
        const places = trip.places || [];
        if (places.length > 0 && places[0]?.location?.imagenes) {
          const images = safeParseImages(places[0].location.imagenes);
          if (images.length > 0 && typeof images[0] === 'string') {
            return { ...trip, firstPlaceImage: images[0] };
          }
        }
        return trip;
      });
      
      setAllTrips(enrichedTrips);
    } catch (err: any) {
      console.error('Error fetching trips', err);
      setError(err?.message || t('tripHistory.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTrips();
  }, [fetchTrips]);

  // Filter only past trips
  const pastTrips = useMemo(() => {
    return allTrips.filter(trip => isTripCompleted(trip));
  }, [allTrips]);

  // Sort trips based on selected option
  const sortedTrips = useMemo(() => {
    const trips = [...pastTrips];
    
    trips.sort((a, b) => {
      let comparison = 0;
      
      if (sortOption === 'date') {
        const aDate = new Date(a.start_date || '').getTime();
        const bDate = new Date(b.start_date || '').getTime();
        comparison = aDate - bDate;
      } else if (sortOption === 'name') {
        const aName = (a.destination || '').toLowerCase();
        const bName = (b.destination || '').toLowerCase();
        comparison = aName.localeCompare(bName);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return trips;
  }, [pastTrips, sortOption, sortOrder]);

  const handleSortChange = (sort: SortOption, order: SortOrder) => {
    setSortOption(sort);
    setSortOrder(order);
    setShowSortModal(false);
  };

  const menuOptions = [
    {
      label: t('trips.sortTrips'),
      icon: 'swap-vertical-outline' as const,
      onPress: () => setShowSortModal(true),
    },
  ];

  const renderItem = ({ item }: { item: Trip }) => {
    const status = getTripStatus(item.start_date, item.end_date);
    const statusValue = getTripStatusValue(item.start_date, item.end_date);
    
    const bgColor = AppColors.backgroundTertiary;
    const accent = AppColors.textDisabled;
    const badgeTextColor = AppColors.text;
    
    const statusLabels: Record<'upcoming' | 'current' | 'past', string> = {
      upcoming: t('trips.status.upcoming'),
      current: t('trips.status.current'),
      past: t('trips.status.past'),
    };

    // Use first place image, fallback to flag_url, then placeholder
    const imageSource = (item as any).firstPlaceImage || item.flag_url || 'https://placehold.co/76x76?text=%F0%9F%87%AB%F0%9F%87%B7';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, { width: cardWidth, backgroundColor: bgColor }]}
        onPress={() => {
          router.push({
            pathname: '/(trips)/trip-history-details',
            params: {
              id: String(item.id),
              destination: item.destination,
              start_date: item.start_date,
              end_date: item.end_date,
              flag_url: item.flag_url ?? '',
            },
          });
        }}>
        <Image
          source={imageSource}
          style={styles.flag}
          contentFit="cover"
          placeholder={require("../../assets/images/icon.png")}
        />
        <View style={styles.cardContent}>
          <Text style={styles.destination}>{item.destination}</Text>
          <Text style={styles.dates}>{formatDateRange(item.start_date, item.end_date)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>{statusLabels[status]}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SecondaryLayout title={t('tripHistory.title')} rightActions={<ContextMenu options={menuOptions} />}>
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF3951" />
            <Text style={CommonStyles.loadingText}>{t('profile.loading')}</Text>
        </View>
      </SecondaryLayout>
    );
  }

  if (error) {
    return (
      <SecondaryLayout title={t('tripHistory.title')} rightActions={<ContextMenu options={menuOptions} />}>
        <View style={styles.center}>
          <Text style={{ color: AppColors.error, marginBottom: 8 }}>{t('common.error')}: {error}</Text>
          <TouchableOpacity onPress={fetchTrips} style={styles.retryBtn}>
            <Text style={{ color: AppColors.white }}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SecondaryLayout>
    );
  }

  return (
    <SecondaryLayout title={t('tripHistory.title')} rightActions={<ContextMenu options={menuOptions} />}>
      <View style={styles.screen}>
        <FlatList
          data={sortedTrips}
          keyExtractor={(trip) => String(trip.id)}
          renderItem={renderItem}
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: AppColors.textSecondary }}>{t('tripHistory.empty')}</Text>
            </View>
          }
        />
      </View>

      <SortTripsModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        currentSort={sortOption}
        currentOrder={sortOrder}
        onSortChange={handleSortChange}
      />
    </SecondaryLayout>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  screen: { flex: 1, width: '100%', backgroundColor: AppColors.background, paddingTop: 8, alignItems: 'center', position: 'relative', overflow: 'visible' },
  list: { paddingVertical: 16, alignItems: 'center', paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: AppColors.backgroundCard,
    shadowColor: ShadowColors.black,
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
    backgroundColor: AppColors.borderLight,
  },
  cardContent: { flex: 1, justifyContent: 'center' },
  destination: { fontSize: 20, color: AppColors.text, fontWeight: '600' },
  dates: { fontSize: 14, color: AppColors.textTertiary, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  badgeText: { fontSize: 12, color: AppColors.text, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
});

