import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { apiPost } from '@/helpers/api';
import { useTranslation } from '@/i18n';
import { useAppColors } from '@/hooks/useAppColors';

export default function LoadTrip() {
  const router = useRouter();
  const { payload } = useLocalSearchParams() as { payload?: string };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);

  useEffect(() => {
    let mounted = true;
    const TIMEOUT = 10000; // ms
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      if (mounted) {
        setError(t('loadTrip.error'));
        setLoading(false);
      }
    }, TIMEOUT);

    (async () => {
      try {
        const parsed = payload ? JSON.parse(decodeURIComponent(payload)) : null;
        // Si no hay payload, informar error
        if (!parsed) throw new Error(t('loadTrip.invalidPayload'));

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
        setError(t('loadTrip.error'));
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
          <Text style={styles.text}>{t('loadTrip.calculating')}</Text>
          <Image source={require('../../assets/images/loading.gif')} style={styles.loadingImage} />
        </>
      )}

      {error && (
        <>
          <Text style={styles.textError}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.push('/(trips)/add-trip')}>
            <Text style={styles.retryButtonText}>{t('loadTrip.back')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // Center vertically
    alignItems: 'center', // Center horizontally
    backgroundColor: AppColors.backgroundPrimary,
    padding: 20,
  },
  text: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingImage: {
    width: 100,
    height: 100,
  },
  textError: {
    fontSize: 16,
    color: AppColors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: AppColors.primary,
    padding: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: AppColors.white,
    fontSize: 16,
  },
});