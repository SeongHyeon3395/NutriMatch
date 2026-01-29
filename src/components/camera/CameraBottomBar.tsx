import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { COLORS } from '../../constants/colors';
import { CaptureButton } from './CaptureButton';

export type FlashMode = 'auto' | 'on' | 'off';

type Props = {
  flash: FlashMode;
  onPressFlash: () => void;
  onPressFlip: () => void;
  onPressGallery: () => void;
  onPressShutter: () => void | Promise<void>;
  shutterDisabled?: boolean;
};

export function CameraBottomBar({
  flash,
  onPressFlash,
  onPressFlip,
  onPressGallery,
  onPressShutter,
  shutterDisabled,
}: Props) {
  const flashIcon = flash === 'auto' ? 'flash-auto' : flash === 'on' ? 'flash-on' : 'flash-off';

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View style={styles.side}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="플래시" onPress={onPressFlash} style={styles.iconBtn}>
            <AppIcon name={flashIcon as any} size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.center}>
          <CaptureButton disabled={shutterDisabled} onPress={onPressShutter} />
        </View>

        <View style={styles.sideRight}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="카메라 전환" onPress={onPressFlip} style={styles.iconBtn}>
            <AppIcon name={'flip-camera-android' as any} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.galleryRow}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="갤러리" onPress={onPressGallery} style={styles.galleryBtn}>
          <AppIcon name={'photo-library' as any} size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingBottom: 10,
    paddingTop: 6,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
  },
  sideRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  center: {
    width: 120,
    alignItems: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  galleryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
