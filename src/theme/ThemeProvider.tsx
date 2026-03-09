import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Easing, StyleSheet, useColorScheme, View } from 'react-native';
import { useUserStore } from '../store/userStore';

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

const STORAGE_KEY = '@nutrimatch_theme_mode';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);
  const resolvedMode = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const previousResolvedModeRef = useRef<'light' | 'dark'>(resolvedMode);
  const transitionOpacity = useRef(new Animated.Value(0)).current;
  const [transitionColor, setTransitionColor] = useState<string | null>(null);
  const transitionAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const transitionTokenRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const remoteMode = profile?.themeMode;
    if (remoteMode !== 'light' && remoteMode !== 'dark' && remoteMode !== 'system') return;
    if (remoteMode === mode) return;

    setModeState(remoteMode);
    void AsyncStorage.setItem(STORAGE_KEY, remoteMode).catch(() => {
      // ignore
    });
  }, [mode, profile?.themeMode]);

  const setMode = async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // ignore
    }

    if (profile?.themeMode !== nextMode) {
      void updateProfile({ themeMode: nextMode }).catch(() => {
        // ignore
      });
    }
  };

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    resolvedMode,
    isDark: resolvedMode === 'dark',
    colors: resolvedMode === 'dark' ? darkColors : lightColors,
    setMode,
  }), [mode, resolvedMode]);

  useEffect(() => {
    const previousMode = previousResolvedModeRef.current;
    if (previousMode === resolvedMode) return;

    transitionAnimRef.current?.stop();
    transitionTokenRef.current += 1;
    const currentToken = transitionTokenRef.current;

    setTransitionColor(previousMode === 'dark' ? darkColors.background : lightColors.background);
    transitionOpacity.setValue(1);

    transitionAnimRef.current = Animated.timing(transitionOpacity, {
      toValue: 0,
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });

    transitionAnimRef.current.start(({ finished }) => {
      if (!finished) return;
      if (transitionTokenRef.current !== currentToken) return;
      setTransitionColor(null);
    });

    previousResolvedModeRef.current = resolvedMode;
  }, [resolvedMode, transitionOpacity]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[styles.root, { backgroundColor: value.colors.background }]}>
        {children}
        {transitionColor ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.transitionOverlay,
              {
                backgroundColor: transitionColor,
                opacity: transitionOpacity,
              },
            ]}
          />
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
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
