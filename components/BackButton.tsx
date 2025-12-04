import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowIcon } from './icons/ArrowIcon';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
  size?: number;
}

export default function BackButton({ 
  onPress, 
  color = '#FF3951', 
  style,
  size = 24 
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      style={[styles.button, style]}
      activeOpacity={0.7}
    >
      <ArrowIcon 
        color={color} 
        width={size * 0.57} 
        height={size} 
        style={{ transform: [{ rotate: '180deg' }] }}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
