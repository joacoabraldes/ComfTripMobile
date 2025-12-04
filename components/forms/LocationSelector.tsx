import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { AppColors } from '@/constants/Colors';
import { useTranslation } from '@/i18n';

interface Location {
  id: number;
  titulo?: string;
  city?: string;
  ciudad?: string;
  localidad?: string;
  locality?: string;
  admin_area?: string;
  region?: string;
  province?: string;
  state?: string;
  town?: string;
  municipio?: string;
  country?: string;
  address?: string;
  descripcion?: string;
  latitude?: number | string;
  longitude?: number | string;
  latitud?: number | string;
  longitud?: number | string;
}

interface LocationSelectorProps {
  locations: Location[];
  selectedLocation: number | null;
  onSelectLocation: (locationId: number) => void;
  placeholder?: string;
  noLocationsMessage?: string;
  showAllLocations?: boolean;
  onShowAllLocations?: () => void;
  filteredLocations?: Location[];
  disabled?: boolean;
}

export default function LocationSelector({
  locations,
  selectedLocation,
  onSelectLocation,
  placeholder,
  noLocationsMessage,
  showAllLocations = false,
  onShowAllLocations,
  filteredLocations,
  disabled = false,
}: LocationSelectorProps) {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');

  const availableLocations = showAllLocations ? locations : (filteredLocations || locations);

  const selectedLocationData = locations.find((l) => Number(l.id) === Number(selectedLocation));

  const displayedLocations = useMemo(() => {
    if (!search.trim()) return availableLocations;
    return availableLocations.filter((loc) =>
      loc.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      loc.address?.toLowerCase().includes(search.toLowerCase()) ||
      loc.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
      loc.city?.toLowerCase().includes(search.toLowerCase()) ||
      loc.ciudad?.toLowerCase().includes(search.toLowerCase()) ||
      loc.localidad?.toLowerCase().includes(search.toLowerCase())
    );
  }, [availableLocations, search]);

  const getLocationName = (loc: Location) => {
    return loc.titulo || loc.address || loc.descripcion || `Location ${loc.id}`;
  };

  const getCityName = (loc: Location) => {
    return loc.city || loc.ciudad || loc.localidad || loc.locality || '';
  };

  const handleSelect = (locationId: number) => {
    onSelectLocation(locationId);
    setSearch('');
    setIsDropdownOpen(false);
  };

  const displayValue = selectedLocationData
    ? getLocationName(selectedLocationData)
    : '';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.input,
          {
            backgroundColor: isDropdownOpen ? AppColors.backgroundPrimary : AppColors.backgroundInputMuted,
            borderWidth: isDropdownOpen ? 2 : 0,
            borderColor: AppColors.primary,
          },
          disabled && styles.inputDisabled,
        ]}
      >
        <TextInput
          style={styles.textInput}
          placeholder={placeholder || t('addActivity.searchLocation')}
          placeholderTextColor={AppColors.textMuted}
          value={isDropdownOpen ? search : displayValue}
          onChangeText={(text) => {
            setSearch(text);
            if (!isDropdownOpen) {
              setIsDropdownOpen(true);
            }
          }}
          onFocus={() => !disabled && setIsDropdownOpen(true)}
          editable={!disabled}
        />
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled}
        >
          <Text style={[styles.arrow, { transform: [{ rotate: isDropdownOpen ? '0deg' : '180deg' }] }]}>
            ▲
          </Text>
        </TouchableOpacity>
      </View>

      {isDropdownOpen && !disabled && (
        <View style={styles.dropdown}>
          <ScrollView
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            style={styles.dropdownScroll}
          >
            {displayedLocations.length === 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  {noLocationsMessage || t('addActivity.noLocationsFound', { destination: '' })}
                </Text>
                {filteredLocations && filteredLocations.length === 0 && locations.length > 0 && !showAllLocations && onShowAllLocations && (
                  <TouchableOpacity style={styles.showAllButton} onPress={onShowAllLocations}>
                    <Text style={styles.showAllButtonText}>{t('addActivity.showAll')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              displayedLocations.map((loc) => {
                const locationName = getLocationName(loc);
                const cityName = getCityName(loc);
                const isSelected = selectedLocation === loc.id;
                return (
                  <TouchableOpacity
                    key={loc.id}
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => handleSelect(loc.id)}
                  >
                    <Text
                      style={[styles.itemText, isSelected && styles.itemTextSelected]}
                      numberOfLines={2}
                    >
                      {locationName}{cityName ? ` — ${cityName}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.text,
  },
  arrowButton: {
    paddingLeft: 8,
  },
  arrow: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: AppColors.backgroundPrimary,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    borderRadius: 10,
    marginTop: 4,
    zIndex: 1001,
    overflow: 'hidden',
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
  dropdownScroll: {
    flex: 1,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  itemSelected: {
    backgroundColor: AppColors.primaryLight,
  },
  itemText: {
    fontSize: 16,
    color: AppColors.text,
  },
  itemTextSelected: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  noResults: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  showAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AppColors.primary,
    borderRadius: 8,
    marginTop: 8,
  },
  showAllButtonText: {
    color: AppColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

