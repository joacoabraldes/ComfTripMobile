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
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { height, borderRadius }, style]}
    >
      <Text style={[styles.title, textStyle]}>{title}</Text>
      {rightIcon ? <View style={styles.iconWrap}>{rightIcon}</View> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    backgroundColor: '#FF3951',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  title: {
    color: '#FCFCFC',
    fontSize: 20,
    fontWeight: '600',
  },
  iconWrap: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
