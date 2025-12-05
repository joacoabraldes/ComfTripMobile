import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Trip } from '@/types';
import { formatDateRange } from '@/helpers/dateUtils';
import { getTripStatus, getTripStatusValue } from '@/helpers/tripUtils';
import { useAppColors } from '@/hooks/useAppColors';
import { ShadowColors } from '@/constants/Colors';

interface TripCardProps {
  trip: Trip;
  width: number;
  onPress?: (trip: Trip) => void;
  destinationPath?: '/(trips)/trip-details' | '/(trips)/trip-history-details';
  t: (key: string) => string;
}

/**
 * Reusable component for displaying a trip card
 * Used in trips.tsx and trip-history.tsx
 */
export default function TripCard({ trip, width, onPress, destinationPath, t }: TripCardProps) {
  const router = useRouter();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);

  const status = getTripStatus(trip.start_date, trip.end_date);
  const statusValue = getTripStatusValue(trip.start_date, trip.end_date);

  const bgColor = statusValue === 2 ? AppColors.accentCard : (statusValue === 1 ? AppColors.backgroundPrimary : AppColors.backgroundTertiary);
  const accent = statusValue === 2 ? AppColors.accent : (statusValue === 1 ? AppColors.primary : AppColors.textDisabled);
  const badgeTextColor = statusValue === 1 ? AppColors.white : AppColors.text;

  const statusLabels: Record<'upcoming' | 'current' | 'past', string> = {
    upcoming: t('trips.status.upcoming'),
    current: t('trips.status.current'),
    past: t('trips.status.past'),
  };

  // Use first place image, fallback to flag_url
  const imageSource = (trip as any).firstPlaceImage || trip.flag_url;
  const hasImage = !!imageSource;
  // Extract city name from destination (e.g., "Madrid, Spain" -> "Madrid")
  const cityName = trip.destination ? trip.destination.split(',')[0].trim() : '';

  const handlePress = () => {
    if (onPress) {
      onPress(trip);
    } else if (destinationPath) {
      router.push({
        pathname: destinationPath,
        params: {
          id: String(trip.id),
          destination: trip.destination,
          start_date: trip.start_date,
          end_date: trip.end_date,
          flag_url: trip.flag_url ?? '',
        },
      });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { width, backgroundColor: bgColor }]}
      onPress={handlePress}
    >
      {hasImage ? (
        <Image
          source={imageSource}
          style={styles.flag}
          contentFit="cover"
          placeholder={require("../../assets/images/icon.png")}
        />
      ) : (
        <View style={[styles.flag, styles.flagPlaceholder]}>
          <Text style={styles.flagPlaceholderText} numberOfLines={2}>
            {cityName}
          </Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.destination}>{trip.destination}</Text>
        <Text style={styles.dates}>{formatDateRange(trip.start_date, trip.end_date)}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: accent }]}>
        <Text style={[styles.badgeText, { color: badgeTextColor }]}>{statusLabels[status]}</Text>
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: AppColors.backgroundCard,
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
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  destination: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 4,
  },
  dates: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

