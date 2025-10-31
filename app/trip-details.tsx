import { apiDelete, apiGet } from '@/helpers/api';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import { CommonStyles } from '@/constants/Styles';

type Params = {
  id?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  flag_url?: string;
};

type Activity = {
  key: string;
  title: string;
  img?: string | null;
  dateStr: string; // formatted date + time for display
  sortTs?: number; // for sorting
};

// Web-like formatters
function fmtDate(d?: string) {
  if (!d) return '-';
  const onlyDate = d.includes('T') ? d.split('T')[0] : d;
  const parts = onlyDate.split('-');
  if (parts.length !== 3) return d;
  const [yy, mm, dd] = parts;
  return `${dd}/${mm}/${yy}`;
}

function fmtHour(t?: string) {
  if (!t) return '-';
  const parts = t.split(':');
  const [hh, mm] = parts;
  return `${hh}:${mm ?? '00'}`;
}

// Helpers for header date range
function parseDateSafe(s?: string) {
  if (!s) return new Date();
  const d = new Date(s);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

export default function TripDetails() {
  const router = useRouter();
  const params = useLocalSearchParams() as Params;

  // Header uses params (as in trips.tsx navigation)
  const destination = params.destination ?? 'Destino';
  const startDate = parseDateSafe(params.start_date);
  const endDate = parseDateSafe(params.end_date);
  const dateRangeStr = `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<boolean>(false);

  // Fetch trip and derive activities from trip.places (web parity)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const id = params.id ? Number(params.id) : NaN;
      if (!Number.isFinite(id) || id <= 0) {
        setError('ID de viaje inválido.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet(`/trips/${id}`);
        const data = res?.data ?? res;

        // Expecting trip object with places array, like the web
        const places: any[] = Array.isArray(data?.places) ? data.places : Array.isArray(data?.data?.places) ? data.data.places : [];

        const mapped: Activity[] = (places || []).map((p: any, idx: number) => {
          const loc = p.location || {};
          const title = loc?.titulo ?? `Lugar #${p.fk_location ?? p.id ?? idx + 1}`;
          const firstImg = Array.isArray(loc?.imagenes) && loc.imagenes.length > 0 ? loc.imagenes[0] : null;

          // Build sortable timestamp from date + start_hour
          let ts = Number.NaN;
          if (p.date) {
            const base = (typeof p.date === 'string' && p.date.includes('T')) ? p.date : `${p.date}T00:00:00`;
            const start = p.start_hour ? `${base.split('T')[0]}T${p.start_hour}:00` : base;
            const d = new Date(start);
            ts = d.getTime();
          }

          const dateStr = `${fmtDate(p.date)} ${fmtHour(p.start_hour)}${p.end_hour ? ` - ${fmtHour(p.end_hour)}` : ''}`.trim();

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

        if (mounted) setActivities(sorted);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'No se pudo cargar el viaje.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [params.id]);

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
    const id = params.id ? Number(params.id) : NaN;
    if (!Number.isFinite(id) || id <= 0) {
      Alert.alert('Error', 'ID de viaje inválido.');
      return;
    }

    Alert.alert(
      'Eliminar viaje',
      '¿Seguro querés eliminar este viaje? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (deleting) return;
            setDeleting(true);
            try {
              await apiDelete(`/trips/${id}`);
              Alert.alert('Eliminado', 'El viaje fue eliminado correctamente.');
              router.back();
            } catch (e: any) {
              const msg = e?.message || 'No se pudo eliminar el viaje.';
              Alert.alert('Error', msg);
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
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
        </View>

        <Text style={styles.sectionTitle}>Itinerario</Text>

        <View style={{ height: 8 }} />

        {loading ? (
          <View style={{ width: '100%', alignItems: 'center', paddingVertical: 20 }}>
            <ActivityIndicator size="small" color="#FF3951" />
            <Text style={{ marginTop: 8, color: '#777' }}>Cargando actividades...</Text>
          </View>
        ) : error ? (
          <View style={{ width: '100%', alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: '#B00020' }}>{error}</Text>
          </View>
        ) : activities.length === 0 ? (
          <View style={{ width: '100%', alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: '#777' }}>Aún no hay puntos en el itinerario.</Text>
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
      <TouchableOpacity
        style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
        onPress={confirmAndDelete}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel="Eliminar viaje"
      >
        <MaterialIcons name="delete-outline" size={22} color="#2d2d2dff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFCFC' },
  scroll: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 80 : 60, alignItems: 'center' },
  header: { width: '100%', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '800', color: '#000' },
  subtitle: { marginTop: 8, fontSize: 16, color: '#757575' },

  sectionTitle: { alignSelf: 'flex-start', fontSize: 22, fontWeight: '800', marginTop: 6, color: '#111' },

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
    position: 'absolute',
    right: 18,
    top: 36,
    backgroundColor: '#edededff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 6,
  },
});