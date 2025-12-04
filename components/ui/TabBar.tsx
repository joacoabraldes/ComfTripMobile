import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShadowColors } from '@/constants/Colors';
import { useAppColors } from '@/hooks/useAppColors';

const ICON_SIZE = 20;

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  explore: 'compass',
  trips: 'briefcase',
  map: 'map',
  community: 'people',
};

function getIconName(routeName: string): keyof typeof Ionicons.glyphMap {
  const key = routeName.toLowerCase();
  return (iconMap[key] ?? iconMap.home);
}

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets?.() ?? { bottom: 0, top: 0, left: 0, right: 0 };
  const bottomInset = insets.bottom || (Platform.OS === 'android' ? 16 : 0);
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);

  const BAR_HEIGHT = 50 + bottomInset;

  return (
    <View style={[styles.container, { height: BAR_HEIGHT, paddingBottom: bottomInset }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name) as string;

        const onPress = (e: GestureResponderEvent) => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () =>
          navigation.emit({ type: 'tabLongPress', target: route.key });

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            android_ripple={{ color: 'transparent' }}
            style={({ pressed }) => [
              styles.tabItem,
              isFocused && styles.tabItemFocused,
              pressed && styles.tabItemPressed,
            ]}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={getIconName(route.name)}
                size={ICON_SIZE}
                color={isFocused ? AppColors.primary : AppColors.textMutedDark}
              />
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.label,
                isFocused ? styles.labelActive : undefined,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppColors.backgroundTertiary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center', 
    paddingTop: 0,
    paddingHorizontal: 12,
    shadowColor: ShadowColors.black,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    padding: 4,
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 20,
    opacity: 1,
  },
  tabItemPressed: {
    opacity: 0.92,
  },
  tabItemFocused: {
    borderRadius: 20,
  },


  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },

  label: {
    textAlign: 'center',
    color: AppColors.textMutedDark, 
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '400' as any,
    lineHeight: 12,
    marginTop: 0,
  },
  labelActive: {
    color: AppColors.primary,
  },
});
