import { Platform, StyleSheet } from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * Hook para obtener estilos comunes dinámicos según el tema
 */
export function useCommonStyles() {
  const AppColors = useAppColors();
  
  return {
    safeArea: {
      flex: 1,
      backgroundColor: AppColors.background,
    },
    backButtonContainer: {
      position: 'absolute' as const,
      top: Platform.OS === 'ios' ? 30 : 30,
      left: 16,
      zIndex: 10,
    },
    containerWithBackButton: {
      flex: 1,
      padding: 24,
      paddingTop: Platform.OS === 'ios' ? 80 : 60,
    },
    pageTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      marginBottom: 18,
    },
    input: {
      backgroundColor: AppColors.backgroundInput,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      fontSize: 16,
    },
  };
}

/**
 * @deprecated Use useCommonStyles() instead for theme-aware styles
 * Mantenido para compatibilidad temporal
 */
export const CommonStyles = {
  safeArea: {
    flex: 1,
    backgroundColor: '#FCFCFC', // Fallback estático
  },
  backButtonContainer: {
    position: 'absolute' as const,
    top: Platform.OS === 'ios' ? 30 : 30,
    left: 16,
    zIndex: 10,
  },
  containerWithBackButton: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 18,
  },
  input: {
    backgroundColor: '#F2F2F2', // Fallback estático
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
};
