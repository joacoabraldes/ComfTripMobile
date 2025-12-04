import React, { useState, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, StyleSheet, Text, Platform } from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/i18n';
import countryRegionData from 'country-region-data';

interface NationalityFieldProps {
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  containerStyle?: any;
  inputHeight?: number;
  placeholder?: string;
  onFocus?: () => void;
}

export default function NationalityField({
  value = null,
  onValueChange,
  containerStyle,
  inputHeight = 50,
  placeholder,
  onFocus,
}: NationalityFieldProps) {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const defaultPlaceholder = placeholder || t('auth.register.selectNationality');

  // Safe country names extraction with fallback
  const countryNames = useMemo(() => {
    try {
      if (!countryRegionData || !Array.isArray(countryRegionData)) {
        console.warn('countryRegionData not available, using fallback');
        return [
          'Argentina',
          'Brasil',
          'Chile',
          'Colombia',
          'México',
          'Perú',
          'España',
          'Estados Unidos',
          'Francia',
          'Italia',
          'Alemania',
          'Reino Unido',
        ];
      }
      return countryRegionData
        .map((countryItem) => {
          // Handle array format: [countryName, countryShortCode, regions]
          if (Array.isArray(countryItem)) {
            return countryItem[0];
          }
          // Handle object format: {countryName, countryShortCode, regions}
          if (typeof countryItem === 'object' && countryItem !== null) {
            return (countryItem as any).countryName;
          }
          // Handle string format
          if (typeof countryItem === 'string') {
            return countryItem;
          }
          return null;
        })
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
        .sort();
    } catch (error) {
      console.error('Error processing country data:', error);
      return [
        'Argentina',
        'Brasil',
        'Chile',
        'Colombia',
        'México',
        'Perú',
        'España',
        'Estados Unidos',
      ];
    }
  }, []);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) {
      return countryNames;
    }
    return countryNames.filter(
      (c) => typeof c === 'string' && c.toLowerCase().includes(search.toLowerCase())
    );
  }, [countryNames, search]);

  const handleSelect = (country: string) => {
    onValueChange?.(country);
    setSearch('');
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
    onFocus?.();
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearch('');
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.inputBox,
          {
            height: inputHeight,
            backgroundColor: isOpen ? AppColors.backgroundPrimary : AppColors.backgroundInputMuted,
            borderWidth: isOpen ? 2 : 0,
            borderColor: AppColors.primary,
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              flex: 1,
              color: value ? AppColors.text : AppColors.textMuted,
            },
          ]}
          placeholder={defaultPlaceholder}
          placeholderTextColor={AppColors.textMuted}
          value={isOpen ? search : (value || '')}
          onChangeText={(text) => {
            setSearch(text);
            if (!isOpen) {
              setIsOpen(true);
            }
          }}
          onFocus={handleFocus}
          returnKeyType="done"
          onSubmitEditing={() => setIsOpen(false)}
        />
        <TouchableOpacity style={styles.arrowButton} onPress={handleToggle}>
          <Text
            style={[
              styles.arrow,
              {
                transform: [{ rotate: isOpen ? '0deg' : '180deg' }],
                color: AppColors.textSecondary,
              },
            ]}
          >
            ▲
          </Text>
        </TouchableOpacity>
      </View>

      {isOpen && (
        <View style={styles.dropdown}>
          <ScrollView
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            style={styles.dropdownList}
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((item, index) => {
                // Ensure item is a string
                if (typeof item !== 'string') {
                  return null;
                }
                const isSelected = value === item;
                return (
                  <TouchableOpacity
                    key={`${item}-${index}`}
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.itemText}>{item}</Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  {t('auth.register.noNationalitiesFound')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
    width: '100%',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textInput: {
    fontSize: 16,
    paddingHorizontal: 22,
    paddingVertical: 0,
    height: '100%',
    textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
    minHeight: 24,
  },
  arrowButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 16,
  },
  dropdown: {
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
  dropdownList: {
    maxHeight: 200,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.backgroundPrimary,
  },
  itemSelected: {
    backgroundColor: AppColors.primaryLight,
  },
  itemText: {
    fontSize: 16,
    color: AppColors.text,
  },
  noResults: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
  },
});

