import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppColors } from '@/hooks/useAppColors';
import { Activity } from '@/types';
import { safeParseImages } from '@/helpers/imageUtils';

interface ActivityCardProps {
  activity: Activity;
  place?: any; // Raw place object from backend (optional, for image extraction)
  onEdit?: (activity: Activity) => void;
  showEditButton?: boolean;
}

/**
 * Reusable component for displaying an activity/place card in trip itinerary
 * Handles image extraction from backend place object (same logic as home.tsx)
 */
export default function ActivityCard({ activity, place, onEdit, showEditButton = false }: ActivityCardProps) {
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);

  // Extract image using same logic as home.tsx: try imagenes[0] first, then parse if needed
  let imageUri: string | null = null;
  if (place?.location) {
    const imagenes = place.location.imagenes;
    if (imagenes) {
      // If it's already an array, use first element
      if (Array.isArray(imagenes) && imagenes.length > 0) {
        imageUri = typeof imagenes[0] === 'string' ? imagenes[0] : (imagenes[0]?.url ?? imagenes[0]?.src ?? imagenes[0]?.image ?? null);
      } else {
        // Otherwise, parse it (handles JSON strings, objects, etc.)
        const parsed = safeParseImages(imagenes);
        imageUri = parsed.length > 0 ? parsed[0] : null;
      }
    } else if (place.location.images) {
      // Fallback to 'images' field (normalized from location.controller)
      const parsed = safeParseImages(place.location.images);
      imageUri = parsed.length > 0 ? parsed[0] : null;
    }
  }
  
  // Final fallback to activity.img
  if (!imageUri && activity.img) {
    imageUri = activity.img;
  }

  return (
    <View style={styles.activityCard}>
      {imageUri ? (
        <Image source={imageUri} style={styles.activityImage} contentFit="cover" />
      ) : (
        <View style={[styles.activityImage, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText} numberOfLines={2}>
            {activity.title}
          </Text>
        </View>
      )}

      <View style={styles.activityContent}>
        <Text style={styles.activityTitle} numberOfLines={2}>
          {activity.title}
        </Text>
        <Text style={styles.activityDate}>{activity.dateStr}</Text>
      </View>

      {showEditButton && onEdit && (
        <TouchableOpacity style={styles.pencil} onPress={() => onEdit(activity)}>
          <MaterialIcons name="edit" size={20} color={AppColors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  activityCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: AppColors.backgroundTertiary,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  activityImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
  },
  imagePlaceholder: {
    backgroundColor: AppColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  placeholderText: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  activityContent: {
    flex: 1,
    flexShrink: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
  },
  activityDate: {
    marginTop: 4,
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  pencil: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

