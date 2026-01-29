import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppIcon } from '../../components/ui/AppIcon';
import { RADIUS } from '../../constants/colors';
import { EditorToolsBar } from '../../components/editor/EditorToolsBar';
import { HintChip } from '../../components/editor/HintChip';

function tryGetHaptics(): null | { trigger: (type: string, options?: any) => void } {
  try {
    const mod = require('react-native-haptic-feedback');
    return mod?.default || mod;
  } catch {
    return null;
  }
}

function tryGetCropPicker(): any | null {
  try {
    return require('react-native-image-crop-picker')?.default ?? require('react-native-image-crop-picker');
  } catch {
    return null;
  }
}

function tryGetImageResizer(): any | null {
  try {
    return require('react-native-image-resizer')?.default ?? require('react-native-image-resizer');
  } catch {
    return null;
  }
}

function toFileUri(uriOrPath: string) {
  if (!uriOrPath) return '';
  if (uriOrPath.startsWith('file://')) return uriOrPath;
  if (uriOrPath.startsWith('content://')) return uriOrPath;
  return `file://${uriOrPath}`;
}

function toPlainPath(uriOrPath: string) {
  if (!uriOrPath) return '';
  if (uriOrPath.startsWith('file://')) return uriOrPath.replace('file://', '');
  return uriOrPath;
}

export default function EditScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { imageUri } = route.params as { imageUri: string };

  const [currentUri, setCurrentUri] = useState(() => toFileUri(imageUri));
  const [isBusy, setIsBusy] = useState(false);

  const haptic = useCallback(() => {
    const h = tryGetHaptics();
    if (!h?.trigger) return;
    try {
      h.trigger('selection', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    } catch {}
  }, []);

  const headerTop = useMemo(() => (insets.top || StatusBar.currentHeight || 0) + 6, [insets.top]);

  const handleCancel = useCallback(() => {
    haptic();
    navigation.goBack();
  }, [haptic, navigation]);

  const handleCrop = useCallback(async () => {
    if (isBusy) return;
    haptic();

    const CropPicker = tryGetCropPicker();
    if (!CropPicker?.openCropper) {
      Alert.alert(
        '편집 기능 준비 중',
        '편집(자르기) 기능을 사용하려면 앱을 한 번 재빌드해야 해요.\n\nAndroid: npx react-native run-android\niOS: pod install 후 재실행'
      );
      return;
    }

    try {
      setIsBusy(true);
      const candidates = [toPlainPath(currentUri), currentUri].filter(Boolean);
      let cropped: any = null;

      for (const candidate of candidates) {
        try {
          cropped = await CropPicker.openCropper(
            {
              path: candidate,
              freeStyleCropEnabled: true,
              cropperToolbarTitle: '자르기',
              cropperStatusBarColor: '#000000',
              cropperToolbarColor: '#000000',
              cropperActiveWidgetColor: '#2F80ED',
            } as any
          );
          if (cropped?.path) break;
        } catch (err) {
          // try next candidate
        }
      }

      if (cropped?.path) {
        setCurrentUri(toFileUri(cropped.path));
      } else {
        Alert.alert('자르기 실패', '자르기를 실행할 수 없어요. 다시 시도해주세요.');
      }
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? '자르기를 실행할 수 없어요.');
      if (!msg.toLowerCase().includes('cancel')) {
        Alert.alert('자르기 실패', '자르기를 실행할 수 없어요. 다시 시도해주세요.');
      }
    } finally {
      setIsBusy(false);
    }
  }, [currentUri, haptic, isBusy]);

  const handleDone = useCallback(async () => {
    if (isBusy) return;
    haptic();

    try {
      setIsBusy(true);

      // Go to preview screen; user starts analysis there.
      (navigation as any).navigate('Verify', {
        imageUri: currentUri,
        autoAnalyze: false,
      });
    } catch {
      Alert.alert('완료 처리 실패', '이미지 처리에 실패했어요. 다시 시도해주세요.');
    } finally {
      setIsBusy(false);
    }
  }, [currentUri, haptic, isBusy, navigation]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: headerTop }]}
        >
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="취소" onPress={handleCancel} style={styles.headerBtn}>
            <AppIcon name={'close' as any} size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>사진 편집</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="완료"
              onPress={handleDone}
              disabled={isBusy}
              style={[styles.doneTextBtn, isBusy && styles.doneTextBtnDisabled]}
            >
              <Text style={[styles.doneText, isBusy && styles.doneTextDisabled]}>{isBusy ? '처리 중…' : '완료'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.viewer}>
          <Image
            source={{ uri: currentUri }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.hintWrap}>
          <HintChip text="음식 영양 분석을 위해 사진을 선명하게 잘라주세요" />
        </View>

        <EditorToolsBar onPressCrop={handleCrop} disabled={isBusy} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'black',
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  headerRight: {
    justifyContent: 'center',
  },
  doneTextBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  doneTextBtnDisabled: {
    opacity: 0.6,
  },
  doneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  doneTextDisabled: {
    color: 'rgba(255,255,255,0.7)',
  },
  viewer: {
    flex: 1,
    backgroundColor: 'black',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  image: {
    flex: 1,
    width: '100%',
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  hintWrap: {
    paddingTop: 10,
    paddingBottom: 10,
  },
});
