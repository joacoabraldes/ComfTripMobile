import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { TranslationProvider } from '@/i18n';
import { ThemeProvider as CustomThemeProvider } from '@/hooks/useTheme';
import ThemedRootContent from './ThemedRootContent';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <TranslationProvider>
      <CustomThemeProvider>
        <ThemedRootContent />
      </CustomThemeProvider>
    </TranslationProvider>
  );
}
