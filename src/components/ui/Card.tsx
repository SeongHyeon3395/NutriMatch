import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { RADIUS } from '../../constants/colors';
import { useTheme } from '../../theme/ThemeProvider';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default' }) => {
  const { colors, isDark } = useTheme();
  const isElevated = variant === 'elevated';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isElevated ? colors.surfaceElevated : colors.surface,
          borderColor: colors.border,
        },
        isElevated && [styles.elevated, { borderColor: colors.surfaceMuted, shadowColor: colors.shadow }],
        isElevated && !isDark && styles.elevatedLight,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'visible',
  },
  elevated: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  elevatedLight: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
});
