import { Platform, StyleSheet } from 'react-native';
import { AppColors } from './Colors';

/**
 * Estilos compartidos comunes en toda la aplicación
 */
export const CommonStyles = StyleSheet.create({
  // SafeAreaView común
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.background,
  },

  // Contenedor para el botón de volver
  backButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 30 : 30,
    left: 16,
    zIndex: 10,
  },

  // Contenedor común para páginas con formularios
  containerWithBackButton: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
  },

  // Título común
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 18,
  },

  // Input común
  input: {
    backgroundColor: AppColors.backgroundInput,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
});
