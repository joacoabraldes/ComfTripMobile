/**
 * Theme management hook
 * Supports 'light', 'dark', and 'auto' (system) modes
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Storage helper (works with AsyncStorage on native, localStorage on web)
let AsyncStorage: any;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  // Fallback to localStorage for web
  AsyncStorage = null;
}

export type ThemeMode = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = '@comftrip:theme';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  effectiveTheme: 'light' | 'dark';
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to get item from storage
async function getStorageItem(key: string): Promise<string | null> {
  if (AsyncStorage) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  } else if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

// Helper to set item in storage
async function setStorageItem(key: string, value: string): Promise<void> {
  if (AsyncStorage) {
    try {
      await AsyncStorage.setItem(key, value);
      return;
    } catch (e) {
      // Ignore
    }
  } else if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await getStorageItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'auto') {
        setThemeModeState(saved);
      }
    } catch (error) {
      console.warn('Error loading theme from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await setStorageItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Calculate effective theme based on mode
  // Use useEffect to track system color scheme changes when in auto mode
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(
    themeMode === 'auto' ? (systemColorScheme ?? 'light') : themeMode
  );

  useEffect(() => {
    const newEffectiveTheme = themeMode === 'auto' 
      ? (systemColorScheme ?? 'light')
      : themeMode;
    setEffectiveTheme(newEffectiveTheme);
  }, [themeMode, systemColorScheme]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, effectiveTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

