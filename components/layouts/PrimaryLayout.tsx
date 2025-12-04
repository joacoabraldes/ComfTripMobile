import React from 'react';
import { View, StyleSheet } from 'react-native';
import TopBar from '@/components/ui/TopBar';
import { AppColors } from '@/constants/Colors';

type PrimaryLayoutProps = {
  children: React.ReactNode;
  title?: string;
  showProfileIcon?: boolean;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
};

/**
 * Layout para pantallas primarias (tabs)
 * Incluye TopBar con título y icono de perfil
 * El BottomBar (TabBar) se maneja automáticamente por el TabLayout
 */
export default function PrimaryLayout({
  children,
  title,
  showProfileIcon = true,
  leftActions,
  rightActions,
}: PrimaryLayoutProps) {
  return (
    <View style={styles.container}>
      <TopBar title={title} showProfileIcon={showProfileIcon} leftActions={leftActions} rightActions={rightActions} variant="primary" />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    flex: 1,
  },
});

