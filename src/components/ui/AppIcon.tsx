import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

type AppIconProps = {
  name: MaterialIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function AppIcon({ name, size = 22, color, style }: AppIconProps) {
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
}
