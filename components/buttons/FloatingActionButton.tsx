import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
  ViewStyle,
  Platform,
} from 'react-native';
import { ShadowColors } from '@/constants/Colors';
import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onPress?: (e: GestureResponderEvent) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  size?: number;
  backgroundColor?: string;
  style?: ViewStyle;
  bottom?: number;
  right?: number;
  left?: number;
  accessibilityLabel?: string;
  activeOpacity?: number;
};

export default function FloatingActionButton({
  onPress,
  icon = 'add',
  iconSize = 32,
  iconColor,
  size = 64,
  backgroundColor,
  style,
  bottom,
  right,
  left,
  accessibilityLabel,
  activeOpacity = 0.85,
}: Props) {
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const finalIconColor = iconColor ?? AppColors.white;
  const finalBackgroundColor = backgroundColor ?? AppColors.primary;
  
  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: finalBackgroundColor,
          bottom,
          right,
          left,
        },
        style,
      ]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={activeOpacity}
    >
      <Ionicons name={icon} size={iconSize} color={finalIconColor} />
    </TouchableOpacity>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  fab: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: ShadowColors.black,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
});

