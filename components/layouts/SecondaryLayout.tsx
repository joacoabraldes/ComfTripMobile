import React from 'react';
import { View, StyleSheet } from 'react-native';
import TopBar from '@/components/ui/TopBar';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFCFC',
  },
  content: {
    flex: 1,
  },
});

