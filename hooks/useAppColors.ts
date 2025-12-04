/**
 * Hook to get theme-aware colors
 * Returns AppColors based on the current theme
 */

import { useMemo } from 'react';
import { useColorScheme } from './useColorScheme';
import { Colors } from '@/constants/Colors';

export function useAppColors() {
  const theme = useColorScheme() ?? 'light';
  const themeColors = Colors[theme];

  return useMemo(() => {
    if (theme === 'dark') {
      return {
        primary: themeColors.primary.primary,
        primaryLight: themeColors.primary.primaryLight,
        primaryLighter: themeColors.primary.primaryLighter,
        accent: themeColors.primary.accent,
        accentCard: themeColors.primary.accentCard,
        text: themeColors.textColors.primary,
        textSecondary: themeColors.textColors.secondary,
        textTertiary: themeColors.textColors.tertiary,
        textMuted: themeColors.textColors.muted,
        textMutedDark: themeColors.textColors.mutedDark,
        textDisabled: themeColors.textColors.disabled,
        background: themeColors.backgroundColors.secondary,
        backgroundPrimary: themeColors.backgroundColors.primary,
        backgroundTertiary: themeColors.backgroundColors.tertiary,
        backgroundInput: themeColors.backgroundColors.input,
        backgroundInputMuted: themeColors.backgroundColors.inputMuted,
        backgroundCard: themeColors.backgroundColors.card,
        backgroundSection: themeColors.backgroundColors.section,
        backgroundHover: themeColors.backgroundColors.hover,
        border: themeColors.borderColors.default,
        borderLight: themeColors.borderColors.light,
        error: themeColors.stateColors.error,
        success: themeColors.stateColors.success,
        successLight: themeColors.stateColors.successLight,
        white: themeColors.additionalColors.white,
        black: themeColors.additionalColors.black,
        overlay: themeColors.backgroundColors.overlay,
      };
    } else {
      // Light theme - use existing AppColors structure
      return {
        primary: themeColors.primary.primary,
        primaryLight: themeColors.primary.primaryLight,
        primaryLighter: themeColors.primary.primaryLighter,
        accent: themeColors.primary.accent,
        accentCard: themeColors.primary.accentCard,
        text: themeColors.textColors.primary,
        textSecondary: themeColors.textColors.secondary,
        textTertiary: themeColors.textColors.tertiary,
        textMuted: themeColors.textColors.muted,
        textMutedDark: themeColors.textColors.mutedDark,
        textDisabled: themeColors.textColors.disabled,
        background: themeColors.backgroundColors.secondary,
        backgroundPrimary: themeColors.backgroundColors.primary,
        backgroundTertiary: themeColors.backgroundColors.tertiary,
        backgroundInput: themeColors.backgroundColors.input,
        backgroundInputMuted: themeColors.backgroundColors.inputMuted,
        backgroundCard: themeColors.backgroundColors.card,
        backgroundSection: themeColors.backgroundColors.section,
        backgroundHover: themeColors.backgroundColors.hover,
        border: themeColors.borderColors.default,
        borderLight: themeColors.borderColors.light,
        error: themeColors.stateColors.error,
        success: themeColors.stateColors.success,
        successLight: themeColors.stateColors.successLight,
        white: themeColors.additionalColors.white,
        black: themeColors.additionalColors.black,
        overlay: themeColors.backgroundColors.overlay,
      };
    }
  }, [theme, themeColors]);
}

