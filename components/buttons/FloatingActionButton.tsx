import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
  ViewStyle,
  Platform,
} from 'react-native';
import { AppColors, ShadowColors } from '@/constants/Colors';
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
  iconColor = AppColors.white,
  size = 64,
  backgroundColor = AppColors.primary,
  style,
  bottom,
  right,
  left,
  accessibilityLabel,
  activeOpacity = 0.85,
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
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
      <Ionicons name={icon} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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

