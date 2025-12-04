import React, { useState, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, StyleSheet, Text, Platform } from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/i18n';
import countries from 'world-countries';

interface PhoneFieldProps {
  value?: string;
  code?: string;
  onCodeChange?: (code: string) => void;
  onNumberChange?: (number: string) => void;
  containerStyle?: any;
  inputHeight?: number;
  placeholder?: string;
}

interface CountryCode {
  code: string;
  country: string;
  name: string;
}

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
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const [showCodePicker, setShowCodePicker] = useState(false);
  const [search, setSearch] = useState('');
  const defaultPlaceholder = placeholder || t('auth.register.phoneNumber');

  // Extract country codes from world-countries
  const countryCodes = useMemo<CountryCode[]>(() => {
    try {
      const codesMap = new Map<string, CountryCode>();
      
      if (!Array.isArray(countries)) {
        throw new Error('countries is not an array');
      }
      
      countries.forEach((country: any) => {
        const countryName = country.name?.common || country.name?.official || country.name || '';
        const countryCode = country.cca2 || country.alpha2 || '';
        
        // world-countries uses 'idd' (International Direct Dialing) property
        // idd has structure: { root: "+1", suffixes: ["234", "567"] }
        if (country.idd && country.idd.root) {
          const root = country.idd.root.replace(/^\+/, ''); // Remove + if present
          
          if (country.idd.suffixes && Array.isArray(country.idd.suffixes) && country.idd.suffixes.length > 0) {
            // Use the first suffix to create the full code (e.g., +1 for US, +52 for Mexico)
            const firstSuffix = country.idd.suffixes[0];
            const fullCode = `${root}${firstSuffix}`;
            
            // Use country code as key to avoid duplicates (e.g., US and CA both use +1)
            if (fullCode && countryCode && !codesMap.has(countryCode)) {
              codesMap.set(countryCode, {
                code: `+${fullCode}`,
                country: countryCode,
                name: countryName,
              });
            }
          } else if (root) {
            // Some countries might only have root without suffixes
            if (countryCode && !codesMap.has(countryCode)) {
              codesMap.set(countryCode, {
                code: `+${root}`,
                country: countryCode,
                name: countryName,
              });
            }
          }
        }
      });

      // Convert to array and sort by country name
      const result = Array.from(codesMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      // If no results, use fallback
      if (result.length === 0) {
        throw new Error('No country codes found');
      }
      
      return result;
    } catch (error) {
      console.error('Error processing country codes:', error);
      // Fallback to common codes
      return [
        { code: '+1', country: 'US', name: 'United States' },
        { code: '+52', country: 'MX', name: 'Mexico' },
        { code: '+54', country: 'AR', name: 'Argentina' },
        { code: '+55', country: 'BR', name: 'Brazil' },
        { code: '+56', country: 'CL', name: 'Chile' },
        { code: '+57', country: 'CO', name: 'Colombia' },
        { code: '+34', country: 'ES', name: 'Spain' },
        { code: '+33', country: 'FR', name: 'France' },
        { code: '+39', country: 'IT', name: 'Italy' },
        { code: '+49', country: 'DE', name: 'Germany' },
        { code: '+44', country: 'GB', name: 'United Kingdom' },
      ];
    }
  }, []);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!search.trim()) {
      return countryCodes;
    }
    const searchLower = search.toLowerCase();
    return countryCodes.filter(
      (item) =>
        item.code.toLowerCase().includes(searchLower) ||
        item.country.toLowerCase().includes(searchLower) ||
        item.name.toLowerCase().includes(searchLower)
    );
  }, [countryCodes, search]);

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
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar país o código..."
              placeholderTextColor={AppColors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <ScrollView
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            style={styles.codeList}
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((item) => (
                <TouchableOpacity
                  key={`${item.code}-${item.country}`}
                  style={[styles.codeItem, code === item.code && styles.codeItemSelected]}
                  onPress={() => {
                    onCodeChange?.(item.code);
                    setShowCodePicker(false);
                    setSearch('');
                  }}
                >
                  <Text style={styles.codeItemText}>
                    {item.code} {item.country} - {item.name}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No se encontraron resultados</Text>
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
    maxHeight: 300,
    zIndex: 1000,
    elevation: 10,
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  searchInput: {
    backgroundColor: AppColors.backgroundInputMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: AppColors.text,
  },
  codeList: {
    maxHeight: 250,
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
    fontSize: 14,
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

