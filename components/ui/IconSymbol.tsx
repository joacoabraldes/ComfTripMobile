// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Partial<Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 *
 * Keys are SF-symbol-like names used throughout your app; values are MaterialIcons names.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',

  // added mappings requested by you:
  'airplane': 'flight',      // trips
  'map.fill': 'map',         // map
  'person.fill': 'person',   // profile
  'person.2.fill': 'group',  // community
  'mail.fill': 'email',      // email
  'phone': 'phone',          // phone
  'calendar': 'calendar-today', // date/birthdate
  'birthday.cake.fill': 'cake', // birthday
  'flag.fill': 'flag', // nationality/flag
  'globe': 'language', // language/globe
} as const satisfies Record<string, ComponentProps<typeof MaterialIcons>['name']>;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // runtime fallback if mapping is missing (defensive)
  const materialName = (MAPPING as Record<string, string>)[name] ?? 'help-outline';

  return <MaterialIcons color={color} size={size} name={materialName as ComponentProps<typeof MaterialIcons>['name']} style={style} />;
}
