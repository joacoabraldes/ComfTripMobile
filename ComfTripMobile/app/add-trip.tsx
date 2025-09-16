import React, {use, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList} from 'react-native';
import countries from "world-countries";
import {allCountries, countryNames} from "country-region-data";
import { Stack, useRouter } from 'expo-router';
import { apiPost } from '@/helpers/api'; // <- uses your existing api helper

interface CalendarDay {
  date: number;
  selected: boolean;
}

export default function AddTrip() {
  const [destination, setDestination] =  useState<string | null>(null);
  const [country, setCountry]=useState<string | null>(null);
  const [province, setProvince]=useState<string|null>(null);
  const [openCountry, setOpenCountry] = useState(false);
  const [openProvince, setOpenProvince]= useState(false);
  const [search, setSearch] = useState("");
  const [searchProvince, setSearchProvince] = useState("");

  const today = new Date();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Lista filtrada de países
  const filteredCountries = countryNames.filter((c) =>
      c.toLowerCase().includes(search.toLowerCase())
  );

// Provincias disponibles del país seleccionado
  const availableProvinces = country
      ? allCountries.find((c) => c[0] === country)?.[2] || []
      : [];

// Lista filtrada de provincias
  const filteredProvinces = availableProvinces.filter((p: [string, string]) =>
      p[0].toLowerCase().includes(searchProvince.toLowerCase())
  );

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
    today.setHours(0,0,0,0); // normalizar (ignorar horas)
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

  // NEW: save trip to backend, then navigate to the same route as before
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
      const payload = {
        destination: destination.trim(),
        start_date: formatISODate(startDate),
        end_date: formatISODate(endDate),
        budget: null,
        notes: null,
      };

      // call your backend POST /trips
      await apiPost('/trips', payload);

      // preserve original navigation: go to /load-trip after saving
      router.push('/load-trip');
    } catch (err: any) {
      console.error('Error saving trip:', err);
      const message = (err && err.message) || 'No se pudo guardar el viaje';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  return (

      <View style={styles.container}>
        <Text style={styles.header}>Selecciona a donde vas a viajar</Text>
      <View style={[styles.destinationInput, { marginBottom: openCountry ? 0 : 20, flexDirection: "row", backgroundColor: openCountry ? "white" : 'rgba(196,196,196,0.2)', borderWidth: openCountry ? 2 : 0 }]}
            onFocus={()=>setOpenCountry(true)}>
        <TextInput
            style={[{ flex:1, borderWidth:0, outline:"none", color: country? "#252525" : "rgba(0,0,0,0.5)"}]}
            placeholder={country ? country : "Seleccionar pais"}
            value={search}
            onChangeText={setSearch}
        />
        <Text
            style={{ fontSize: 16, marginLeft: "auto", transform: [{ rotate: openCountry ? "0deg" : "180deg" }]}}
            onPress={() => setOpenCountry(!openCountry)}
        >
          ▲
        </Text>
      </View>
        {openCountry && (
            <View style={styles.dropdown}>
              <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                      <TouchableOpacity
                          style={[styles.item, country === item && styles.itemSelected]}
                          onPress={() => {
                            setCountry(item);
                            setProvince(null); // limpiar provincia al cambiar país
                            setDestination(null);
                            setSearch("");
                            setOpenCountry(false);
                          }}
                      >
                        <Text>{item}</Text>
                      </TouchableOpacity>
                  )}
              />
            </View>
        )}

        <View style={[styles.destinationInput, { marginBottom: openProvince ? 0 : 20, flexDirection: "row", backgroundColor: openProvince ? "white" : 'rgba(196,196,196,0.2)', borderWidth: openProvince ? 2 : 0 }]}
              onFocus={()=>setOpenProvince(true)}>
          <TextInput
              style={[{ flex:1, borderWidth:0, outline:"none", color: province? "#252525" : "rgba(0,0,0,0.5)"}]}
              placeholder={province ? province: "Seleccionar provincia"}
              value={searchProvince}
              onChangeText={setSearchProvince}
          />
          <Text
              style={{ fontSize: 16, marginLeft: "auto", transform: [{ rotate: openProvince ? "0deg" : "180deg" }]}}
              onPress={() => setOpenProvince(!openProvince)}
          >
            ▲
          </Text>
        </View>
        {openProvince && (
            <View style={styles.dropdown}>
              <FlatList
                  data={filteredProvinces}
                  keyExtractor={(item, idx) => idx.toString()}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                      <TouchableOpacity
                          style={[styles.item, province === item[0] && styles.itemSelected]}
                          onPress={() => {
                            setProvince(item[0]);
                            setSearchProvince("");
                            setDestination(`${province}, ${country}`);
                            setOpenProvince(false);
                          }}
                      >
                        <Text>{item[0]}</Text>
                      </TouchableOpacity>
                  )}
              />
            </View>
        )}
      <Text style={styles.header}>Selecciona las fechas que vas a estar</Text>
      
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
                    disabled={past} // 👈 no clickeable si es pasado
                    onPress={() => handleDateSelect(day.date)}
                >
                  <Text
                      style={[
                        styles.dayText,
                        past && styles.pastDayText,         // 👈 gris si es pasado
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
          Se armará un plan turístico para {destination} del {startDate.getDate()}/{startDate.getMonth() + 1}/{startDate.getFullYear()} al {endDate.getDate()}/{endDate.getMonth() + 1}/{endDate.getFullYear()}
        </Text>
      )}

      <TouchableOpacity
        style={styles.createTripButton}
        onPress={handleSaveTrip}
        disabled={saving}
      >
        <Text style={styles.createTripButtonText}>Armar Viaje</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addDestinationButton}>
        <Text style={styles.addDestinationButtonText}>+ Agregar otro destino</Text>
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
    color: '#CCC', // gris clarito
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
  addDestinationButton: {
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  addDestinationButtonText: {
    color: '#666',
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
