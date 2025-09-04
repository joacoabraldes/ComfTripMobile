import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export const ArrowIcon = ({
  color = '#FFFFFF',
  width = 8,
  height = 14,
  style,
}: {
  color?: string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) => (
  <Svg width={width} height={height} viewBox="0 0 8 14" style={style} fill="none">
    <Path d="M1 13L7 7L1 1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
