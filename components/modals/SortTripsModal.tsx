import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { AppColors, ShadowColors } from '@/constants/Colors';
import TextButton from '@/components/buttons/TextButton';

export type SortOption = 'date' | 'name';
export type SortOrder = 'asc' | 'desc';

interface SortTripsModalProps {
  visible: boolean;
  onClose: () => void;
  currentSort: SortOption;
  currentOrder: SortOrder;
  onSortChange: (sort: SortOption, order: SortOrder) => void;
}

export default function SortTripsModal({
  visible,
  onClose,
  currentSort,
  currentOrder,
  onSortChange,
}: SortTripsModalProps) {
  const { t } = useTranslation();
  const [tempSort, setTempSort] = useState<SortOption>(currentSort);
  const [tempOrder, setTempOrder] = useState<SortOrder>(currentOrder);

  // Resetear valores temporales cuando el modal se abre o cambian los valores actuales
  useEffect(() => {
    if (visible) {
      setTempSort(currentSort);
      setTempOrder(currentOrder);
    }
  }, [visible, currentSort, currentOrder]);

  const handleSortSelect = (sort: SortOption) => {
    // Mantener el orden actual siempre, sin importar si cambia el tipo de ordenamiento
    setTempSort(sort);
    // No cambiar tempOrder, mantener el valor actual
  };

  const handleOrderSelect = (order: SortOrder) => {
    setTempOrder(order);
  };

  const handleConfirm = () => {
    onSortChange(tempSort, tempOrder);
    onClose();
  };

  const handleCancel = () => {
    // Restaurar valores originales
    setTempSort(currentSort);
    setTempOrder(currentOrder);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('trips.sortTitle')}</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={AppColors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>{t('trips.sortBy')}</Text>
            
            <TouchableOpacity
              style={[styles.option, tempSort === 'date' && styles.optionSelected]}
              onPress={() => handleSortSelect('date')}
            >
              <View style={styles.optionContent}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={tempSort === 'date' ? AppColors.primary : AppColors.textSecondary}
                />
                <Text style={[styles.optionText, tempSort === 'date' && styles.optionTextSelected]}>
                  {t('trips.sortByDate')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, tempSort === 'name' && styles.optionSelected]}
              onPress={() => handleSortSelect('name')}
            >
              <View style={styles.optionContent}>
                <Ionicons
                  name="text-outline"
                  size={20}
                  color={tempSort === 'name' ? AppColors.primary : AppColors.textSecondary}
                />
                <Text style={[styles.optionText, tempSort === 'name' && styles.optionTextSelected]}>
                  {t('trips.sortByName')}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.orderSection}>
              <Text style={styles.sectionTitle}>{t('trips.sortOrder')}</Text>
              
              <View style={styles.orderButtonsContainer}>
                <TouchableOpacity
                  style={[styles.orderButton, tempOrder === 'asc' && styles.orderButtonSelected]}
                  onPress={() => handleOrderSelect('asc')}
                >
                  <Ionicons
                    name="arrow-up"
                    size={18}
                    color={tempOrder === 'asc' ? AppColors.primary : AppColors.textSecondary}
                  />
                  <Text style={[styles.orderButtonText, tempOrder === 'asc' && styles.orderButtonTextSelected]}>
                    {t('trips.ascending')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.orderButton, tempOrder === 'desc' && styles.orderButtonSelected]}
                  onPress={() => handleOrderSelect('desc')}
                >
                  <Ionicons
                    name="arrow-down"
                    size={18}
                    color={tempOrder === 'desc' ? AppColors.primary : AppColors.textSecondary}
                  />
                  <Text style={[styles.orderButtonText, tempOrder === 'desc' && styles.orderButtonTextSelected]}>
                    {t('trips.descending')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <TextButton
              title={t('common.cancel')}
              onPress={handleCancel}
              textStyle={styles.actionButtonText}
            />
            <TextButton
              title={t('common.confirm')}
              onPress={handleConfirm}
              textStyle={styles.actionButtonText}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: AppColors.backgroundPrimary,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: ShadowColors.black,
        shadowOpacity: 0.2,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: AppColors.backgroundTertiary,
  },
  optionSelected: {
    backgroundColor: AppColors.primaryLight,
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: AppColors.text,
    marginLeft: 12,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  orderSection: {
    marginTop: 24,
  },
  orderButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  orderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: AppColors.backgroundTertiary,
    gap: 8,
  },
  orderButtonSelected: {
    backgroundColor: AppColors.primaryLight,
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  orderButtonText: {
    fontSize: 14,
    color: AppColors.text,
    fontWeight: '500',
  },
  orderButtonTextSelected: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.black,
  },
});

