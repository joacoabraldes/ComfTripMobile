import React from 'react';
import { View, StyleSheet } from 'react-native';
import TopBar from '@/components/ui/TopBar';
import { useAppColors } from '@/hooks/useAppColors';

type SecondaryLayoutProps = {
  children: React.ReactNode;
  title?: string;
  onBackPress?: () => void;
  rightActions?: React.ReactNode; // Botones adicionales (compartir, eliminar, etc)
};

/**
 * Layout para pantallas secundarias
 * Incluye TopBar con botón de retroceso y acciones opcionales a la derecha
 * NO incluye BottomBar
 */
export default function SecondaryLayout({
  children,
  title,
  onBackPress,
  rightActions,
}: SecondaryLayoutProps) {
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  
  return (
    <View style={styles.container}>
      <TopBar
        title={title}
        showBackButton
        onBackPress={onBackPress}
        rightActions={rightActions}
        variant="secondary"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    flex: 1,
  },
});

