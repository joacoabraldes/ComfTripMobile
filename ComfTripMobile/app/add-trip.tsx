import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Stack } from 'expo-router';

interface CalendarDay {
  date: number;
  selected: boolean;
}

export default function AddTrip() {
  const [destination, setDestination] = useState('Roma, Italia');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(5); // June (0-based)
  const [currentYear, setCurrentYear] = useState(2024);

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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <Text style={styles.header}>Selecciona a donde vas a viajar</Text>
      <TextInput
        style={styles.destinationInput}
        value={destination}
        onChangeText={setDestination}
        placeholder="Ingresa tu destino"
      />

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
          
          {days.map((day) => (
            <TouchableOpacity
              key={day.date}
              style={[
                styles.day,
                isDateInRange(day.date) && styles.selectedDay
              ]}
              onPress={() => handleDateSelect(day.date)}
            >
              <Text style={[
                styles.dayText,
                isDateInRange(day.date) && styles.selectedDayText
              ]}>
                {day.date}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {startDate && endDate && (
        <Text style={styles.dateRange}>
          Se armará un plan turístico para {destination} del {startDate.getDate()}/{startDate.getMonth() + 1}/{startDate.getFullYear()} al {endDate.getDate()}/{endDate.getMonth() + 1}/{endDate.getFullYear()}
        </Text>
      )}

      <TouchableOpacity style={styles.createTripButton}>
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
    marginBottom: 20,
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
});