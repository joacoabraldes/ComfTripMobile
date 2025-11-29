import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, StyleSheet, Text, Platform } from 'react-native';
import { AppColors } from '@/constants/Colors';
import { useTranslation } from '@/i18n';

interface PhoneFieldProps {
  value?: string;
  code?: string;
  onCodeChange?: (code: string) => void;
  onNumberChange?: (number: string) => void;
  containerStyle?: any;
  inputHeight?: number;
  placeholder?: string;
}

const COUNTRY_CODES = [
  { code: '+1', country: 'US/CA' },
  { code: '+52', country: 'MX' },
  { code: '+54', country: 'AR' },
  { code: '+55', country: 'BR' },
  { code: '+56', country: 'CL' },
  { code: '+57', country: 'CO' },
  { code: '+34', country: 'ES' },
  { code: '+33', country: 'FR' },
  { code: '+39', country: 'IT' },
  { code: '+49', country: 'DE' },
  { code: '+44', country: 'GB' },
];

export default function PhoneField({
  value = '',
  code = '+1',
  onCodeChange,
  onNumberChange,
  containerStyle,
  inputHeight = 50,
  placeholder,
}: PhoneFieldProps) {
  const { t } = useTranslation();
  const [showCodePicker, setShowCodePicker] = useState(false);
  const defaultPlaceholder = placeholder || t('auth.register.phoneNumber');

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.inputRow, { height: inputHeight }]}>
        <TouchableOpacity
          style={styles.codeButton}
          onPress={() => setShowCodePicker(!showCodePicker)}
        >
          <Text style={styles.codeText}>{code}</Text>
          <Text style={styles.arrow}>{showCodePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TextInput
          style={styles.numberInput}
          value={value}
          onChangeText={onNumberChange}
          placeholder={defaultPlaceholder}
          placeholderTextColor={AppColors.textMuted}
          keyboardType="phone-pad"
          onFocus={() => setShowCodePicker(false)}
        />
      </View>
      {showCodePicker && (
        <View style={styles.codeDropdown}>
          <ScrollView
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            style={styles.codeList}
          >
            {COUNTRY_CODES.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={[styles.codeItem, code === item.code && styles.codeItemSelected]}
                onPress={() => {
                  onCodeChange?.(item.code);
                  setShowCodePicker(false);
                }}
              >
                <Text style={styles.codeItemText}>{item.code} {item.country}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.backgroundInputMuted,
    borderRadius: 10,
    overflow: 'hidden',
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 16,
    color: AppColors.text,
    marginRight: 4,
  },
  arrow: {
    fontSize: 10,
    color: AppColors.textSecondary,
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: AppColors.border,
  },
  numberInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.text,
    paddingHorizontal: 12,
    height: '100%',
    textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
  },
  codeDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: AppColors.backgroundPrimary,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10,
  },
  codeList: {
    maxHeight: 200,
  },
  codeItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.backgroundPrimary,
  },
  codeItemSelected: {
    backgroundColor: AppColors.primaryLight,
  },
  codeItemText: {
    fontSize: 16,
    color: AppColors.text,
  },
});

