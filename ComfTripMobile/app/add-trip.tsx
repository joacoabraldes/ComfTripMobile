import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Stack } from 'expo-router';

interface CalendarDay {
  date: number;
  selected: boolean;
}

export default function AddTrip() {
  const [destination, setDestination] = useState('Roma, Italia');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateCalendarDays = () => {
    const year = 2024;
    const month = 5; // Junio (0-based)
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days: CalendarDay[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: i, selected: false });
    }
    return { days, firstDayOfMonth };
  };

  const { days, firstDayOfMonth } = generateCalendarDays();

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(2024, 5, day);
    
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
    if (!endDate) return startDate.getDate() === day;
    
    const currentDate = new Date(2024, 5, day);
    return currentDate >= startDate && currentDate <= endDate;
  };

  const weekDays = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <Text style={styles.header}>Selecciona a donde vas a viajar</Text>
      <Pressable style={styles.destinationInput}>
        <Text style={styles.destinationText}>{destination}</Text>
        <Text style={styles.closeIcon}>×</Text>
      </Pressable>

      <Text style={styles.header}>Selecciona las fechas que vas a estar</Text>
      
      <View style={styles.calendarHeader}>
        <Text style={styles.monthYear}>Junio 2024</Text>
        <View style={styles.arrows}>
          <Text style={styles.arrow}>‹</Text>
          <Text style={styles.arrow}>›</Text>
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
          Se armará un plan turístico para Roma, Italia del {startDate.getDate()}/6/24 al {endDate.getDate()}/6/24
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