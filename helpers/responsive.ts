/**
 * Utilidades para cálculos responsivos basados en el ancho de la pantalla
 */

/**
 * Calcula un valor responsivo basado en el ancho de la pantalla
 * @param width - Ancho de la pantalla
 * @param factor - Factor multiplicador (ej: 0.033 para 3.3% del ancho)
 * @param min - Valor mínimo
 * @param max - Valor máximo
 * @returns Valor redondeado entre min y max
 */
export function responsiveSize(width: number, factor: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, width * factor)));
}

/**
 * Calcula un valor responsivo simple (sin límites min/max)
 * @param width - Ancho de la pantalla
 * @param factor - Factor multiplicador
 * @returns Valor redondeado
 */
export function responsiveValue(width: number, factor: number): number {
  return Math.round(width * factor);
}

/**
 * Calcula tamaños de fuente responsivos
 */
export function getResponsiveFontSizes(width: number) {
  return {
    small: responsiveSize(width, 0.033, 12, 14),
    medium: responsiveSize(width, 0.038, 14, 16),
    large: responsiveSize(width, 0.043, 16, 18),
    title: responsiveSize(width, 0.07, 20, 28),
    titleLarge: responsiveSize(width, 0.08, 24, 32),
    subtitle: responsiveSize(width, 0.04, 14, 16),
    copy: responsiveSize(width, 0.048, 14, 20),
    label: responsiveSize(width, 0.05, 15, 20),
  };
}

/**
 * Calcula valores de padding responsivos
 */
export function getResponsivePadding(width: number) {
  return {
    small: responsiveSize(width, 0.03, 10, 12),
    medium: responsiveSize(width, 0.035, 12, 14),
    large: responsiveSize(width, 0.04, 14, 16),
    horizontal: responsiveValue(width, 0.06),
  };
}

/**
 * Calcula valores de altura responsivos
 */
export function getResponsiveHeights(width: number, height?: number) {
  return {
    input: responsiveSize(width, 0.12, 44, 56),
    button: responsiveSize(width, 0.14, 44, 60),
    buttonSmall: responsiveSize(width, 0.13, 44, 64),
    illustration: height ? responsiveSize(height, 0.22, 120, 220) : undefined,
  };
}

/**
 * Calcula valores de border radius responsivos
 */
export function getResponsiveBorderRadius(width: number, buttonHeight?: number) {
  return {
    default: responsiveSize(width, 0.03, 10, 12),
    button: buttonHeight ? Math.round(buttonHeight * 0.22) : responsiveSize(width, 0.03, 8, 12),
  };
}

/**
 * Calcula valores de espaciado responsivos
 */
export function getResponsiveSpacing(width: number, height?: number) {
  return {
    small: responsiveSize(width, 0.02, 8, 12),
    medium: responsiveSize(width, 0.03, 12, 16),
    large: responsiveSize(width, 0.04, 16, 20),
    vertical: height ? responsiveSize(height, 0.04, 16, 48) : undefined,
    bottom: height ? responsiveSize(height, 0.02, 12, 40) : undefined,
  };
}

/**
 * Calcula valores de ancho responsivos
 */
export function getResponsiveWidths(width: number) {
  return {
    button: responsiveSize(width, 0.83, 240, 320),
    buttonSmall: responsiveSize(width, 0.14, 40, 56),
    illustration: responsiveValue(width, 0.52),
    contentMax: responsiveValue(width, 0.94),
  };
}

/**
 * Obtiene todos los valores responsivos comunes de una vez
 */
export function getResponsiveValues(width: number, height?: number) {
  const fontSizes = getResponsiveFontSizes(width);
  const padding = getResponsivePadding(width);
  const heights = getResponsiveHeights(width, height);
  const borderRadius = getResponsiveBorderRadius(width, heights.button);
  const spacing = getResponsiveSpacing(width, height);
  const widths = getResponsiveWidths(width);

  return {
    fontSizes,
    padding,
    heights,
    borderRadius,
    spacing,
    widths,
  };
}

