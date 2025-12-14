import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors } from '@/hooks/useAppColors';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  // Optional third button (e.g., for retry actions)
  actionText?: string;
  onAction?: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  destructive = false,
  actionText,
  onAction,
}: ConfirmDialogProps) {
  const AppColors = useAppColors();
  const insets = useSafeAreaInsets();
  const styles = getStyles(AppColors, destructive);
  const hasAction = Boolean(actionText && onAction);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
          
          <View style={[styles.actions, hasAction && styles.actionsThreeButtons]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            
            {hasAction && (
              <TouchableOpacity
                style={[styles.button, styles.actionButton]}
                onPress={onAction}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>{actionText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, destructive ? styles.destructiveButton : styles.confirmButton]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={destructive ? styles.destructiveButtonText : styles.confirmButtonText}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const getStyles = (AppColors: ReturnType<typeof useAppColors>, destructive: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    dialog: {
      backgroundColor: AppColors.backgroundPrimary,
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
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
      padding: 24,
      paddingBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: AppColors.text,
      marginBottom: 12,
    },
    message: {
      fontSize: 16,
      color: AppColors.textSecondary,
      lineHeight: 22,
    },
    actions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: AppColors.borderLight,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    actionsThreeButtons: {
      flexWrap: 'wrap',
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 80,
    },
    cancelButton: {
      backgroundColor: AppColors.backgroundTertiary,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: AppColors.text,
    },
    confirmButton: {
      backgroundColor: AppColors.primary,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: AppColors.white,
    },
    destructiveButton: {
      backgroundColor: AppColors.error,
    },
    destructiveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: AppColors.white,
    },
    actionButton: {
      backgroundColor: AppColors.primary,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: AppColors.white,
    },
  });

