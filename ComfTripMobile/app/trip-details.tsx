import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

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
  dateStr: string;
};

const HARD_CODED_ACTIVITIES = [
  { title: 'Sagrada Familia', img: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/%CE%A3%CE%B1%CE%B3%CF%81%CE%AC%CE%B4%CE%B1_%CE%A6%CE%B1%CE%BC%CE%AF%CE%BB%CE%B9%CE%B1_2941_%28cropped%29.jpg' },
  { title: 'Parque Guell', img: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/G%C3%BCell_BCN_edited.jpg' },
  { title: 'Monasterio Montserrat', img: 'https://www.historyhit.com/app/uploads/2021/06/Montserrat-Monastery_shutterstock.jpg' },
  { title: 'Costa Brava', img: 'https://nuriainwonderland.com/wp-content/uploads/cala-sa-tuna-begur.jpg' },
  { title: 'Torre Glòries', img: 'https://www.merlinproperties.com/wp-content/uploads/2023/06/22062023-2F8A0006-Torre-Glories-Barcelona-7-scaled.jpg' },
  { title: 'Casa Batlló', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTemwZhndBqu_royqmPrHbAjUtL0zXiWGlrdQ&s' },
  { title: 'Casa Milà', img: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Casa_Mil%C3%A0%2C_general_view.jpg' },
  { title: 'Plaza Cataluña', img: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/14/ca/ee/ab/fb-img-1537875790852.jpg?w=900&h=500&s=1' },
  { title: 'La Rambla', img: 'https://www.barcelo.com/guia-turismo/wp-content/uploads/2019/05/la-rambla.jpg' },
  { title: 'Barrio Gótico', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSd7z_ViClK7GTon2DWc-4UJJcvCR1YTxlWMA&s' },
  { title: 'Montjuïc', img: 'https://www.barcelona-tourist-guide.com/images/int/attractions/mnac/L550/mnac-barcelona-0809.jpg' },
  { title: 'Camp Nou', img: 'https://www.fcbarcelona.com/photo-resources/2021/08/09/276ad270-e5c6-453d-8d9f-212417ad7cb3/Camp-Nou-3.jpg?width=1200&height=750' },
  { title: 'Paseo de Gracia', img: 'https://bcnmagica.com/imagenes/passeig-de-gracia.jpg' },
  { title: 'Playa de la Barceloneta', img: 'https://www.santjordihostels.com/wp-content/uploads/Barceloneta-8.jpg' },
  { title: 'Parque de la Ciutadella', img: 'https://www.locabarcelona.com/wp-content/uploads/2024/10/Parque-de-la-ciudadela-Barcelona.jpg' },
];

function parseDateSafe(s?: string) {
  if (!s) return new Date();
  const d = new Date(s);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

function daysBetweenInclusive(start: Date, end: Date) {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : 0;
}

export default function TripDetails() {
  const router = useRouter();
  const params = useLocalSearchParams() as Params;

  const destination = params.destination ?? 'Destino';
  const startDate = parseDateSafe(params.start_date);
  const endDate = parseDateSafe(params.end_date);

  const dateRangeStr = `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;

  const createActivities = (): Activity[] => {
    const days = daysBetweenInclusive(startDate, endDate);
    const arr: Activity[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const activity = HARD_CODED_ACTIVITIES[i % HARD_CODED_ACTIVITIES.length];
      arr.push({
        key: `${i}`,
        title: activity.title,
        img: activity.img,
        dateStr: d.toLocaleDateString('es-ES'),
      });
    }
    return arr;
  };

  const [activities, setActivities] = useState<Activity[]>(() => createActivities());

  useEffect(() => {
    setActivities(createActivities());
  }, [params.start_date, params.end_date]);

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      const checkUpdates = async () => {
        try {
          const raw = await AsyncStorage.getItem('updatedActivity');
          if (!raw) return;
          const parsed = JSON.parse(raw) as { key: string; newTitle?: string; imageUri?: string } | null;
          if (!parsed) return;
          if (!mounted) return;

          setActivities((prev) =>
            prev.map((a) =>
              a.key === parsed.key
                ? {
                    ...a,
                    title: parsed.newTitle ?? a.title,
                    // Si viene imageUri la usamos; si no, dejamos null para mostrar fondo gris
                    img: parsed.imageUri !== undefined ? parsed.imageUri : null,
                  }
                : a
            )
          );

          await AsyncStorage.removeItem('updatedActivity');
        } catch (e) {
          // no hacemos nada en caso de error
        }
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{destination}</Text>
          <Text style={styles.subtitle}>{dateRangeStr}</Text>
        </View>

        <Text style={styles.sectionTitle}>Itinerario</Text>

        <View style={{ height: 8 }} />

        {activities.map((a) => (
          <View key={a.key} style={styles.activityCard}>
            {a.img ? (
              <Image source={a.img} style={styles.activityImage} contentFit="cover" />
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
        ))}


        <View style={{ height: 40 }} />
      </ScrollView>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={{ color: '#fff' }}>Atrás</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFCFC' },
  scroll: { paddingHorizontal: 20, paddingTop: 28, alignItems: 'center' },
  header: { width: '100%', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '800', color: '#000', paddingTop: 60 },
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

  backBtn: {
    position: 'absolute',
    left: 18,
    top: 36,
    backgroundColor: '#FF3951',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 6,
  },
});
