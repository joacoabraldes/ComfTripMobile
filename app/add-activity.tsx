import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

export default function AddActivity() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = (params.mode as string) ?? 'add';
  const isEdit = mode === 'edit';
  const [title, setTitle] = React.useState((params.title as string) ?? '');
  const key = (params.key as string) ?? null;
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = React.useState(false);

  // Si quisieras precargar una imagen pasado por params, aquí podrías leerla.
  // Por ahora asumimos que la edición inicial sólo llega con title y key.

  const askCameraPermission = async () => {
    try {
      // Para la cámara
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status !== 'granted') {
        Alert.alert(
          'Permiso denegado',
          'Necesitamos permiso para acceder a la cámara para tomar la foto.'
        );
        return false;
      }

      // En algunos casos (iOS) también se necesita permiso para la librería si vas a guardar/usar imágenes,
      // pero para simplemente tomar y usar la foto no es obligatorio.
      return true;
    } catch (e) {
      console.warn('Error pidiendo permisos de cámara', e);
      return false;
    }
  };

  const takePhoto = async () => {
    const ok = await askCameraPermission();
    if (!ok) return;

    try {
      setLoadingPhoto(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      // SDK reciente retorna result.cancelled o result.assets
      let uri: string | undefined;
      // @ts-ignore
      if (result && (result as any).assets && (result as any).assets.length > 0) {
        // new format
        // @ts-ignore
        uri = (result as any).assets[0].uri;
      } else if ((result as any).uri) {
        // old format
        // @ts-ignore
        uri = (result as any).uri;
      }

      if (!result.canceled && uri) {
        setImageUri(uri);
      }
    } catch (e) {
      console.warn('Error tomando foto', e);
    } finally {
      setLoadingPhoto(false);
    }
  };

  const handleSave = async () => {
    try {
      if (isEdit && key) {
        // Guardamos título y (opcional) uri para que TripDetails lo lea al volver
        await AsyncStorage.setItem(
          'updatedActivity',
          JSON.stringify({ key, newTitle: title, imageUri: imageUri ?? null })
        );
      }
      // si no es modo edit podrías implementar la creación normal
      router.back();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la actividad.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{isEdit ? 'Editar actividad' : 'Nueva actividad'}</Text>

      <View style={{ height: 18 }} />

      <View style={styles.row}>
        <View style={styles.imageBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Sin foto</Text>
            </View>
          )}

          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} disabled={loadingPhoto}>
            <Text style={styles.photoBtnText}>{loadingPhoto ? 'Abrir cámara...' : 'Tomar foto'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ width: 12 }} />

        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Nombre de la actividad"
          />
        </View>
      </View>

      <View style={{ height: 24 }} />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Guardar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={{ color: '#fff' }}>Atrás</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFF' },
  header: { fontSize: 22, fontWeight: '800', marginTop: 40, textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },

  imageBox: {
    width: 120,
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#9E9E9E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  photoBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FF3951',
  },
  photoBtnText: { color: '#fff', fontWeight: '700' },

  label: { marginBottom: 8, fontWeight: '700' },
  input: { width: '100%', padding: 12, borderRadius: 8, backgroundColor: '#F5F5F5', fontSize: 16 },

  saveBtn: { width: '100%', backgroundColor: '#FF3951', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

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
