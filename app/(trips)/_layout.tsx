import React from 'react';
import { Stack } from 'expo-router';

export default function TripsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="add-trip" />
      <Stack.Screen name="trip-details" />
      <Stack.Screen name="trip-history" />
      <Stack.Screen name="trip-history-details" />
      <Stack.Screen name="add-activity" />
      <Stack.Screen name="edit-activity" />
      <Stack.Screen name="load-trip" />
    </Stack>
  );
}

