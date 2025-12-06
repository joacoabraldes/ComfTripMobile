import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal, Pressable } from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { apiPost } from '@/helpers/api';
import NationalityField from '@/components/forms/NationalityField';
import flightsApi from '@/services/flightsApi';
import worldCountries from 'world-countries';
import { ShadowColors } from '@/constants/Colors';

interface AirportOption {
  value: string; // IATA code
  label: string; // Display name
  meta?: {
    iata: string;
    cityName?: string;
    countryName?: string;
  };
}

interface CityOption {
  value: string;
  label: string;
  cityName: string;
}

interface FlightOption {
  id: string;
  label: string;
  raw?: any;
  meta?: {
    flightCode?: string;
    airline?: string;
    times?: string;
  };
}

interface FlightSearchCardProps {
  tripId?: number;
  startDate?: Date | null;
  destinationCity?: string | null;
  initialOriginCountry?: string | null;
  initialOriginCity?: string | null;
  initialOriginAirport?: AirportOption | null;
  initialDestinationAirport?: AirportOption | null;
  onFlightSelected?: (flight: FlightOption) => void;
  onSave?: (flightId: string) => Promise<void>;
}

// Helper to get country ISO code from country name
function getCountryIsoCode(countryName: string): string | null {
  if (!countryName) return null;
  try {
    const country = worldCountries.find(
      (c: any) => c.name.common.toLowerCase() === countryName.toLowerCase() ||
        c.name.official.toLowerCase() === countryName.toLowerCase() ||
        (c.translations?.spa?.common && c.translations.spa.common.toLowerCase() === countryName.toLowerCase())
    );
    return country?.cca2?.toLowerCase() || null;
  } catch {
    return null;
  }
}

// Extract HH:MM from time value
function extractHHMM(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/(\d{2}:\d{2})/);
    return match ? match[1] : '';
  }
  if (typeof value === 'object') {
    const candidate = value.local || value.scheduledTimeLocal || value.scheduledTimeUtc || value.utc || '';
    return extractHHMM(candidate);
  }
  return '';
}

// Get departure time from flight object
function getDepartureTimeFromAero(flight: any): string {
  const movement = flight?.movement || {};
  const schedMove = movement.scheduledTime || movement.scheduled || movement.actualTime || {};
  const fromMovement = schedMove.local || schedMove.utc || schedMove.scheduledTimeLocal || schedMove.scheduledTimeUtc || '';

  const dep = flight?.departure || {};
  const schedDep = dep.scheduledTime || dep || {};
  const fromDeparture = schedDep.local || schedDep.utc || schedDep.scheduledTimeLocal || schedDep.scheduledTimeUtc || '';

  return extractHHMM(fromMovement || fromDeparture);
}

