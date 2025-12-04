/**
 * Paleta de colores centralizada de ComfTrip
 * 
 * Todos los colores usados en la aplicación deben estar definidos aquí.
 * Usa estos colores importando: import { Colors } from '@/constants/Colors';
 */

// Colores primarios y de marca
const PrimaryColors = {
  primary: '#FF3951', // Color principal (rosa/rojo)
  primaryLight: '#FFE5E8', // Versión clara para fondos
  primaryLighter: '#FFF0F2', // Versión muy clara
  primaryDark: '#E6283A', // Versión oscura (para hover/pressed)
  accent: '#FFD8D8', // Acento para badges y elementos destacados
  accentCard: '#F8F1EF', // Fondo de cards con acento
} as const;

// Colores de texto
const TextColors = {
  primary: '#252525', // Texto principal
  secondary: '#666666', // Texto secundario
  tertiary: '#757575', // Texto terciario
  muted: 'rgba(0, 0, 0, 0.5)', // Texto deshabilitado/placeholder
  mutedDark: '#999999', // Texto deshabilitado alternativo
  white: '#FFFFFF', // Texto sobre fondos oscuros
  light: '#CACACA', // Texto muy claro
  disabled: '#CCCCCC', // Texto deshabilitado
  onPrimary: '#FFFFFF', // Texto sobre color primario
} as const;

// Colores de fondo
const BackgroundColors = {
  primary: '#FFFFFF', // Fondo principal (blanco)
  secondary: '#FCFCFC', // Fondo secundario (gris muy claro)
  tertiary: '#F8F8F8', // Fondo terciario
  input: '#F2F2F2', // Fondo de inputs
  inputMuted: 'rgba(196, 196, 196, 0.2)', // Fondo de inputs alternativo
  card: '#FFFFFF', // Fondo de cards
  cardSecondary: '#F8F9FA', // Fondo de cards secundario
  section: '#F8F9FA', // Fondo de secciones
  hover: '#F0F0F0', // Fondo hover
  selected: '#D0D0D0', // Fondo seleccionado
  overlay: 'rgba(0, 0, 0, 0.2)', // Overlay para modales
} as const;

// Colores de borde
const BorderColors = {
  default: '#E0E0E0', // Borde por defecto
  light: '#E9ECEF', // Borde claro
  medium: '#CCCCCC', // Borde medio
  dark: '#000000', // Borde oscuro
  input: '#E0E0E0', // Borde de inputs
  divider: '#E0E0E0', // Divisor
} as const;

// Colores de estado
const StateColors = {
  success: '#2E7D32', // Éxito
  successLight: '#E8F5E8', // Éxito claro (fondo)
  successBorder: '#D4E6D4', // Borde éxito
  error: '#FF3B30', // Error/Destructivo
  errorLight: '#FFEBEE', // Error claro (fondo)
  warning: '#FF9800', // Advertencia
  info: '#2196F3', // Información
} as const;

// Colores de shadow
const ShadowColors = {
  black: '#000000', // Negro para sombras
  // Las opacidades se definen en los estilos (shadowOpacity)
} as const;

// Colores adicionales específicos
const AdditionalColors = {
  green: '#2E7D32', // Verde (puede ser success)
  gray: '#757575', // Gris
  darkGray: '#495057', // Gris oscuro
  lightGray: '#6C757D', // Gris claro
  black: '#000000', // Negro
  white: '#FFFFFF', // Blanco
  transparent: 'transparent', // Transparente
} as const;

