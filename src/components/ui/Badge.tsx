import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, RADIUS } from '../../constants/colors';

interface BadgeProps {
  children?: React.ReactNode;
  text?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'outline' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  text: textProp,
  variant = 'default',
  style,
  textStyle,
  numberOfLines,
  ellipsizeMode,
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'success':
        return { bg: COLORS.green50, text: COLORS.success, border: COLORS.green200 };
      case 'danger':
        return { bg: COLORS.red50, text: COLORS.danger, border: COLORS.red200 };
      case 'warning':
        return { bg: COLORS.yellow50, text: '#B45309', border: COLORS.yellow200 }; // yellow-700 equivalent
      case 'outline':
        return { bg: 'transparent', text: COLORS.text, border: COLORS.border };
      case 'secondary':
        return { bg: COLORS.background, text: COLORS.textSecondary, border: COLORS.border };
      default:
        return { bg: COLORS.blue50, text: COLORS.primary, border: COLORS.blue200 };
    }
  };

  const { bg, text: textColor, border } = getStyles();

  return (
    <View style={[
      styles.badge, 
      { backgroundColor: bg, borderColor: border }, 
      style
    ]}>
      <Text
        style={[styles.text, { color: textColor }, textStyle]}
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
      >
        {textProp || children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
