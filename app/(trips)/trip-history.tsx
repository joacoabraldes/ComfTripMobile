import { apiGet } from '@/helpers/api';
import { isTripCompleted, sortTripsByOption, getTripFirstPlaceImage, SortOption, SortOrder } from '@/helpers/tripUtils';
import TripCard from '@/components/trip/TripCard';
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
import SortTripsModal from '@/components/modals/SortTripsModal';
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
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const cardWidth = Math.min(340, Math.round(width - 40));

  const fetchTrips = useCallback(async () => {
    setError(null);
    try {
      const res = await apiGet('/trips'); 
      const data = res?.data ?? res;
      const tripsData = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []) as Trip[];
      
      // Enrich trips with first place image (only if places are already included)
      const enrichedTrips = tripsData.map((trip) => {
        const firstPlaceImage = getTripFirstPlaceImage(trip);
        return firstPlaceImage ? { ...trip, firstPlaceImage } : trip;
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
    return sortTripsByOption(pastTrips, sortOption, sortOrder);
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
    return (
      <TripCard
        trip={item}
        width={cardWidth}
        destinationPath="/(trips)/trip-history-details"
        t={t}
      />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
});

