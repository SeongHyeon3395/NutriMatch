import React, { useCallback, useRef, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View, type StyleProp } from 'react-native';
import { RADIUS } from '../../constants/colors';
import { useTheme } from '../../theme/ThemeProvider';

interface ButtonProps {
  onPress: () => void | Promise<void>;
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
  const { colors, isDark } = useTheme();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const handlePress = useCallback(() => {
    if (disabled || loading || pendingRef.current) return;

    try {
      const ret = onPress?.();
      if (ret && typeof (ret as any).then === 'function') {
        pendingRef.current = true;
        setPending(true);
        (ret as Promise<void>).finally(() => {
          pendingRef.current = false;
          setPending(false);
        });
      }
    } catch (e) {
      pendingRef.current = false;
      setPending(false);
      throw e;
    }
  }, [disabled, loading, onPress]);

  const isDisabled = disabled || loading || pending;

  const getBackgroundColor = () => {
    if (isDisabled) return colors.border;
    switch (variant) {
      case 'primary': return isDark ? colors.surfaceMuted : colors.primary;
      case 'outline': return isDark ? colors.surfaceElevated : 'transparent';
      case 'ghost': return isDark ? colors.surface : colors.surfaceElevated;
      case 'danger': return isDark ? colors.red100 : colors.danger;
      default: return isDark ? colors.surfaceMuted : colors.primary;
    }
  };

  const getBorderColor = () => {
    if (isDisabled) return colors.border;
    switch (variant) {
      case 'primary': return isDark ? colors.surfaceMuted : 'transparent';
      case 'outline': return isDark ? colors.surfaceMuted : colors.primary;
      case 'ghost': return colors.surfaceMuted;
      case 'danger': return isDark ? colors.red200 : 'transparent';
      default: return 'transparent';
    }
  };

  const getTextColor = () => {
    if (isDisabled) return colors.textSecondary;
    switch (variant) {
      case 'primary': return isDark ? colors.text : '#FFFFFF';
      case 'outline': return isDark ? colors.text : colors.primary;
      case 'ghost': return colors.text;
      case 'danger': return isDark ? colors.danger : '#FFFFFF';
      default: return isDark ? colors.text : '#FFFFFF';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingVertical: 10, paddingHorizontal: 14 };
      case 'md': return { paddingVertical: 13, paddingHorizontal: 18 };
      case 'lg': return { paddingVertical: 16, paddingHorizontal: 24 };
      default: return { paddingVertical: 13, paddingHorizontal: 18 };
    }
  };

  const fontSize = size === 'sm' ? 14 : 16;
  const lineHeight = fontSize + 2;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' || variant === 'ghost' || (isDark && (variant === 'primary' || variant === 'danger')) ? 1 : 0,
          ...getPadding(),
        },
        style,
      ]}
    >
      {loading || pending ? (
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
            children ? (
              typeof children === 'string' || typeof children === 'number' ? (
                <Text
                  style={[
                    styles.text,
                    { color: getTextColor(), fontSize, lineHeight, textAlignVertical: 'center' },
                    textStyle,
                  ]}
                >
                  {children}
                </Text>
              ) : (
                children
              )
            ) : null
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '700',
  },
});
