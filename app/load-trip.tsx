import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { apiPost } from '@/helpers/api';

export default function LoadTrip() {
  const router = useRouter();
  const { payload } = useLocalSearchParams() as { payload?: string };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const TIMEOUT = 10000; // ms
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      if (mounted) {
        setError('No pudimos armar tu viaje, inténtalo más tarde');
        setLoading(false);
      }
    }, TIMEOUT);

    (async () => {
      try {
        const parsed = payload ? JSON.parse(decodeURIComponent(payload)) : null;
        // Si no hay payload, informar error
        if (!parsed) throw new Error('Payload inválido');

        const resp = await apiPost('/trips', parsed);
        if (!mounted) return;
        if (timedOut) return; // si ya tiró timeout, ignorar respuesta tardía
        clearTimeout(timeoutId);

        // En caso de éxito navegar a trips (reemplaza la pantalla de carga)
        router.replace('/trips');
      } catch (err) {
        if (!mounted) return;
        clearTimeout(timeoutId);
        console.error('Error creando viaje:', err);
        setError('No pudimos armar tu viaje, inténtalo más tarde');
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [payload, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {loading && !error && (
        <>
          <Text style={styles.text}>Estamos calculando los mejores lugares para visitar en tu viaje</Text>
          <Image source={require('../assets/images/loading.gif')} style={styles.loadingImage} />
          {/* <ActivityIndicator size="large" color="#FF3951" style={{ marginTop: 20 }} /> */}
        </>
      )}

      {error && (
        <>
          <Text style={styles.textError}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.push('/add-trip')}>
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // Center vertically
    alignItems: 'center', // Center horizontally
    backgroundColor: 'white',
    padding: 20,
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingImage: {
    width: 100,
    height: 100,
  },
  textError: {
    fontSize: 16,
    color: '#c0392b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF3951',
    padding: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});