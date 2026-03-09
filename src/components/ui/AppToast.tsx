import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SPACING } from '../../constants/colors';
import { useTheme } from '../../theme/ThemeProvider';

export type AppToastVariant = 'success' | 'error' | 'info';

export interface AppToastOptions {
  message: string;
  variant?: AppToastVariant;
  durationMs?: number;
}

interface AppToastContextValue {
  toast: (options: AppToastOptions) => void;
}

const AppToastContext = createContext<AppToastContextValue | null>(null);

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AppToastOptions>({ message: '' });
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 8, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
    });
  }, [opacity, translateY]);

  const toast = useCallback(
    (next: AppToastOptions) => {
      if (!next?.message) return;
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      setOptions({
        variant: next.variant ?? 'info',
        durationMs: typeof next.durationMs === 'number' ? next.durationMs : 2200,
        message: next.message,
      });
      setVisible(true);

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 140, useNativeDriver: true }),
      ]).start();

      hideTimerRef.current = setTimeout(() => {
        hide();
      }, Math.max(900, next.durationMs ?? 2200));
    },
    [hide, opacity, translateY]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  const bg =
    options.variant === 'success'
      ? colors.success
      : options.variant === 'error'
        ? colors.danger
        : colors.text;

  return (
    <AppToastContext.Provider value={value}>
      {children}
      {visible ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.toast,
              {
                backgroundColor: bg,
                bottom: (insets.bottom || 0) + 12,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <Text style={styles.toastText} numberOfLines={3}>
              {options.message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </AppToastContext.Provider>
  );
}

export function useAppToast() {
  const ctx = useContext(AppToastContext);
  if (!ctx) throw new Error('useAppToast must be used within AppToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
