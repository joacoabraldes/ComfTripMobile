import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  GestureResponderEvent,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';

type Props = {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  activeOpacity?: number;
};

export default function TextButton({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
  activeOpacity = 0.7,
}: Props) {
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={[styles.button, style]}
    >
      <Text style={[styles.text, disabled && styles.textDisabled, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: AppColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  textDisabled: {
    color: AppColors.textDisabled,
    opacity: 0.5,
  },
});

