import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppIcon } from '../../components/ui/AppIcon';
import { Button } from '../../components/ui/Button';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import { useTheme } from '../../theme/ThemeProvider';

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
  const { colors, isDark } = useTheme();

  const { imageUri } = route.params as { imageUri: string };
  const originalUri = useMemo(() => toFileUri(imageUri), [imageUri]);

  const [currentUri, setCurrentUri] = useState(() => originalUri);
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

  const handleRestoreOriginal = useCallback(() => {
    if (isBusy) return;
    haptic();
    setCurrentUri(originalUri);
  }, [haptic, isBusy, originalUri]);

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
      let wasCancelled = false;

      for (const candidate of candidates) {
        try {
          cropped = await CropPicker.openCropper(
            {
              path: candidate,
              freeStyleCropEnabled: true,
              cropperToolbarTitle: '사진 자르기',
              cropperChooseText: '완료',
              cropperCancelText: '닫기',
              cropperStatusBarColor: '#000000',
              cropperToolbarColor: '#000000',
              cropperToolbarWidgetColor: '#FFFFFF',
              cropperToolbarTitleColor: '#FFFFFF',
              cropperActiveWidgetColor: '#2F80ED',
              cropperChooseColor: '#2F80ED',
              cropperCancelColor: '#FFFFFF',
              showCropGuidelines: true,
              showCropFrame: true,
              hideBottomControls: true,
              enableRotationGesture: false,
            } as any
          );
          if (cropped?.path) break;
        } catch (err: any) {
          const msg = String(err?.message ?? err ?? '').toLowerCase();
          if (
            msg.includes('cancel') ||
            msg.includes('back') ||
            msg.includes('user cancelled') ||
            msg.includes('user canceled')
          ) {
            wasCancelled = true;
            break;
          }
          // try next candidate
        }
      }

      if (cropped?.path) {
        setCurrentUri(toFileUri(cropped.path));
      } else if (wasCancelled) {
        return;
      }
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? '자르기를 실행할 수 없어요.');
      if (
        !msg.toLowerCase().includes('cancel') &&
        !msg.toLowerCase().includes('back') &&
        !msg.toLowerCase().includes('user cancelled') &&
        !msg.toLowerCase().includes('user canceled')
      ) {
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: headerTop }]}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="취소" onPress={handleCancel} style={styles.headerBtn}>
            <AppIcon name={'close' as any} size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>사진 편집</Text>
            <Text style={styles.headerSubtitle}>음식 부분만 보이게 간단히 자른 뒤 분석하세요</Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="원본 복원"
            onPress={handleRestoreOriginal}
            style={[styles.restoreBtn, currentUri === originalUri && styles.restoreBtnDisabled]}
            disabled={currentUri === originalUri || isBusy}
          >
            <Text style={[styles.restoreBtnText, currentUri === originalUri && styles.restoreBtnTextDisabled]}>원본 복원</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.viewer}>
          <Image
            source={{ uri: currentUri }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.bottomSheet}>
          <View style={styles.guideCard}>
            <View style={styles.guideHeaderRow}>
              <View style={styles.guideIconWrap}>
                <AppIcon name={'crop' as any} size={18} color={colors.primary} />
              </View>
              <View style={styles.guideTextWrap}>
                <Text style={styles.guideTitle}>더 간단하게 편집해요</Text>
                <Text style={styles.guideText}>1. 필요하면 아래에서 사진 자르기를 눌러 음식만 남겨주세요.</Text>
                <Text style={styles.guideText}>2. 자르기 화면에서는 비율/회전 메뉴 없이 바로 영역만 조절할 수 있어요.</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsCol}>
            <Button
              title={isBusy ? '자르는 중…' : '사진 자르기'}
              onPress={handleCrop}
              disabled={isBusy}
              size="lg"
              icon={isBusy ? <AppIcon name={'hourglass-top' as any} size={18} color="#FFFFFF" /> : <AppIcon name={'crop' as any} size={18} color="#FFFFFF" />}
              style={styles.actionButton}
            />

            <Button
              title={isBusy ? '처리 중…' : '자르기 없이 이 사진으로 분석'}
              onPress={handleDone}
              disabled={isBusy}
              variant="outline"
              size="lg"
              icon={<AppIcon name={'check' as any} size={18} color={colors.text} />}
              style={styles.actionButton}
            />
          </View>
        </View>
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
    alignItems: 'flex-start',
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
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  headerCenter: {
    flex: 1,
    paddingTop: 2,
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.7)',
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  restoreBtn: {
    minWidth: 72,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  restoreBtnDisabled: {
    opacity: 0.45,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  restoreBtnTextDisabled: {
    color: 'rgba(255,255,255,0.7)',
  },
  viewer: {
    flex: 1,
    backgroundColor: 'black',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  image: {
    flex: 1,
    width: '100%',
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bottomSheet: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#0F1115',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    gap: 12,
  },
  guideCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  guideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  guideIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47,128,237,0.14)',
  },
  guideTextWrap: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  guideText: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.82)',
  },
  actionsCol: {
    gap: 10,
  },
  actionButton: {
    width: '100%',
  },
});
