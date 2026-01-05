import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View, type StyleProp } from 'react-native';
import { COLORS, RADIUS } from '../../constants/colors';

interface ButtonProps {
  onPress: () => void;
  children?: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  children,
  title,
  icon,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#E5E7EB';
    switch (variant) {
      case 'primary': return COLORS.primary;
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
      case 'danger': return COLORS.danger;
      default: return COLORS.primary;
    }
  };

  const getBorderColor = () => {
    if (disabled) return '#E5E7EB';
    switch (variant) {
      case 'outline': return COLORS.border;
      default: return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return '#9CA3AF';
    switch (variant) {
      case 'primary': return '#FFFFFF';
      case 'outline': return COLORS.primary;
      case 'ghost': return COLORS.textGray;
      case 'danger': return '#FFFFFF';
      default: return '#FFFFFF';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingVertical: 8, paddingHorizontal: 12 };
      case 'md': return { paddingVertical: 12, paddingHorizontal: 16 };
      case 'lg': return { paddingVertical: 16, paddingHorizontal: 24 };
      default: return { paddingVertical: 12, paddingHorizontal: 16 };
    }
  };

  const fontSize = size === 'sm' ? 14 : 16;
  const lineHeight = fontSize + 2;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          ...getPadding(),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon && <View style={{ marginRight: title || children ? 8 : 0 }}>{icon}</View>}
          {title ? (
            <Text
              style={[
                styles.text,
                { color: getTextColor(), fontSize, lineHeight, textAlignVertical: 'center' },
                textStyle,
              ]}
            >
              {title}
            </Text>
          ) : (
            children && (
              <Text
                style={[
                  styles.text,
                  { color: getTextColor(), fontSize, lineHeight, textAlignVertical: 'center' },
                  textStyle,
                ]}
              >
                {children}
              </Text>
            )
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
  },
});
