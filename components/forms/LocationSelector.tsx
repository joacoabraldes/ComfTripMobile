import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';
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
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const [isOpen, setIsOpen] = useState(false);
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
    setIsOpen(false);
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearch('');
      }
    }
  };

  const displayValue = selectedLocationData
    ? getLocationName(selectedLocationData)
    : '';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputBox,
          {
            backgroundColor: isOpen ? AppColors.backgroundPrimary : AppColors.backgroundInputMuted,
            borderWidth: isOpen ? 2 : 0,
            borderColor: AppColors.primary,
          },
          disabled && styles.inputDisabled,
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              flex: 1,
              color: selectedLocationData ? AppColors.text : AppColors.textMuted,
            },
          ]}
          placeholder={placeholder || t('addActivity.searchLocation')}
          placeholderTextColor={AppColors.textMuted}
          value={isOpen ? search : displayValue}
          onChangeText={(text) => {
            setSearch(text);
            if (!isOpen) {
              setIsOpen(true);
            }
          }}
          onFocus={handleFocus}
          editable={!disabled}
          returnKeyType="done"
          onSubmitEditing={() => setIsOpen(false)}
        />
        <TouchableOpacity style={styles.arrowButton} onPress={handleToggle} disabled={disabled}>
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

      {isOpen && !disabled && (
        <View style={styles.dropdown}>
          <ScrollView
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            style={styles.dropdownList}
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
              displayedLocations.map((loc, index) => {
                const locationName = getLocationName(loc);
                const cityName = getCityName(loc);
                const isSelected = selectedLocation === loc.id;
                return (
                  <TouchableOpacity
                    key={`${loc.id}-${index}`}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  textInput: {
    fontSize: 16,
    paddingHorizontal: 6,
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
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  itemSelected: {
    backgroundColor: AppColors.primaryLight,
  },
  itemText: {
    fontSize: 16,
    color: AppColors.text,
    flex: 1,
  },
  itemTextSelected: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  noResults: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
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
