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

        // Save flight if it was selected (same logic as web version)
        // The response structure is: { data: { trip: { id: ... }, places: [...] } }
        const tripId = resp?.data?.trip?.id;
        if (parsed.selectedFlight && tripId) {
          try {
            let canonicalFlightId = null;
            
            // Handle both old format (string) and new format (object with flight_id and raw)
            if (typeof parsed.selectedFlight === 'string') {
              canonicalFlightId = parsed.selectedFlight;
            } else if (parsed.selectedFlight.flight_id) {
              // If flight_id is already constructed, use it
              canonicalFlightId = parsed.selectedFlight.flight_id;
            } else {
              // Fallback: construct it from the flight object (same logic as web version)
              const sel = parsed.selectedFlight;
              const datePart = parsed.start_date || '';
              
              const metaCode = sel?.meta?.flightCode;
              if (metaCode && String(metaCode).trim()) {
                // Clean the flight code: remove spaces and convert to uppercase (same as web version)
                const clean = String(metaCode)
                  .replace(/\s+/g, '')
                  .toUpperCase();
                canonicalFlightId = datePart ? `${clean}|${datePart}` : clean;
              } else if (sel?.id) {
                canonicalFlightId = sel.id;
              } else if (sel?.raw?.id) {
                canonicalFlightId = sel.raw.id;
              }
            }
            
            const flightRaw = typeof parsed.selectedFlight === 'object' 
              ? parsed.selectedFlight.raw 
              : null;

            if (canonicalFlightId) {
              console.log('Saving flight:', canonicalFlightId, 'for trip:', tripId);
              await apiPost('/flights', {
                flight_id: canonicalFlightId,
                trip_id: tripId,
                // Note: raw field is not supported by backend currently (was reverted)
                // raw: flightRaw,
              });
              console.log('Flight saved successfully');
            } else {
              console.warn('Could not construct valid flight_id from selectedFlight');
            }
          } catch (flightErr: any) {
            console.error('Error saving flight:', flightErr);
            // Log the error details for debugging
            if (flightErr?.message) {
              console.error('Flight error message:', flightErr.message);
            }
            // Continue even if flight save fails (same as web version)
          }
        } else {
          if (parsed.selectedFlight) {
            console.warn('Flight selected but trip ID not found. Response:', resp);
          }
        }

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