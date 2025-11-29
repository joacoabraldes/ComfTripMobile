import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';

type TopBarProps = {
  // Para pantallas primarias (tabs)
  title?: string;
  showProfileIcon?: boolean;
  
  // Para pantallas secundarias
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightActions?: React.ReactNode; // Botones adicionales a la derecha (compartir, eliminar, etc)
  
  // Estilo
  variant?: 'primary' | 'secondary';
};

export default function TopBar({
  title,
  showProfileIcon = false,
  showBackButton = false,
  onBackPress,
  rightActions,
  variant = 'primary',
}: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Obtener título de la ruta actual si no se proporciona (memoizado para evitar re-renders)
  const displayTitle = useMemo(() => {
    if (title) return title;
    
    const routeMap: Record<string, string> = {
      '/home': t('tabs.home'),
      '/trips': t('tabs.trips'),
      '/map': t('tabs.map'),
      '/explore': t('tabs.explore'),
      '/community': t('tabs.community'),
      '/profile': t('profile.editProfile'),
    };
    
    return routeMap[pathname] || 'ComfTrip';
  }, [title, pathname, t]);

  const handleProfilePress = () => {
    router.push('/profile');
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View 
      style={[
        styles.container,
        { 
          paddingTop: insets.top,
          height: 44 + insets.top,
        },
        variant === 'secondary' && styles.containerSecondary
      ]}
    >
      <View style={styles.content}>
        {/* Left side */}
        <View style={styles.leftSection}>
          {showBackButton && (
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#252525" />
            </TouchableOpacity>
          )}
          <Text style={styles.title} numberOfLines={1}>
            {displayTitle}
          </Text>
        </View>

        {/* Right side */}
        <View style={styles.rightSection}>
          {rightActions}
          {showProfileIcon && (
            <TouchableOpacity
              onPress={handleProfilePress}
              style={styles.profileButton}
              activeOpacity={0.7}
            >
              <Ionicons name="person-circle-outline" size={28} color="#252525" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  containerSecondary: {
    backgroundColor: '#FCFCFC',
  },
  content: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#252525',
    marginLeft: 0,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginLeft: 8,
  },
  profileButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

