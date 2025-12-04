/**
 * Helper to translate category/interest slugs to localized names
 */

import { useCallback } from 'react';
import { useTranslation } from '@/i18n';

// Map of category slugs to translation keys
const CATEGORY_SLUG_TO_KEY: Record<string, string> = {
  'cultura': 'categories.culture',
  'gastronomia': 'categories.gastronomy',
  'naturaleza': 'categories.nature',
  'compras': 'categories.shopping',
  'deportes': 'categories.sports',
  'familia': 'categories.family',
  'fiestas': 'categories.parties',
  'relax': 'categories.relax',
};

// Map of category slugs to description translation keys
const CATEGORY_DESCRIPTION_KEY: Record<string, string> = {
  'cultura': 'categories.descriptions.culture',
  'gastronomia': 'categories.descriptions.gastronomy',
  'naturaleza': 'categories.descriptions.nature',
  'compras': 'categories.descriptions.shopping',
  'deportes': 'categories.descriptions.sports',
  'familia': 'categories.descriptions.family',
  'fiestas': 'categories.descriptions.parties',
  'relax': 'categories.descriptions.relax',
};

/**
 * Get translation key for a category slug
 */
export function getCategoryTranslationKey(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const normalizedSlug = String(slug).trim().toLowerCase();
  return CATEGORY_SLUG_TO_KEY[normalizedSlug] || null;
}

/**
 * Get translation key for a category description
 */
export function getCategoryDescriptionKey(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const normalizedSlug = String(slug).trim().toLowerCase();
  return CATEGORY_DESCRIPTION_KEY[normalizedSlug] || null;
}

/**
 * Hook to translate category names
 * Returns a memoized function that takes a slug and returns the translated name
 */
export function useCategoryTranslation() {
  const { t } = useTranslation();
  
  const translateFn = useCallback((slug: string | null | undefined, fallback?: string): string => {
    if (!slug) return fallback || '';
    const key = getCategoryTranslationKey(slug);
    if (key) {
      try {
        const translated = t(key);
        // If translation key doesn't exist, t() returns the key itself
        if (translated !== key) {
          return translated;
        }
      } catch (e) {
        // Translation key doesn't exist, use fallback
      }
    }
    return fallback || slug;
  }, [t]);
  
  return translateFn;
}

/**
 * Hook to translate category descriptions
 * Returns a memoized function that takes a slug and returns the translated description
 */
export function useCategoryDescriptionTranslation() {
  const { t } = useTranslation();
  
  const translateFn = useCallback((slug: string | null | undefined, fallback?: string): string => {
    if (!slug) return fallback || '';
    const key = getCategoryDescriptionKey(slug);
    if (key) {
      try {
        const translated = t(key);
        // If translation key doesn't exist, t() returns the key itself
        if (translated !== key) {
          return translated;
        }
      } catch (e) {
        // Translation key doesn't exist, use fallback
      }
    }
    return fallback || '';
  }, [t]);
  
  return translateFn;
}

/**
 * Direct translation function (for use outside React components)
 * Requires passing the translation function
 */
export function translateCategory(
  t: (key: string) => string,
  slug: string | null | undefined,
  fallback?: string
): string {
  if (!slug) return fallback || '';
  const key = getCategoryTranslationKey(slug);
  if (key) {
    try {
      const translated = t(key);
      if (translated !== key) {
        return translated;
      }
    } catch (e) {
      // Translation key doesn't exist, use fallback
    }
  }
  return fallback || slug;
}

/**
 * Direct translation function for category descriptions (for use outside React components)
 * Requires passing the translation function
 */
export function translateCategoryDescription(
  t: (key: string) => string,
  slug: string | null | undefined,
  fallback?: string
): string {
  if (!slug) return fallback || '';
  const key = getCategoryDescriptionKey(slug);
  if (key) {
    try {
      const translated = t(key);
      if (translated !== key) {
        return translated;
      }
    } catch (e) {
      // Translation key doesn't exist, use fallback
    }
  }
  return fallback || '';
}

