import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { RADIUS } from '../../constants/colors';
import { useTheme } from '../../theme/ThemeProvider';

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
  const { colors } = useTheme();

  const getStyles = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.green50, text: colors.success, border: colors.green200 };
      case 'danger':
        return { bg: colors.red50, text: colors.danger, border: colors.red200 };
      case 'warning':
        return { bg: colors.warningSoft, text: colors.warningDark, border: colors.yellow200 };
      case 'outline':
        return { bg: 'transparent', text: colors.text, border: colors.border };
      case 'secondary':
        return { bg: colors.backgroundGray, text: colors.textSecondary, border: colors.border };
      default:
        return { bg: colors.blue50, text: colors.primary, border: colors.blue200 };
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
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
