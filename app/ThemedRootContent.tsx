import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/hooks/useTheme';

export default function ThemedRootContent() {
  const { effectiveTheme } = useTheme();

  return (
    <ThemeProvider key={effectiveTheme} value={effectiveTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(trips)" />
        <Stack.Screen name="(profile)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

