import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useTheme } from './useTheme';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 * Uses theme preference from useTheme hook
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { effectiveTheme, isLoading } = useTheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated || isLoading) {
    return 'light';
  }

  return effectiveTheme;
}
