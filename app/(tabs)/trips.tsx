import { apiGet } from '@/helpers/api';
import { sortTripsByStatus, isTripCompleted, sortTripsByOption, getTripFirstPlaceImage, SortOption, SortOrder } from '@/helpers/tripUtils';
import TripCard from '@/components/trip/TripCard';
import { useTranslation } from '@/i18n';
import { Trip } from '@/types';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
    ActivityIndicator,
    FlatList, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrimaryLayout from '@/components/layouts/PrimaryLayout';
import { Ionicons } from '@expo/vector-icons';
import { ShadowColors } from '@/constants/Colors';
import FloatingActionButton from '@/components/buttons/FloatingActionButton';
import ContextMenu from '@/components/ui/ContextMenu';
import SortTripsModal from '@/components/modals/SortTripsModal';
import { useAppColors } from '@/hooks/useAppColors';
import {useCommonStyles} from "@/constants/Styles";

export default function TripsScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const AppColors = useAppColors();
    const CommonStyles = useCommonStyles();

  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSortModal, setShowSortModal] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Generate dynamic styles
  const styles = getStyles(AppColors);

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
      
      // Sort trips by status: upcoming > current > past
      const sortedTrips = sortTripsByStatus(enrichedTrips);
      setAllTrips(sortedTrips);
    } catch (err: any) {
      console.error('Error fetching trips', err);
      setError(err?.message || t('trips.failedToLoad'));
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

  // Filter only current and upcoming trips
  const currentAndUpcomingTrips = useMemo(() => {
    return allTrips.filter(trip => !isTripCompleted(trip));
  }, [allTrips]);

  // Sort trips based on selected option
  const sortedTrips = useMemo(() => {
    return sortTripsByOption(currentAndUpcomingTrips, sortOption, sortOrder);
  }, [currentAndUpcomingTrips, sortOption, sortOrder]);

  const handleSortChange = (sort: SortOption, order: SortOrder) => {
    setSortOption(sort);
    setSortOrder(order);
    setShowSortModal(false);
  };

  const menuOptions = [
    {
      label: t('trips.viewHistory'),
      icon: 'time-outline' as const,
      onPress: () => router.push('../(trips)/trip-history'),
    },
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
        destinationPath="/(trips)/trip-details"
        t={t}
      />
    );
  };

  if (loading) {
    return (
      <PrimaryLayout title={t('trips.title')}>
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF3951" />
          <Text style={CommonStyles.loadingText}>{t('trips.loading')}</Text>
        </View>
      </PrimaryLayout>
    );
  }

  if (error) {
    return (
      <PrimaryLayout title={t('trips.title')}>
        <View style={styles.center}>
          <Text style={{ color: AppColors.error, marginBottom: 8 }}>{t('common.error')}: {error}</Text>
          <TouchableOpacity onPress={fetchTrips} style={styles.retryBtn}>
            <Text style={{ color: AppColors.white }}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </PrimaryLayout>
    );
  }

  return (
    <PrimaryLayout 
      title={t('trips.title')}
      rightActions={<ContextMenu options={menuOptions} />}
    >
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
            <Text style={{ color: AppColors.textSecondary }}>{t('trips.empty')}</Text>
          </View>
        }
      />

        <FloatingActionButton
          onPress={() => router.push('/(trips)/add-trip')}
          accessibilityLabel={t('trips.addTrip')}
          bottom={(Platform.OS === 'android' ? 100 : 125) + insets.bottom}
          right={20}
        />
      </View>

      <SortTripsModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        currentSort={sortOption}
        currentOrder={sortOrder}
        onSortChange={handleSortChange}
      />
    </PrimaryLayout>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  screen: { flex: 1, width: '100%', backgroundColor: AppColors.background, paddingTop: 8, alignItems: 'center', position: 'relative', overflow: 'visible' },

  list: { paddingVertical: 16, alignItems: 'center', paddingBottom: 140 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: AppColors.backgroundCard,
    // shadow
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
  flagPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  flagPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textSecondary,
    textAlign: 'center',
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