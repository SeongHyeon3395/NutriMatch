import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/colors';

export function SplashOverlay() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <View style={styles.root} accessibilityRole="text" accessibilityLabel="Splash">
      <Animated.View
        style={[
          styles.center,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Animated.Text style={styles.subtitle}>당신의 AI 영양 비서</Animated.Text>
        <Animated.Text style={styles.title}>뉴핏</Animated.Text>
        <View style={{ height: 14 }} />
        <ActivityIndicator color={COLORS.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  center: {
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textGray,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.6,
  },
});
