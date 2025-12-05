import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Platform, Modal, Pressable } from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  occupiedSlots?: Array<{ start: string; end: string | null }>;
  minTime?: string;
  maxTime?: string | null;
  disabled?: boolean;
}

export default function TimePicker({
  value,
  onChange,
  occupiedSlots = [],
  minTime,
  maxTime,
  disabled = false,
}: TimePickerProps) {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  
  // Normalize value to have 00 or 30 minutes
  const normalizeValue = (val: string): { hour: string; minute: string } => {
    if (!val) return { hour: '', minute: '' };
    const parts = val.split(':');
    const h = parts[0] || '';
    const m = parts[1] || '';
    if (m) {
      const minNum = parseInt(m, 10);
      return { hour: h, minute: minNum < 30 ? '00' : '30' };
    }
    return { hour: h, minute: '' };
  };

  const normalized = normalizeValue(value);
  const [hour, setHour] = useState(normalized.hour);
  const [minute, setMinute] = useState(normalized.minute);
  const [showHourModal, setShowHourModal] = useState(false);
  const [showMinuteModal, setShowMinuteModal] = useState(false);

  const allHours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const allMinutes = ['00', '30']; // Solo mostrar 00 y 30 minutos

  const isInvalidStart = (h: string, m: string) => {
    const time = `${h}:${m || '00'}`;
    return occupiedSlots.some((slot) => {
      if (!slot.start) return false;
      if (m === '') {
        if (h === slot.start.split(':')[0] && slot.start.split(':')[1] === '00') return true;
        if (slot.end) {
          return h > slot.start.split(':')[0] && h < slot.end.split(':')[0];
        }
        return false;
      }
      if (slot.end && h === slot.end.split(':')[0] && slot.end.split(':')[1] === m) return false;
      return time > slot.start && (slot.end ? time < slot.end : false);
    });
  };

  const isInvalidEnd = (h: string, m: string) => {
    const time = `${h}:${m || '00'}`;
    if (m === '') {
      if (minTime && h === minTime.split(':')[0]) return false;
    }
    if (minTime && time < minTime) return true;
    if (maxTime && time > maxTime) return true;
    return false;
  };

  const isInvalid = (h: string, m: string) => {
    if (!minTime) {
      return isInvalidStart(h, m);
    } else {
      return isInvalidEnd(h, m);
    }
  };

  // Filter to show only available hours
  const hours = useMemo(() => {
    return allHours.filter(h => {
      // Check if at least one minute option is valid for this hour
      return allMinutes.some(m => {
        if (!minTime) {
          return !isInvalidStart(h, m);
        } else {
          return !isInvalidEnd(h, m);
        }
      });
    });
  }, [occupiedSlots, minTime, maxTime]);

  // Filter to show only available minutes for the selected hour
  const minutes = useMemo(() => {
    if (!hour) return allMinutes;
    return allMinutes.filter(m => {
      if (!minTime) {
        return !isInvalidStart(hour, m);
      } else {
        return !isInvalidEnd(hour, m);
      }
    });
  }, [hour, occupiedSlots, minTime, maxTime]);

  // Update internal state when value prop changes
  useEffect(() => {
    const normalized = normalizeValue(value);
    setHour(normalized.hour);
    setMinute(normalized.minute);
  }, [value]);

  // Notify parent when hour or minute changes
  const handleHourSelect = (h: string) => {
    setHour(h);
    setShowHourModal(false);
    if (h && minute) {
      onChange(`${h}:${minute}`);
    } else if (h) {
      onChange(`${h}:`);
    } else {
      onChange('');
    }
  };

  const handleMinuteSelect = (m: string) => {
    setMinute(m);
    setShowMinuteModal(false);
    if (hour && m) {
      onChange(`${hour}:${m}`);
    } else if (hour) {
      onChange(`${hour}:`);
    }
  };

  const displayValue = hour && minute ? `${hour}:${minute}` : hour ? `${hour}:--` : '';

  return (
    <View style={styles.container}>
      <View style={styles.timeRow}>
        {/* Hour Field */}
        <TouchableOpacity
          style={[
            styles.timeField,
            {
              backgroundColor: showHourModal ? AppColors.backgroundPrimary : AppColors.backgroundInputMuted,
              borderWidth: showHourModal ? 2 : 0,
              borderColor: AppColors.primary,
            },
            disabled && styles.timeFieldDisabled,
          ]}
          onPress={() => !disabled && setShowHourModal(true)}
          disabled={disabled}
        >
          <Text style={[styles.timeFieldText, !hour && styles.timeFieldTextPlaceholder]}>
            {hour || t('common.hours') || 'HH'}
          </Text>
          <Ionicons
            name={showHourModal ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={AppColors.textSecondary}
          />
        </TouchableOpacity>

        <Text style={styles.separator}>:</Text>

        {/* Minute Field */}
        <TouchableOpacity
          style={[
            styles.timeField,
            {
              backgroundColor: showMinuteModal ? AppColors.backgroundPrimary : AppColors.backgroundInputMuted,
              borderWidth: showMinuteModal ? 2 : 0,
              borderColor: AppColors.primary,
            },
            (disabled || !hour) && styles.timeFieldDisabled,
          ]}
          onPress={() => !disabled && hour && setShowMinuteModal(true)}
          disabled={disabled || !hour}
        >
          <Text style={[styles.timeFieldText, !minute && styles.timeFieldTextPlaceholder]}>
            {minute || t('common.minutes') || 'MM'}
          </Text>
          <Ionicons
            name={showMinuteModal ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={AppColors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Hour Modal */}
      <Modal
        visible={showHourModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHourModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowHourModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.dropdown}>
              <ScrollView
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                style={styles.dropdownList}
              >
                {hours.map((h) => {
                  const invalid = isInvalid(h, '');
                  const isSelected = hour === h;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.option,
                        isSelected && styles.optionSelected,
                        invalid && styles.optionDisabled,
                      ]}
                      onPress={() => !invalid && handleHourSelect(h)}
                      disabled={invalid}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                          invalid && styles.optionTextDisabled,
                        ]}
                      >
                        {h}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={AppColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Minute Modal */}
      <Modal
        visible={showMinuteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMinuteModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMinuteModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.dropdown}>
              <ScrollView
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                style={styles.dropdownList}
              >
                {minutes.map((m) => {
                  const invalid = isInvalid(hour, m);
                  const isSelected = minute === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.option,
                        isSelected && styles.optionSelected,
                        invalid && styles.optionDisabled,
                      ]}
                      onPress={() => !invalid && handleMinuteSelect(m)}
                      disabled={invalid}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                          invalid && styles.optionTextDisabled,
                        ]}
                      >
                        {m}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={AppColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
    width: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  timeFieldDisabled: {
    opacity: 0.5,
  },
  timeFieldText: {
    fontSize: 16,
    color: AppColors.text,
    fontWeight: '600',
  },
  timeFieldTextPlaceholder: {
    color: AppColors.textMuted,
    fontWeight: '400',
  },
  separator: {
    fontSize: 20,
    color: AppColors.text,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 300,
  },
  dropdown: {
    backgroundColor: AppColors.backgroundPrimary,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 300,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dropdownList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.backgroundPrimary,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  optionSelected: {
    backgroundColor: AppColors.primaryLight,
  },
  optionDisabled: {
    opacity: 0.3,
  },
  optionText: {
    fontSize: 16,
    color: AppColors.text,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  optionTextDisabled: {
    color: AppColors.textDisabled,
  },
});
