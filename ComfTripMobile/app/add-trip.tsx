import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
interface CalendarDay {
  date: number;
  selected: boolean;
}

export default function AddTrip() {
  const [destination, setDestination] =  useState<string | null>(null);
  const [country, setCountry]=useState<string | null>(null);
  const [city, setCity]=useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // búsqueda con Nominatim
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat:string, lon:string, display_name:string, address?:any} | null>(null);
  const debounceRef = useRef<any>(null);

  const today = new Date();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const days: CalendarDay[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: i, selected: false });
    }
    return { days, firstDayOfMonth };
  };

  const isPastDate = (day: number) => {
    const currentDate = new Date(currentYear, currentMonth, day);
    const today = new Date();
    today.setHours(0,0,0,0);
    return currentDate < today;
  };

  const { days, firstDayOfMonth } = generateCalendarDays();

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);

    if (!startDate || (startDate && endDate)) {
      setStartDate(selectedDate);
      setEndDate(null);
    } else {
      if (selectedDate < startDate) {
        setStartDate(selectedDate);
        setEndDate(startDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const isDateInRange = (day: number) => {
    if (!startDate) return false;
    if (!endDate) return startDate.getDate() === day && startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;

    const currentDate = new Date(currentYear, currentMonth, day);
    return currentDate >= startDate && currentDate <= endDate;
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((year) => year - 1);
        return 11;
      }
      return prev - 1;
    });
    setStartDate(null);
    setEndDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((year) => year + 1);
        return 0;
      }
      return prev + 1;
    });
    setStartDate(null);
    setEndDate(null);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekDays = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

  const formatISODate = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

  // ==== Nominatim: funciones ====
  const fetchSuggestions = useCallback(async (text: string) => {
    if (!text || text.length < 3) {
      setSuggestions([]);
      setOpenSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5&accept-language=es`;
      const res = await fetch(url, {
        headers: {
          'Referer': 'ConfTrip://', 
        },
      });
      if (!res.ok) throw new Error('Error buscando ubicaciones');
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
      setOpenSuggestions(true);
    } catch (e) {
      console.warn('Nominatim error', e);
      setSuggestions([]);
      setOpenSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Debounce: 400ms
  const onChangeQuery = (text: string) => {
    setQuery(text);
    setSelectedLocation(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text || text.length < 3) {
      setSuggestions([]);
      setOpenSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSelectSuggestion = (item: any) => {
    setDestination(item.display_name);
    setQuery(item.display_name);
    setSuggestions([]);
    setOpenSuggestions(false);
    setSelectedLocation({ lat: item.lat, lon: item.lon, display_name: item.display_name, address: item.address });
    
    if (item.address) {
      setCountry(item.address.country || null);
      const inferredCity = item.address.city || item.address.town || item.address.village || item.address.county || item.address.state || null;
      setCity(inferredCity);
    }
  };

  const openMap = () => {
    if (!selectedLocation) {
      Alert.alert('Ubicación no seleccionada', 'Por favor selecciona una sugerencia antes de ver en el mapa.');
      return;
    }
    setShowMap(true);
  };

  // save trip to backend, then navigate to load-trip screen
  const handleSaveTrip = async () => {
    if (saving) return;
    if (!startDate || !endDate) {
      Alert.alert('Selecciona fechas', 'Por favor selecciona una fecha de inicio y una fecha de fin.');
      return;
    }
    if (!destination || destination.trim().length === 0) {
      Alert.alert('Destino vacío', 'Por favor ingresa un destino.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        destination: (city && country) ? `${city}, ${country}` : destination.trim(),
        start_date: formatISODate(startDate),
        end_date: formatISODate(endDate),
        budget: null,
        notes: null,
      };

      if (selectedLocation) {
        payload.lat = selectedLocation.lat;
        payload.lon = selectedLocation.lon;
      }

      // Navegar a load-trip y pasar el payload como query param (url-encoded JSON)
      const qs = encodeURIComponent(JSON.stringify(payload));
      router.push(`/load-trip?payload=${qs}`);

    } catch (err: any) {
      console.error('Error preparando payload:', err);
      const message = (err && err.message) || 'No se pudo guardar el viaje';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Volver">
        <Text style={styles.backBtnText}>‹</Text>
      </TouchableOpacity>
      <Text style={[styles.header, styles.headerTopSpacing]}>Selecciona a donde vas a viajar</Text>

      {/* BARRA DE BÚSQUEDA (Nominatim) */}
      <View style={[styles.destinationInput, { marginBottom: openSuggestions ? 0 : 20 }]}>
        <TextInput
          style={[{ flex:1, borderWidth:0, outline:"none", color: destination ? "#252525" : "rgba(0,0,0,0.5)"}]}
          placeholder={"Buscar zona, calle o ciudad"}
          value={query}
          onChangeText={onChangeQuery}
          onFocus={() => { if (suggestions.length > 0) setOpenSuggestions(true); }}
        />
        {loadingSuggestions ? <ActivityIndicator /> : null}
      </View>

      {openSuggestions && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id?.toString() || item.osm_id?.toString() || item.lat + item.lon}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Text>{item.display_name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {!showMap && selectedLocation && (
        <TouchableOpacity style={styles.mapButton} onPress={openMap}>
          <Text style={styles.mapButtonText}>Ver en el mapa</Text>
        </TouchableOpacity>
      )}

      {showMap && selectedLocation && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: parseFloat(selectedLocation.lat),
              longitude: parseFloat(selectedLocation.lon),
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker
              coordinate={{
                latitude: parseFloat(selectedLocation.lat),
                longitude: parseFloat(selectedLocation.lon),
              }}
              title={selectedLocation.display_name}
            />
          </MapView>
          <TouchableOpacity style={styles.closeMapBtn} onPress={() => setShowMap(false)}>
            <Text style={styles.closeMapBtnText}>Cerrar mapa</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.header, styles.headerTopSpacing]}>Selecciona las fechas que vas a estar</Text>

      <View style={styles.calendarHeader}>
        <Text style={styles.monthYear}>{monthNames[currentMonth]} {currentYear}</Text>
        <View style={styles.arrows}>
          <TouchableOpacity onPress={handlePrevMonth}>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextMonth}>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendar}>
        <View style={styles.weekDays}>
          {weekDays.map((day, index) => (
            <Text key={index} style={styles.weekDay}>{day}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {Array(firstDayOfMonth).fill(null).map((_, index) => (
            <View key={`empty-${index}`} style={styles.emptyDay} />
          ))}

          {days.map((day) => {
            const past = isPastDate(day.date);

            return (
                <TouchableOpacity
                    key={day.date}
                    style={[
                      styles.day,
                      isDateInRange(day.date) && styles.selectedDay,
                    ]}
                    disabled={past}
                    onPress={() => handleDateSelect(day.date)}
                >
                  <Text
                      style={[
                        styles.dayText,
                        past && styles.pastDayText,
                        isDateInRange(day.date) && styles.selectedDayText
                      ]}
                  >
                    {day.date}
                  </Text>
                </TouchableOpacity>
            );
          })}

        </View>
      </View>

      {startDate && endDate && (
        <Text style={styles.dateRange}>
          Se armará un plan turístico para {city && country ? `${city}, ${country}` : (destination ?? '')} del {startDate.getDate()}/{startDate.getMonth() + 1}/{startDate.getFullYear()} al {endDate.getDate()}/{endDate.getMonth() + 1}/{endDate.getFullYear()}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.createTripButton, styles.headerTopSpacing]}
        onPress={handleSaveTrip}
        disabled={saving}
      >
        <Text style={styles.createTripButtonText}>Armar Viaje</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  backBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  backBtnText: {
    fontSize: 28,
    color: '#252525',
    lineHeight: 28,
  },
  /* Espacios extra arriba de los títulos para desplazar el contenido hacia abajo */
  headerTopSpacing: {
    marginTop: 50,
  },
  mapButton: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mapButtonText: { color: '#000000', fontWeight: '600' },
  mapContainer: {
    marginTop: 12,
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  map: { flex: 1 },
  closeMapBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeMapBtnText: { color: '#fff' },
  header: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
    textAlign: 'center',
  },
  destinationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 25,
    backgroundColor: '#F8F8F8',
  },
  destinationText: {
    fontSize: 16,
  },
  closeIcon: {
    fontSize: 24,
    color: '#666',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '600',
  },
  arrows: {
    flexDirection: 'row',
    gap: 20,
  },
  arrow: {
    fontSize: 20,
    color: '#FF3951',
  },
  calendar: {
    marginTop: 10,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDay: {
    color: '#999',
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDay: {
    width: '14.28%',
    height: 40,
  },
  dayText: {
    fontSize: 16,
  },
  selectedDay: {
    backgroundColor: '#FFE5E8',
  },
  selectedDayText: {
    color: '#FF3951',
  },
  pastDayText: {
    color: '#CCC',
  },
  dateRange: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  createTripButton: {
    backgroundColor: '#FF3951',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  createTripButtonText: {
    color: 'white',
    fontSize: 16,
  },

  dropdown: { left: 0, right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 20,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10 },

  item: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#fff" },
  itemHover: { backgroundColor: "#f0f0f0" },
  itemSelected: { backgroundColor: "#d0d0d0" },
});
