import React from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from '@/i18n';
import { useAppColors } from '@/hooks/useAppColors';
import { useRouter } from 'expo-router';

type Location = {
  id: number;
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  imagenes?: any;
  images?: any;
  latitude?: number | string;
  longitude?: number | string;
  city?: string;
  country?: string;
};

type Experience = {
  id: number;
  title: string;
  description: string;
  category: string | number | null;
  image: string | null;
  raw: Location;
};

interface LocationDetailModalProps {
  visible: boolean;
  experience: Experience | null;
  onClose: () => void;
}

export default function LocationDetailModal({ visible, experience, onClose }: LocationDetailModalProps) {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const router = useRouter();
  const styles = getStyles(AppColors);

  // Get full description from raw location (not truncated)
  const fullDescription = experience?.raw?.descripcion ?? experience?.raw?.description ?? '';

  const handleCreateTrip = () => {
    onClose();
    // Extract city from location, fallback to title if no city
    const city = experience?.raw?.city;
    const country = experience?.raw?.country;
    const destination = city && country 
      ? `${city}, ${country}` 
      : city || experience?.title || '';
    
    // Navigate to add-trip with destination pre-selected (city name)
    router.push({
      pathname: '/(trips)/add-trip',
      params: { destination },
    });
  };

  if (!experience) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {experience.image ? (
            <ExpoImage source={{ uri: experience.image }} style={styles.modalImage} contentFit="cover" />
          ) : null}
          <View style={styles.modalDetails}>
            <Text style={styles.modalTitle}>{experience.title}</Text>
            {fullDescription ? (
              <Text style={styles.modalDescription}>{fullDescription}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.createTripButton} onPress={handleCreateTrip}>
                <Text style={styles.createTripButtonText}>{t('explore.createTripPlan')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: AppColors.backgroundPrimary },
  modalHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  modalCloseButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 24, color: AppColors.textSecondary },
  modalContent: { flex: 1 },
  modalImage: { width: '100%', height: 250 },
  modalDetails: { padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: AppColors.text, marginBottom: 12 },
  modalDescription: { fontSize: 16, color: AppColors.textSecondary, lineHeight: 24, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  createTripButton: { backgroundColor: AppColors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', minWidth: 150 },
  createTripButtonText: { color: AppColors.white, fontSize: 16, fontWeight: '700' },
});

