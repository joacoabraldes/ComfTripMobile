import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  GestureResponderEvent,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconProps = React.ComponentProps<typeof IconSymbol>;
type IconName = IconProps['name'];

const iconMap: Record<string, IconName> = {
  home: 'house.fill' as IconName,
  explore: 'paperplane.fill' as IconName,
  trips: 'airplane' as IconName,
  map: 'map.fill' as IconName,
  perfil: 'person.fill' as IconName,
  profile: 'person.fill' as IconName,
};

function getIconName(routeName: string): IconName {
  const key = routeName.toLowerCase();
  return (iconMap[key] ?? iconMap.home) as IconName;
}

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets?.() ?? { bottom: 0, top: 0, left: 0, right: 0 };
  const bottomInset = insets.bottom || (Platform.OS === 'android' ? 16 : 0);

  const ICON_SIZE = 24;
  const BAR_HEIGHT = 70 + bottomInset;

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
              <IconSymbol
                name={getIconName(route.name)}
                color={isFocused ? '#FF3951' : '#868686'}
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EEEEEE',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start', 
    paddingTop: 0,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    padding: 8,
    flexDirection: 'column',
    justifyContent: 'flex-end', 
    alignItems: 'center',
    marginHorizontal: 6,
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
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  label: {
    textAlign: 'center',
    color: '#868686', 
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '400' as any,
    lineHeight: 16,
    marginTop: 0,
  },
  labelActive: {
    color: '#FF3951',
  },
});