export default function FlightSearchCard({
  tripId,
  startDate,
  destinationCity,
  initialOriginCountry,
  initialOriginCity,
  initialOriginAirport,
  initialDestinationAirport,
  onFlightSelected,
  onSave,
}: FlightSearchCardProps) {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);

  const [originCountry, setOriginCountry] = useState<string | null>(initialOriginCountry || null);
  const [originCity, setOriginCity] = useState<string | null>(initialOriginCity || null);
  const [originCitySearch, setOriginCitySearch] = useState('');
  const [originCityOptions, setOriginCityOptions] = useState<CityOption[]>([]);
  const [originCityOpen, setOriginCityOpen] = useState(false);

  const [originAirport, setOriginAirport] = useState<AirportOption | null>(initialOriginAirport || null);
  const [originAirportOptions, setOriginAirportOptions] = useState<AirportOption[]>([]);
  const [originAirportOpen, setOriginAirportOpen] = useState(false);
  const [originAirportLoading, setOriginAirportLoading] = useState(false);

  const [destinationAirport, setDestinationAirport] = useState<AirportOption | null>(initialDestinationAirport || null);
  const [destinationAirportOptions, setDestinationAirportOptions] = useState<AirportOption[]>([]);
  const [destinationAirportOpen, setDestinationAirportOpen] = useState(false);
  const [destinationAirportLoading, setDestinationAirportLoading] = useState(false);

  const [flightOffers, setFlightOffers] = useState<FlightOption[]>([]);
  const [flightOffersOpen, setFlightOffersOpen] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);

  const debounceRef = useRef<any>(null);

  // Fetch origin city options from airports (since airports have city info)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!originCountry || originCitySearch.length < 2) {
      setOriginCityOptions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const countryCode = getCountryIsoCode(originCountry);
        if (!countryCode) {
          setOriginCityOptions([]);
          return;
        }

        // Search airports to get cities
        const airports = await flightsApi.searchAirportsByCity(originCitySearch, 50, countryCode);
        const cityMap = new Map<string, string>();
        
        airports.forEach((airport) => {
          if (airport.cityName && airport.cityName.toLowerCase().includes(originCitySearch.toLowerCase())) {
            const cityKey = airport.cityName.toLowerCase();
            if (!cityMap.has(cityKey)) {
              cityMap.set(cityKey, airport.cityName);
            }
          }
        });

        const cities: CityOption[] = Array.from(cityMap.values()).map((cityName) => ({
          value: cityName,
          label: cityName,
          cityName,
        }));

        setOriginCityOptions(cities.slice(0, 20));
      } catch (err) {
        console.error('Error fetching cities:', err);
        setOriginCityOptions([]);
      }
    }, 300);
  }, [originCountry, originCitySearch]);

  // Fetch origin airports
  const fetchOriginAirports = useCallback(async () => {
    if (!originCity || !originCountry) {
      setOriginAirportOptions([]);
      return;
    }
    setOriginAirportLoading(true);
    try {
      const countryCode = getCountryIsoCode(originCountry);
      const options = await flightsApi.getAirportOptionsForSelect('', 50, countryCode || undefined, originCity || undefined);
      setOriginAirportOptions(options);
    } catch (err) {
      console.error('Error fetching origin airports:', err);
      setOriginAirportOptions([]);
    } finally {
      setOriginAirportLoading(false);
    }
  }, [originCity, originCountry]);

  useEffect(() => {
    fetchOriginAirports();
  }, [fetchOriginAirports]);

  // Fetch destination airports
  const fetchDestinationAirports = useCallback(async () => {
    if (!destinationCity) {
      setDestinationAirportOptions([]);
      return;
    }
    setDestinationAirportLoading(true);
    try {
      // Extract city name from destination (e.g., "Rome, Italy" -> "Rome")
      const cityName = destinationCity.split(',')[0].trim();
      const options = await flightsApi.getAirportOptionsForSelect('', 50, undefined, cityName);
      setDestinationAirportOptions(options);
    } catch (err) {
      console.error('Error fetching destination airports:', err);
      setDestinationAirportOptions([]);
    } finally {
      setDestinationAirportLoading(false);
    }
  }, [destinationCity]);

  useEffect(() => {
    fetchDestinationAirports();
  }, [fetchDestinationAirports]);

  // Fetch flight offers when origin, destination, and date are available
  useEffect(() => {
    if (!originAirport || !destinationAirport || !startDate) {
      setFlightOffers([]);
      setSelectedFlight(null);
      return;
    }

    const fetchFlights = async () => {
      setOffersLoading(true);
      try {
        const res = await flightsApi.searchFlights({
          originLocationCode: originAirport.value,
          destinationLocationCode: destinationAirport.value,
          departureDate: startDate,
        });

        const flights = (res?.data || []).map((f: any, i: number) => {
          const airlineName = f.airline?.name || '';
          const flightCodeStr = (f.number || '').trim();
          const depTimeHHMM = getDepartureTimeFromAero(f);
          const times = depTimeHHMM ? `${depTimeHHMM}` : '';

          const labelParts = [];
          if (flightCodeStr) labelParts.push(flightCodeStr);
          if (airlineName) labelParts.push(airlineName);
          if (times) labelParts.push(times);

          const label = labelParts.join(' · ') || 'Vuelo';

          return {
            id: flightCodeStr || `flight_${i}`,
            label,
            raw: f,
            meta: {
              flightCode: flightCodeStr,
              airline: airlineName,
              times,
            },
          };
        });

        setFlightOffers(flights);
      } catch (err) {
        console.error('Error fetching flights:', err);
        setFlightOffers([]);
      } finally {
        setOffersLoading(false);
      }
    };

    fetchFlights();
  }, [originAirport, destinationAirport, startDate]);

  const handleOriginCountryChange = (country: string | null) => {
    setOriginCountry(country);
    setOriginCity(null);
    setOriginCitySearch('');
    setOriginAirport(null);
    setOriginAirportOptions([]);
    setFlightOffers([]);
    setSelectedFlight(null);
  };

  const handleOriginCitySelect = (city: CityOption) => {
    setOriginCity(city.cityName);
    setOriginCitySearch(city.cityName);
    setOriginCityOpen(false);
    setOriginAirport(null);
    setFlightOffers([]);
    setSelectedFlight(null);
  };

  const handleOriginAirportSelect = (airport: AirportOption) => {
    setOriginAirport(airport);
    setOriginAirportOpen(false);
    setFlightOffers([]);
    setSelectedFlight(null);
  };

  const handleDestinationAirportSelect = (airport: AirportOption) => {
    setDestinationAirport(airport);
    setDestinationAirportOpen(false);
    setFlightOffers([]);
    setSelectedFlight(null);
  };

  const handleFlightSelect = (flight: FlightOption) => {
    setSelectedFlight(flight);
    setFlightOffersOpen(false);
  };

  const handleSaveFlight = async () => {
    if (!selectedFlight || !tripId) return;
    
    try {
      // Build canonical flight ID
      const datePart = startDate ? startDate.toISOString().split('T')[0] : '';
      const flightCode = selectedFlight.meta?.flightCode || selectedFlight.id;
      const canonicalFlightId = datePart ? `${flightCode}|${datePart}` : flightCode;

      if (onSave) {
        await onSave(canonicalFlightId);
      } else {
        await apiPost('/flights', {
          flight_id: canonicalFlightId,
          trip_id: tripId,
        });
      }
      Alert.alert(t('common.success'), t('addTrip.flightSaved') || 'Vuelo guardado');
      onFlightSelected?.(selectedFlight);
    } catch (err: any) {
      console.error('Error saving flight:', err);
      Alert.alert(t('common.error'), err?.message || t('addTrip.saveError'));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('addTrip.flights')}</Text>

      {/* Origin Country */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('addTrip.originCountry')}</Text>
        <NationalityField
          value={originCountry}
          onValueChange={handleOriginCountryChange}
          placeholder={t('addTrip.selectOriginCountry')}
        />
      </View>

      {/* Origin City */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('addTrip.originCity')}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder={originCountry ? t('addTrip.typeMin2Letters') : t('addTrip.selectCountryFirst')}
            placeholderTextColor={AppColors.textMuted}
            value={originCityOpen ? originCitySearch : (originCity || '')}
            onChangeText={(text) => {
              setOriginCitySearch(text);
              if (!originCityOpen) setOriginCityOpen(true);
            }}
            onFocus={() => setOriginCityOpen(true)}
            editable={!!originCountry}
          />
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => setOriginCityOpen(!originCityOpen)}
            disabled={!originCountry}
          >
            <Ionicons
              name={originCityOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={AppColors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {originCityOpen && originCityOptions.length > 0 && (
          <View style={styles.dropdown}>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
              {originCityOptions.map((city, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.dropdownItem}
                  onPress={() => handleOriginCitySelect(city)}
                >
                  <Text style={styles.dropdownItemText}>{city.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Origin Airport */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('addTrip.originAirport')}</Text>
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => originAirportOptions.length > 0 && setOriginAirportOpen(true)}
          disabled={!originCity || originAirportLoading || originAirportOptions.length === 0}
        >
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder={originAirportLoading ? t('addTrip.loadingAirports') : t('addTrip.selectOriginAirport')}
            placeholderTextColor={AppColors.textMuted}
            value={originAirport?.label || ''}
            editable={false}
          />
          {originAirportLoading ? (
            <ActivityIndicator size="small" color={AppColors.primary} style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.arrowButton} disabled={!originCity || originAirportOptions.length === 0}>
              <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        <Modal
          visible={originAirportOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setOriginAirportOpen(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setOriginAirportOpen(false)}>
            <View style={styles.modalContent}>
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {originAirportOptions.map((airport, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.modalItem}
                    onPress={() => handleOriginAirportSelect(airport)}
                  >
                    <Text style={styles.modalItemText}>{airport.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </View>

      {/* Destination Airport */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('addTrip.destinationAirport')}</Text>
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => destinationAirportOptions.length > 0 && setDestinationAirportOpen(true)}
          disabled={!destinationCity || destinationAirportLoading || destinationAirportOptions.length === 0}
        >
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder={destinationAirportLoading ? t('addTrip.loadingAirports') : t('addTrip.selectDestinationAirport')}
            placeholderTextColor={AppColors.textMuted}
            value={destinationAirport?.label || ''}
            editable={false}
          />
          {destinationAirportLoading ? (
            <ActivityIndicator size="small" color={AppColors.primary} style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.arrowButton} disabled={!destinationCity || destinationAirportOptions.length === 0}>
              <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        <Modal
          visible={destinationAirportOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDestinationAirportOpen(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDestinationAirportOpen(false)}>
            <View style={styles.modalContent}>
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {destinationAirportOptions.map((airport, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.modalItem}
                    onPress={() => handleDestinationAirportSelect(airport)}
                  >
                    <Text style={styles.modalItemText}>{airport.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </View>

      {/* Available Flights */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('addTrip.availableFlights')}</Text>
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => flightOffers.length > 0 && setFlightOffersOpen(true)}
          disabled={!originAirport || !destinationAirport || !startDate || offersLoading || flightOffers.length === 0}
        >
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder={offersLoading ? t('addTrip.searchingFlights') : t('addTrip.selectFlight')}
            placeholderTextColor={AppColors.textMuted}
            value={selectedFlight?.label || ''}
            editable={false}
          />
          {offersLoading ? (
            <ActivityIndicator size="small" color={AppColors.primary} style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.arrowButton} disabled={!originAirport || !destinationAirport || !startDate || flightOffers.length === 0}>
              <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        <Modal
          visible={flightOffersOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setFlightOffersOpen(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setFlightOffersOpen(false)}>
            <View style={styles.modalContent}>
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {flightOffers.map((flight, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.modalItem}
                    onPress={() => handleFlightSelect(flight)}
                  >
                    <Text style={styles.modalItemText}>{flight.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </View>

      {selectedFlight && tripId && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveFlight}>
          <Text style={styles.saveButtonText}>{t('common.save')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
    backgroundColor: AppColors.backgroundPrimary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    shadowColor: ShadowColors.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    backgroundColor: AppColors.backgroundInputMuted,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: AppColors.text,
    minHeight: 50,
  },
  arrowButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
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
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  dropdownItemText: {
    fontSize: 16,
    color: AppColors.text,
  },
  loader: {
    position: 'absolute',
    right: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: AppColors.backgroundPrimary,
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
    width: '90%',
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalItemText: {
    fontSize: 16,
    color: AppColors.text,
  },
  saveButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
