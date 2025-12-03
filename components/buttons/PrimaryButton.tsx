import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  GestureResponderEvent,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { AppColors } from '@/constants/Colors';

type Props = {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle | any;
  textStyle?: TextStyle | any;
  rightIcon?: React.ReactNode;
  activeOpacity?: number;
  disabled?: boolean;
  children?: React.ReactNode; // <-- add this line
};

export default function PrimaryButton({
  title,
  onPress,
  height = 50,
  borderRadius = 10,
  style,
  textStyle,
  rightIcon,
  activeOpacity = 0.9,
  disabled = false,
  children,
}: Props) {
  function renderChildren(child: React.ReactNode) {
    if (typeof child === 'string' || typeof child === 'number') {
      return <Text style={[styles.title, textStyle]}>{child}</Text>;
    }
    if (Array.isArray(child)) {
      return child.map((c, i) =>
        typeof c === 'string' || typeof c === 'number'
          ? <Text key={i} style={[styles.title, textStyle]}>{c}</Text>
          : c
      );
    }
    return child;
  }

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { height, borderRadius },
        disabled && styles.buttonDisabled,
        style
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        {title ? (
          <Text style={[
            styles.title,
            disabled && styles.titleDisabled,
            textStyle
          ]}>
            {title}
          </Text>
        ) : null}
        {renderChildren(children)}
        {rightIcon ? <View style={styles.iconWrap}>{rightIcon}</View> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  buttonDisabled: {
    //backgroundColor: AppColors.backgroundInput,
    opacity: 0.6,
  },
  title: {
    color: AppColors.white,
    fontSize: 20,
    fontWeight: '600',
  },
  titleDisabled: {
    color: AppColors.textDisabled,
  },
  iconWrap: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
