// app/(tabs)/_layout.tsx  (or wherever your TabLayout sits)
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import TabBar from '@/components/ui/TabBar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Viajes',
        }}
      />
      {/* add your other screens here (map, profile, etc). They will be shown as tabs */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
        }}
      />
    </Tabs>
  );
}
