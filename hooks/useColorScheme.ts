import { useColorScheme as useRNColorScheme } from 'react-native';
import { useTheme } from './useTheme';

/**
 * Hook to get the current color scheme
 * Uses theme preference from useTheme hook
 */
export function useColorScheme() {
  const { effectiveTheme } = useTheme();
  return effectiveTheme;
}
