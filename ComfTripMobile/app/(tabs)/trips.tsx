import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { apiGet } from '@/helpers/api'; // assumes you have apiGet similar to apiPost
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Trip = {
  id: number;
  destination: string; // e.g. "Lima, Peru"
  start_date: string; // ISO date
  end_date: string; // ISO date
  flag_url?: string | null; // optional URL for the flag or image
  notes?: string | null;
  budget?: number | null;
  created_at?: string | null;
};

export default function TripsScreen() {
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
      if (Array.isArray(data)) {
        setTrips(data);
      } else {
        // if the endpoint returns an object { data: [...] }
        setTrips(Array.isArray(data?.data) ? data.data : []);
      }
    } catch (err: any) {
      console.error('Error fetching trips', err);
      setError((err && err.message) || 'Failed to load trips');
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

  const renderDateRange = (start?: string, end?: string) => {
    if (!start || !end) return '';
    try {
      const s = new Date(start);
      const e = new Date(end);
      const sStr = s.toLocaleDateString();
      const eStr = e.toLocaleDateString();
      return `${sStr} - ${eStr}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  const isUpcoming = (start?: string, end?: string) => {
    if (!start) return -1;
    if (!end) return -1;
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);
    if (s > now) return 2; // proximo
    if (s <= now && e >= now) return 1; // actual
    return 0; // pasado
  };

  const renderItem = ({ item }: { item: Trip }) => {
    const upcoming = isUpcoming(item.start_date, item.end_date);
    const bgColor = upcoming == 2 ? '#F8F1EF' : (upcoming == 1 ? '#FFFFFF' : '#F1F1F1');
    const accent = upcoming == 2 ? '#FFD8D8' : (upcoming == 1 ? '#FF3951' : '#CACACA');
    const badgeTextColor = upcoming == 1 ? '#FFFFFF' : '#333';

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
          placeholder={require("../../assets/images/icon.png")} // optional local placeholder if you have one
        />
        <View style={styles.cardContent}>
          <Text style={styles.destination}>{item.destination}</Text>
          <Text style={styles.dates}>{renderDateRange(item.start_date, item.end_date)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>{upcoming == 2 ? 'Próximo' : (upcoming == 1 ? 'Actual' : 'Pasado')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={{ marginTop: 40 }}>Cargando viajes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#B00020', marginBottom: 8 }}>Error: {error}</Text>
        <TouchableOpacity onPress={fetchTrips} style={styles.retryBtn}>
          <Text style={{ color: '#fff' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === 'android' ? 8 : 0 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Viajes</Text>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(t) => String(t.id)}
        renderItem={renderItem}
        // IMPORTANT: que el FlatList llene el contenedor y tenga ancho 100%
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: '#777' }}>No hay viajes registrados.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[
          styles.fab,
          // ajustar bottom con safe area (evita quedar debajo de la barra de navegación)
          { bottom: (Platform.OS === 'android' ? 100 : 125) + insets.bottom },
        ]}
        onPress={() => router.push('/add-trip')}
        accessibilityLabel="Agregar viaje"
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
    // bottom se ajusta dinámicamente con insets
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF3951',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 14, // Android
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 9999, // iOS
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34, fontWeight: '600' },
});
