/**
 * Internationalization (i18n) configuration and utilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import esTranslations from './es';
import enTranslations from './en';

export type Language = 'es' | 'en';

const translations = {
  es: esTranslations,
  en: enTranslations,
};

const LANGUAGE_STORAGE_KEY = '@comftrip:language';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

/**
 * Simple template replacement function
 * Replaces {key} placeholders with values from params
 */
function replaceParams(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * Get translation by key path (e.g., 'trips.title' or 'common.loading')
 */
function getTranslation(translations: any, key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: any = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to key if translation not found
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  
  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string for key: ${key}`);
    return key;
  }
  
  return replaceParams(value, params);
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  // Start with default language immediately, don't block render
  const [language, setLanguageState] = useState<Language>('es');

  // Load saved language preference on mount (non-blocking)
  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      // Try to detect system language first (fast, no async needed)
      try {
        const systemLang = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0];
        if (systemLang === 'en' || systemLang === 'es') {
          setLanguageState(systemLang);
        }
      } catch (e) {
        // Ignore locale detection errors
      }

      // Then try to load saved preference (async, may fail)
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === 'es' || saved === 'en') {
          setLanguageState(saved);
        }
      } catch (storageError) {
        // AsyncStorage might not be available in some environments
        console.warn('Error loading language from storage:', storageError);
      }
    } catch (error) {
      // Fallback to default, don't break the app
      console.warn('Error loading language:', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const currentTranslations = translations[language] || translations.es; // Fallback to Spanish
    return getTranslation(currentTranslations, key, params);
  };

  // Always render children immediately, don't wait for language load
  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * Hook to use translations
 */
export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}

export default translations;


