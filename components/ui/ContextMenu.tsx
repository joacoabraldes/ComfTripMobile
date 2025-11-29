import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { AppColors, ShadowColors } from '@/constants/Colors';

type MenuOption = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
};

type ContextMenuProps = {
  options: MenuOption[];
};

export default function ContextMenu({ options }: ContextMenuProps) {
  const [visible, setVisible] = useState(false);
  const [buttonLayout, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const buttonRef = useRef<View>(null);
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useTranslation();

  const handleButtonPress = () => {
    if (buttonRef.current) {
      buttonRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        setButtonLayout({ x, y, width, height });
        setVisible(true);
      });
    } else {
      setVisible(true);
    }
  };

  // Calcular posición del menú
  const menuRight = buttonLayout.x > 0 ? screenWidth - (buttonLayout.x + buttonLayout.width) : 16;

  return (
    <View style={styles.container}>
      <View ref={buttonRef} collapsable={false}>
        <TouchableOpacity
          onPress={handleButtonPress}
          style={styles.menuButton}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={22} color={AppColors.text} />
        </TouchableOpacity>
      </View>

      {visible && (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={() => setVisible(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
            <View style={[
              styles.menuWrapper,
              {
                top: buttonLayout.y + buttonLayout.height + 4,
                right: menuRight,
              }
            ]}>
              <View style={styles.menuContainer}>
                {options.map((option, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        option.onPress();
                        setVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      {option.icon && (
                        <Ionicons
                          name={option.icon}
                          size={20}
                          color={option.destructive ? AppColors.error : AppColors.text}
                          style={styles.menuIcon}
                        />
                      )}
                      <Text
                        style={[
                          styles.menuText,
                          option.destructive && styles.menuTextDestructive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                    {index < options.length - 1 && <View style={styles.separator} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: AppColors.overlay,
  },
  menuWrapper: {
    position: 'absolute',
    alignItems: 'flex-end',
  },
  menuContainer: {
    backgroundColor: AppColors.backgroundPrimary,
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 180,
    ...Platform.select({
      ios: {
        shadowColor: ShadowColors.black,
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 48,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    color: AppColors.text,
    fontWeight: '400',
  },
  menuTextDestructive: {
    color: AppColors.error,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.border,
    marginHorizontal: 20,
  },
});

