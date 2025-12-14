import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors } from '@/hooks/useAppColors';

export type SnackbarType = 'success' | 'error' | 'warning' | 'info';

export interface SnackbarMessage {
  id: string;
  message: string;
  type: SnackbarType;
  duration?: number;
}

interface SnackbarProps {
  message: SnackbarMessage | null;
  onDismiss: (id: string) => void;
}

export default function Snackbar({ message, onDismiss }: SnackbarProps) {
  const AppColors = useAppColors();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        handleDismiss();
      }, message.duration || 4000);

      return () => clearTimeout(timer);
    } else {
      // Animate out
      handleDismiss();
    }
  }, [message]);

  const handleDismiss = () => {
    if (!message) return;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(message.id);
    });
  };

  if (!message) return null;

  const getSnackbarStyles = () => {
    switch (message.type) {
      case 'success':
        return {
          backgroundColor: AppColors.success,
          icon: 'checkmark-circle' as const,
        };
      case 'error':
        return {
          backgroundColor: AppColors.error,
          icon: 'close-circle' as const,
        };
      case 'warning':
        return {
          backgroundColor: '#FF9800',
          icon: 'warning' as const,
        };
      case 'info':
        return {
          backgroundColor: '#2196F3',
          icon: 'information-circle' as const,
        };
      default:
        return {
          backgroundColor: AppColors.primary,
          icon: 'information-circle' as const,
        };
    }
  };

  const { backgroundColor, icon } = getSnackbarStyles();
  const styles = getStyles(AppColors, backgroundColor);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 16,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={icon} size={24} color={AppColors.white} style={styles.icon} />
        <Text style={styles.message} numberOfLines={3}>
          {message.message}
        </Text>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={AppColors.white} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const getStyles = (AppColors: ReturnType<typeof useAppColors>, backgroundColor: string) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: 16,
      right: 16,
      zIndex: 9999,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 56,
    },
    icon: {
      marginRight: 12,
    },
    message: {
      flex: 1,
      color: AppColors.white,
      fontSize: 15,
      fontWeight: '500',
      lineHeight: 20,
    },
    closeButton: {
      marginLeft: 12,
      padding: 4,
    },
  });

