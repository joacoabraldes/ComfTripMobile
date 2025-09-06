import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function LoadTrip() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} /> {/* Hide the header */}
      <Text style={styles.text}>
        Estamos calculando los mejores lugares para visitar en tu viaje
      </Text>
      <Image
        source={require('../assets/images/loading.gif')}
        style={styles.loadingImage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // Center vertically
    alignItems: 'center', // Center horizontally
    backgroundColor: 'white',
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingImage: {
    width: 100, // Adjust size as needed
    height: 100, // Adjust size as needed
  },
});