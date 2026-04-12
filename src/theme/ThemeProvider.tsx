import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useUserStore } from '../store/userStore';
import { updateMyAppUser } from '../services/userData';
import { runWhenIdle } from '../services/idleTask';

import { darkColors, lightColors, type ThemeColors } from './tokens';
import type { AppThemeMode } from '../types/user';

export type ThemeMode = AppThemeMode;

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');
  const profileThemeMode = useUserStore(state => state.profile?.themeMode);
  const setProfile = useUserStore(state => state.setProfile);
  const resolvedMode = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [showThemeSwitchOverlay, setShowThemeSwitchOverlay] = useState(false);
  const hideDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const remoteMode = profileThemeMode;
    if (remoteMode !== 'light' && remoteMode !== 'dark' && remoteMode !== 'system') return;
    if (remoteMode === mode) return;

    setModeState(remoteMode);
  }, [mode, profileThemeMode]);

  const showThemeChangingOverlay = useCallback(() => {
    if (hideDelayTimerRef.current) {
      clearTimeout(hideDelayTimerRef.current);
      hideDelayTimerRef.current = null;
    }

    fadeAnimRef.current?.stop();
    setShowThemeSwitchOverlay(true);
    overlayOpacity.setValue(1);

    hideDelayTimerRef.current = setTimeout(() => {
      fadeAnimRef.current = Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      });

      fadeAnimRef.current.start(({ finished }) => {
        if (!finished) return;
        setShowThemeSwitchOverlay(false);
      });
    }, 2000);
  }, [overlayOpacity]);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    if (nextMode === mode) return;

    showThemeChangingOverlay();
    setModeState(nextMode);

    if (profileThemeMode !== nextMode) {
      runWhenIdle(() => {
        void (async () => {
          try {
            const remoteProfile = await updateMyAppUser({ themeMode: nextMode });
            await setProfile(remoteProfile);
          } catch {
            // ignore
          }
        })();
      }, 150);
    }
  }, [mode, profileThemeMode, setProfile, showThemeChangingOverlay]);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    resolvedMode,
    isDark: resolvedMode === 'dark',
    colors: resolvedMode === 'dark' ? darkColors : lightColors,
    setMode,
  }), [mode, resolvedMode, setMode]);

  useEffect(() => {
    return () => {
      if (hideDelayTimerRef.current) {
        clearTimeout(hideDelayTimerRef.current);
        hideDelayTimerRef.current = null;
      }
      fadeAnimRef.current?.stop();
    };
  }, []);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[styles.root, { backgroundColor: value.colors.background }]}>
        {children}
        {showThemeSwitchOverlay ? (
          <Animated.View
            pointerEvents="auto"
            style={[
              styles.themeSwitchOverlay,
              {
                opacity: overlayOpacity,
              },
            ]}
          >
            <View style={[styles.themeSwitchCard, { backgroundColor: value.colors.surface, borderColor: value.colors.border }]}>
              <ActivityIndicator color={value.colors.primary} size="small" />
              <Text style={[styles.themeSwitchTitle, { color: value.colors.text }]}>테마 변경중</Text>
              <Text style={[styles.themeSwitchDesc, { color: value.colors.textSecondary }]}>화면을 준비하고 있어요...</Text>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  themeSwitchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeSwitchCard: {
    minWidth: 220,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  themeSwitchTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
  },
  themeSwitchDesc: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
});
