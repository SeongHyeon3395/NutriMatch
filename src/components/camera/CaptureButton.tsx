import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  disabled?: boolean;
  onPress: () => void | Promise<void>;
};

export function CaptureButton({ disabled, onPress }: Props) {
  const scale = useSharedValue(1);
  const ringOpacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    return {
      opacity: ringOpacity.value,
    };
  });

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 16, stiffness: 220 });
    ringOpacity.value = withTiming(0.85, { duration: 120 });
  }, [ringOpacity, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 16, stiffness: 220 });
    ringOpacity.value = withTiming(1, { duration: 160 });
  }, [ringOpacity, scale]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="촬영"
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={({ pressed }) => [styles.hitbox, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.root, animatedStyle]}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <View style={styles.inner} />
      </Animated.View>
    </Pressable>
  );
}

const SIZE = 74;

const styles = StyleSheet.create({
  hitbox: {
    padding: 10,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.95,
  },
  root: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  inner: {
    width: SIZE - 18,
    height: SIZE - 18,
    borderRadius: (SIZE - 18) / 2,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
});
