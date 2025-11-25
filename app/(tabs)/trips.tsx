import { apiGet } from '@/helpers/api';
import { formatDateRange } from '@/helpers/dateUtils';
import { sortTripsByStatus, getTripStatus, getTripStatusValue } from '@/helpers/tripUtils';
import { useTranslation } from '@/i18n';
import { Trip } from '@/types';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TripsScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cardWidth = Math.min(340, Math.round(width - 40));

  const fetchTrips = useCallback(async () => {
    setError(null);
    try {
      const res = await apiGet('/trips'); 
      const data = res?.data ?? res;
      const tripsData = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []) as Trip[];
      
      // Sort trips by status: upcoming > current > past
      const sortedTrips = sortTripsByStatus(tripsData);
      setTrips(sortedTrips);
    } catch (err: any) {
      console.error('Error fetching trips', err);
      setError(err?.message || t('trips.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTrips();
  }, [fetchTrips]);


  const renderItem = ({ item }: { item: Trip }) => {
    const status = getTripStatus(item.start_date, item.end_date);
    const statusValue = getTripStatusValue(item.start_date, item.end_date);
    
    const bgColor = statusValue === 2 ? '#F8F1EF' : (statusValue === 1 ? '#FFFFFF' : '#F1F1F1');
    const accent = statusValue === 2 ? '#FFD8D8' : (statusValue === 1 ? '#FF3951' : '#CACACA');
    const badgeTextColor = statusValue === 1 ? '#FFFFFF' : '#333';
    
    const statusLabels: Record<'upcoming' | 'current' | 'past', string> = {
      upcoming: t('trips.status.upcoming'),
      current: t('trips.status.current'),
      past: t('trips.status.past'),
    };

    // Try to guess a fallback flag image: if trip has flag_url use it, else placeholder
    const imageSource = item.flag_url || 'https://placehold.co/76x76?text=%F0%9F%87%AB%F0%9F%87%B7'; // small flag placeholder

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, { width: cardWidth, backgroundColor: bgColor }]}
        onPress={() => {
          // Navegar a detalles pasando los campos importantes como params
          router.push({
            pathname: '../trip-details',
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
      <View style={styles.screen}>
        <Text style={{ marginTop: 40 }}>{t('trips.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#B00020', marginBottom: 8 }}>{t('common.error')}: {error}</Text>
        <TouchableOpacity onPress={fetchTrips} style={styles.retryBtn}>
          <Text style={{ color: '#fff' }}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === 'android' ? 8 : 0 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('trips.title')}</Text>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(trip) => String(trip.id)}
        renderItem={renderItem}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: '#777' }}>{t('trips.empty')}</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: (Platform.OS === 'android' ? 100 : 125) + insets.bottom },
        ]}
        onPress={() => router.push('/add-trip')}
        accessibilityLabel={t('trips.addTrip')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', backgroundColor: '#FCFCFC', paddingTop: Platform.OS === 'android' ? 8 : 0, alignItems: 'center', position: 'relative', overflow: 'visible' },
  header: { width: '100%', alignItems: 'center', marginTop: 28, marginBottom: 6 },
  title: { color: '#252525', fontSize: 30, fontWeight: '800' },

  list: { paddingVertical: 16, alignItems: 'center', paddingBottom: 140 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    // shadow
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

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryBtn: {
    backgroundColor: '#FF3951',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    right: 30,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF3951',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 9999,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34, fontWeight: '600' },
});
