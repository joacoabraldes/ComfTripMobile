import React from 'react';
import { SafeAreaView, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import PrimaryButton from '@/components/buttons/PrimaryButton';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();

  const btnHeight = Math.round(Math.max(44, Math.min(64, width * 0.14)));
  const btnRadius = Math.round(btnHeight * 0.22);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <PrimaryButton
          title="Nuevo Viaje"
          onPress={() => router.push('/add-trip')}
          height={btnHeight}
          borderRadius={btnRadius}
          style={{ width: '70%' }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FCFCFC' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