// Exportación unificada (mantiene compatibilidad con el sistema de temas)
export const Colors = {
  light: {
    // Mantener compatibilidad con el sistema existente
    text: TextColors.primary,
    background: BackgroundColors.secondary,
    tint: PrimaryColors.primary,
    icon: TextColors.secondary,
    tabIconDefault: TextColors.secondary,
    tabIconSelected: PrimaryColors.primary,
    
    // Nueva paleta unificada
    primary: PrimaryColors,
    textColors: TextColors,
    backgroundColors: BackgroundColors,
    borderColors: BorderColors,
    stateColors: StateColors,
    shadowColors: ShadowColors,
    additionalColors: AdditionalColors,
  },
  dark: {
    // Compatibilidad con el sistema existente
    text: '#ECEDEE',
    background: '#151718',
    tint: '#FF3951', // Mantener el color primario
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#FF3951',
    
    // Nueva paleta unificada para modo oscuro
    primary: {
      primary: '#FF3951', // Mantener el color primario
      primaryLight: '#4A1F24', // Versión oscura para fondos
      primaryLighter: '#2A1215', // Versión muy oscura
      primaryDark: '#E6283A',
      accent: '#4A1F24',
      accentCard: '#2A1215',
    },
    textColors: {
      primary: '#ECEDEE',
      secondary: '#9BA1A6',
      tertiary: '#6C757D',
      muted: 'rgba(255, 255, 255, 0.5)',
      mutedDark: '#6C757D',
      white: '#FFFFFF',
      light: '#4A5568',
      disabled: '#4A5568',
      onPrimary: '#FFFFFF',
    },
    backgroundColors: {
      primary: '#1A1A1A',
      secondary: '#151718',
      tertiary: '#0F0F0F',
      input: '#2A2A2A',
      inputMuted: 'rgba(255, 255, 255, 0.1)',
      card: '#1F1F1F',
      cardSecondary: '#252525',
      section: '#1A1A1A',
      hover: '#2A2A2A',
      selected: '#3A3A3A',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
    borderColors: {
      default: '#2A2A2A',
      light: '#1F1F1F',
      medium: '#3A3A3A',
      dark: '#FFFFFF',
      input: '#2A2A2A',
      divider: '#2A2A2A',
    },
    stateColors: {
      success: '#4CAF50',
      successLight: '#1B3E1D',
      successBorder: '#2E5C30',
      error: '#FF5252',
      errorLight: '#3D1F1F',
      warning: '#FF9800',
      info: '#2196F3',
    },
    shadowColors: {
      black: '#000000',
    },
    additionalColors: {
      green: '#4CAF50',
      gray: '#6C757D',
      darkGray: '#4A5568',
      lightGray: '#9BA1A6',
      black: '#000000',
      white: '#FFFFFF',
      transparent: 'transparent',
    },
  },
} as const;

// Exportación directa de los colores principales para fácil acceso
// Uso: Colors.primary.primary, Colors.text.primary, etc.
export {
  PrimaryColors,
  TextColors,
  BackgroundColors,
  BorderColors,
  StateColors,
  ShadowColors,
  AdditionalColors,
};

// Exportación de colores más usados como alias para facilitar el acceso
export const AppColors = {
  primary: PrimaryColors.primary,
  primaryLight: PrimaryColors.primaryLight,
  primaryLighter: PrimaryColors.primaryLighter,
  accent: PrimaryColors.accent,
  accentCard: PrimaryColors.accentCard,
  text: TextColors.primary,
  textSecondary: TextColors.secondary,
  textTertiary: TextColors.tertiary,
  textMuted: TextColors.muted,
  textMutedDark: TextColors.mutedDark,
  textDisabled: TextColors.disabled,
  background: BackgroundColors.secondary,
  backgroundPrimary: BackgroundColors.primary,
  backgroundTertiary: BackgroundColors.tertiary,
  backgroundInput: BackgroundColors.input,
  backgroundInputMuted: BackgroundColors.inputMuted,
  backgroundCard: BackgroundColors.card,
  backgroundSection: BackgroundColors.section,
  backgroundHover: BackgroundColors.hover,
  border: BorderColors.default,
  borderLight: BorderColors.light,
  error: StateColors.error,
  success: StateColors.success,
  successLight: StateColors.successLight,
  white: AdditionalColors.white,
  black: AdditionalColors.black,
  overlay: BackgroundColors.overlay,
} as const;
