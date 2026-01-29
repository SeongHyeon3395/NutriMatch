import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon } from '../ui/AppIcon';

type Props = {
  onPressCrop: () => void;
  onPressRotate?: () => void;
  disabled?: boolean;
};

export function EditorToolsBar({ onPressCrop, onPressRotate, disabled }: Props) {
  return (
    <View style={styles.root}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="자르기"
        onPress={onPressCrop}
        disabled={disabled}
        style={[styles.toolBtn, disabled && styles.disabled]}
      >
        <AppIcon name={'crop' as any} size={20} color="#fff" />
        <Text style={styles.toolText}>자르기</Text>
      </TouchableOpacity>

      {onPressRotate ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="회전"
          onPress={onPressRotate}
          disabled={disabled}
          style={[styles.toolBtn, disabled && styles.disabled]}
        >
          <AppIcon name={'rotate-right' as any} size={20} color="#fff" />
          <Text style={styles.toolText}>회전</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  toolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 86,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.26)',
  },
  toolText: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.55,
  },
});
