import { View, type ViewProps } from 'react-native';

import { useAppColors } from '@/hooks/useAppColors';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const AppColors = useAppColors();
  const backgroundColor = lightColor || darkColor || AppColors.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
