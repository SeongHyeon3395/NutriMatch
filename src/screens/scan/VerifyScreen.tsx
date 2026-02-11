import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StatusBar,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { COLORS, RADIUS } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { AppIcon } from '../../components/ui/AppIcon';
import { analyzeFoodImage } from '../../services/api';
import { FoodAnalysis } from '../../types/user';
import { useUserStore } from '../../store/userStore';
import { ensureUserAnalysis } from '../../services/userAnalysis';
import { useAppAlert } from '../../components/ui/AppAlert';
import { Card } from '../../components/ui/Card';
import { MONTHLY_SCAN_LIMIT } from '../../config';
import { consumeMonthlyScanRemote, getSessionUserId, refundLastScanRemote } from '../../services/userData';

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

async function getImageSizeSafe(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    try {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => resolve(null)
      );
    } catch {
      resolve(null);
    }
  });
}

export default function VerifyScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { imageUri, autoAnalyze } = route.params as { imageUri: string; autoAnalyze?: boolean };
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzeInFlightRef = useRef(false);
  const profile = useUserStore(state => state.profile);
  const { alert } = useAppAlert();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const insets = useSafeAreaInsets();
  const tutorialTop = (insets.top || StatusBar.currentHeight || 0) + 8;

  const [tutorialKeys, setTutorialKeys] = useState(() => ({
    seen: '@nutrimatch_scan_tutorial_seen',
    phase: '@nutrimatch_scan_tutorial_phase',
  }));
  const baseTutorialSeenKey = useMemo(() => '@nutrimatch_scan_tutorial_seen', []);
  const baseTutorialPhaseKey = useMemo(() => '@nutrimatch_scan_tutorial_phase', []);
  const [showVerifyTutorial, setShowVerifyTutorial] = useState(false);

  const consumeScanOrAlert = async () => {
    const userId = await getSessionUserId().catch(() => null);
    if (!userId) return true;

    try {
      await consumeMonthlyScanRemote(MONTHLY_SCAN_LIMIT);
      return true;
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/SCAN_LIMIT_REACHED/i.test(msg)) {
        alert({
          title: '스캔 기회 소진',
          message: `이번 달 스캔 기회를 모두 사용했어요. (${MONTHLY_SCAN_LIMIT}회/월)`,
        });
        return false;
      }
      // 네트워크/서버 오류: 보수적으로 막고 사용자에게 알림
      alert({
        title: '스캔 처리 실패',
        message: '스캔 횟수 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
      });
      return false;
    }
  };

  const analyzeButtonAnchorRef = useRef<View | null>(null);
  const [analyzeButtonRect, setAnalyzeButtonRect] = useState<null | { x: number; y: number; width: number; height: number }>(null);

  const measureAnalyzeButton = () => {
    analyzeButtonAnchorRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setAnalyzeButtonRect(prev => {
          if (prev && prev.x === x && prev.y === y && prev.width === width && prev.height === height) return prev;
          return { x, y, width, height };
        });
      }
    });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const userId = await getSessionUserId().catch(() => null);
      if (mounted && userId) {
        setTutorialKeys(prev => {
          const next = {
            seen: `@nutrimatch_scan_tutorial_seen:${userId}`,
            phase: `@nutrimatch_scan_tutorial_phase:${userId}`,
          };
          if (prev.seen === next.seen && prev.phase === next.phase) return prev;
          return next;
        });
      }

      // "건너뛰기"를 눌렀다면 촬영/분석 이후에도 절대 튜토리얼이 나오지 않도록,
      // phase 뿐 아니라 seen 값도 함께 확인합니다(레이스 컨디션 방어).
      const scopedSeenKey = userId ? `@nutrimatch_scan_tutorial_seen:${userId}` : null;
      const scopedPhaseKey = userId ? `@nutrimatch_scan_tutorial_phase:${userId}` : null;
      const seenKeyToRead = scopedSeenKey ?? baseTutorialSeenKey;
      const phaseKeyToRead = scopedPhaseKey ?? baseTutorialPhaseKey;

      try {
        const [seen, phase] = await Promise.all([
          AsyncStorage.getItem(seenKeyToRead),
          AsyncStorage.getItem(phaseKeyToRead),
        ]);
        if (!mounted) return;
        if (seen === '1') {
          setShowVerifyTutorial(false);
          // 혹시 남아있는 phase는 정리(다시 뜨는 것 방지)
          try {
            await AsyncStorage.removeItem(phaseKeyToRead);
          } catch {
            // ignore
          }
          return;
        }
        setShowVerifyTutorial(phase === 'verify');
      } catch {
        if (mounted) setShowVerifyTutorial(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tutorialKeys.phase]);

  const finalizeTutorial = async () => {
    setShowVerifyTutorial(false);
    try {
      const userId = await getSessionUserId().catch(() => null);
      const scopedSeenKey = userId ? `@nutrimatch_scan_tutorial_seen:${userId}` : null;
      const scopedPhaseKey = userId ? `@nutrimatch_scan_tutorial_phase:${userId}` : null;

      await AsyncStorage.setItem(baseTutorialSeenKey, '1');
      await AsyncStorage.removeItem(baseTutorialPhaseKey);
      if (scopedSeenKey) await AsyncStorage.setItem(scopedSeenKey, '1');
      if (scopedPhaseKey) await AsyncStorage.removeItem(scopedPhaseKey);

      // 화면 상태에서 쓰는 현재 키도 함께 정리
      await AsyncStorage.setItem(tutorialKeys.seen, '1');
      await AsyncStorage.removeItem(tutorialKeys.phase);
    } catch {
      // ignore
    }
  };

  const handleRetake = () => {
    navigation.goBack();
  };

  const handleAnalyze = async () => {
    if (analyzeInFlightRef.current) return;
    analyzeInFlightRef.current = true;

    const ok = await consumeScanOrAlert();
    if (!ok) {
      analyzeInFlightRef.current = false;
      return;
    }

    setIsAnalyzing(true);
    console.log('[VerifyScreen] 분석 시작');
    try {
      // Enforce max 1024 only at upload/analyze time.
      let uploadUri = imageUri;
      console.log('[VerifyScreen] 이미지 URI:', uploadUri);
      const size = await getImageSizeSafe(imageUri);
      if (size && (size.width > 1024 || size.height > 1024)) {
        const Resizer = tryGetImageResizer();
        if (Resizer?.createResizedImage) {
          const resized = await Resizer.createResizedImage(
            imageUri,
            1024,
            1024,
            'JPEG',
            85,
            0,
            undefined,
            false,
            {
              mode: 'contain',
              onlyScaleDown: true,
            } as any
          );
          const resizedUri = toFileUri((resized as any)?.uri || (resized as any)?.path);
          if (resizedUri) uploadUri = resizedUri;
        }
      }

      console.log('[VerifyScreen] analyzeFoodImage 호출 시작');
      const response = await analyzeFoodImage(
        uploadUri,
        profile
          ? {
              bodyGoal: profile.bodyGoal,
              healthDiet: profile.healthDiet,
              lifestyleDiet: profile.lifestyleDiet,
              allergens: profile.allergens,
              currentWeight: profile.currentWeight,
              targetWeight: profile.targetWeight,
              height: profile.height,
              age: profile.age,
              gender: profile.gender,
            }
          : null
      );
      
      if (!response.ok || !response.data) {
        throw new Error(response.message || '분석에 실패했습니다.');
      }

      const data = response.data;

      const resolveDishName = (d: any): string => {
        const dish = d?.dish;
        if (typeof dish === 'string' && dish.trim()) return dish.trim();
        if (dish && typeof dish === 'object') {
          const name = (dish as any)?.name;
          if (typeof name === 'string' && name.trim()) return name.trim();
        }
        const dishName = d?.dishName;
        if (typeof dishName === 'string' && dishName.trim()) return dishName.trim();

        const brand = d?.brand;
        const fallbackLabels = Array.isArray(d?.detections)
          ? d.detections
              .map((x: any) => (typeof x?.label === 'string' ? x.label.trim() : ''))
              .filter((x: string) => Boolean(x))
          : [];
        if (typeof brand === 'string' && brand.trim() && fallbackLabels.length > 0) {
          return `${brand.trim()} ${fallbackLabels[0]}`;
        }
        if (fallbackLabels.length > 0) return fallbackLabels[0];
        return '알 수 없는 음식';
      };
      
      // Map API response to FoodAnalysis type
      const analysis: FoodAnalysis = {
        dishName: resolveDishName(data),
        description: data.notes || '분석된 정보가 없습니다.',
        categories: [], 
        confidence: data.confidence || 0,
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        allergens: Array.isArray(data.allergens) ? data.allergens : [],
        detections: Array.isArray((data as any).detections) ? (data as any).detections : [],
        macros: {
          // Keep as many macro fields as backend provides.
          calories: data.estimated_macros?.calories,
          carbs_g: data.estimated_macros?.carbs_g,
          protein_g: data.estimated_macros?.protein_g,
          fat_g: data.estimated_macros?.fat_g,
          sugar_g: data.estimated_macros?.sugar_g,
          saturated_fat_g: data.estimated_macros?.saturated_fat_g,
          trans_fat_g: data.estimated_macros?.trans_fat_g,
          sodium_mg: data.estimated_macros?.sodium_mg,
          cholesterol_mg: data.estimated_macros?.cholesterol_mg,
          fiber_g: data.estimated_macros?.fiber_g,
        },
        userAnalysis: data.userAnalysis,
        source: data.source,
        referenceStandard: data.reference_standard,
        geminiUsed: data.geminiUsed || false,
      };

      // Always ensure detailed user-facing analysis text exists
      analysis.userAnalysis = ensureUserAnalysis(analysis, profile);

      navigation.navigate('Result', {
        imageUri: uploadUri,
        analysis,
      });
    } catch (error: any) {
      console.error('[VerifyScreen] AI 분석 오류:', error);
      console.error('[VerifyScreen] 오류 상세:', JSON.stringify(error, null, 2));
      
      // AI 분석 실패 시 스캔 횟수 복구
      let refundSuccess = false;
      try {
        const result = await refundLastScanRemote();
        refundSuccess = Boolean(result);
        if (refundSuccess) {
          console.log('[VerifyScreen] 스캔 횟수 복구 완료');
        }
      } catch (refundError: any) {
        console.error('[VerifyScreen] 스캔 횟수 복구 실패:', refundError);
        // PGRST202 에러는 함수가 없는 경우 (마이그레이션 미적용)
        const isNotFoundError = refundError?.message?.includes('PGRST202') || 
                                refundError?.code === 'PGRST202';
        if (isNotFoundError) {
          console.warn('[VerifyScreen] refund_last_scan 함수가 데이터베이스에 없습니다. 마이그레이션을 적용해주세요.');
        }
      }
      
      // 더 자세한 에러 정보 표시
      const errorDetails = error?.response?.data || error?.data || {};
      const errorMsg = error.message || error?.toString() || '음식 분석 중 오류가 발생했습니다.';
      const fullMessage = refundSuccess 
        ? `${errorMsg}\n\n스캔 횟수는 복구되었어요.`
        : `${errorMsg}\n\n${JSON.stringify(errorDetails).substring(0, 200)}`;
      
      alert({
        title: 'AI 분석 중 오류',
        message: fullMessage,
      });
    } finally {
      setIsAnalyzing(false);
      analyzeInFlightRef.current = false;
    }
  };

  const autoAnalyzeTriggeredRef = useRef(false);
  useEffect(() => {
    if (!autoAnalyze) return;
    if (autoAnalyzeTriggeredRef.current) return;
    autoAnalyzeTriggeredRef.current = true;
    setShowVerifyTutorial(false);

    const t = setTimeout(() => {
      void handleAnalyze();
    }, 80);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyze]);

  const handleAnalyzeFromTutorial = async () => {
    if (showVerifyTutorial) {
      await finalizeTutorial();
    }
    await handleAnalyze();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <AppIcon name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <AppIcon name="photo" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.title}>사진 확인</Text>
              <Text style={styles.subtitle}>글자/음식이 선명하면 정확도가 올라가요</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.previewCard}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          </View>
          <Text style={styles.previewHint}>
            이 화면은 미리보기예요. 분석 결과는 사진 기반 추정입니다.
          </Text>
        </Card>

        <View style={styles.buttonGroup}>
          <Button 
            title="다시 찍기" 
            variant="outline" 
            onPress={handleRetake} 
            icon={<AppIcon name="refresh" size={20} color={COLORS.primary} />}
            style={styles.button}
            disabled={isAnalyzing}
          />
          <View ref={analyzeButtonAnchorRef} onLayout={measureAnalyzeButton} style={{ width: '100%' }}>
            <Button 
              title={isAnalyzing ? "분석 중..." : "분석 시작"} 
              onPress={handleAnalyzeFromTutorial} 
              icon={isAnalyzing ? <ActivityIndicator color="white" /> : <AppIcon name="check" size={20} color="white" />}
              style={styles.button}
              disabled={isAnalyzing}
            />
          </View>
        </View>
      </View>

      <Modal transparent visible={showVerifyTutorial} animationType="fade">
        <View style={styles.tutorialModalRoot} onLayout={measureAnalyzeButton}>
          <View style={[styles.tutorialTopRow, { paddingTop: tutorialTop }]}>
            <Text style={styles.tutorialTopLabel} accessibilityRole="text">
              사용 가이드
            </Text>
            <TouchableOpacity onPress={finalizeTutorial} accessibilityRole="button" style={styles.tutorialSkip}>
              <Text style={styles.tutorialSkipText}>건너뛰기</Text>
            </TouchableOpacity>
          </View>

          {!!analyzeButtonRect && (
            <>
              {(() => {
                const highlightPadding = 6;
                const holeX = analyzeButtonRect.x - highlightPadding;
                const holeY = analyzeButtonRect.y - highlightPadding;
                const holeW = analyzeButtonRect.width + highlightPadding * 2;
                const holeH = analyzeButtonRect.height + highlightPadding * 2;
                const holeR = RADIUS.sm + highlightPadding;

                return (
                  <>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => {}}
                      style={styles.tutorialTouchAbsorber}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    />

                    <Svg
                      pointerEvents="none"
                      width={screenWidth}
                      height={screenHeight}
                      style={styles.tutorialDimSvg}
                    >
                      <Defs>
                        <Mask id="verifyCutoutMask">
                          <Rect width="100%" height="100%" fill="white" />
                          <Rect x={holeX} y={holeY} width={holeW} height={holeH} rx={holeR} ry={holeR} fill="black" />
                        </Mask>
                      </Defs>
                      <Rect
                        width="100%"
                        height="100%"
                        fill="rgba(0,0,0,0.35)"
                        mask="url(#verifyCutoutMask)"
                      />
                    </Svg>

                    <View
                      pointerEvents="none"
                      style={[
                        styles.tutorialHighlight,
                        {
                          left: holeX,
                          top: holeY,
                          width: holeW,
                          height: holeH,
                          borderRadius: holeR,
                        },
                      ]}
                    />

                    <View
                      pointerEvents="none"
                      style={[
                        styles.tutorialHint,
                        {
                          left: Math.max(16, analyzeButtonRect.x + analyzeButtonRect.width / 2 - 130),
                          top: Math.max(tutorialTop + 10, analyzeButtonRect.y - 78),
                        },
                      ]}
                    >
                      <Text style={styles.tutorialHintText}>분석 시작을 눌러 결과를 확인해요</Text>
                      <Text style={styles.tutorialArrow}>↓</Text>
                    </View>

                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={handleAnalyzeFromTutorial}
                      style={[
                        styles.tutorialCtaHitbox,
                        {
                          left: analyzeButtonRect.x - 10,
                          top: analyzeButtonRect.y - 10,
                          width: analyzeButtonRect.width + 20,
                          height: analyzeButtonRect.height + 20,
                        },
                      ]}
                    />
                  </>
                );
              })()}
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 14,
  },
  heroCard: {
    padding: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  previewCard: {
    padding: 14,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  previewHint: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },

  tutorialModalRoot: {
    flex: 1,
  },
  tutorialTouchAbsorber: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  tutorialDimSvg: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  tutorialTopRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  tutorialTopLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    opacity: 0.9,
  },
  tutorialSkip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tutorialSkipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tutorialHighlight: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: RADIUS.sm,
    zIndex: 15,
  },
  tutorialHint: {
    position: 'absolute',
    width: 260,
    alignItems: 'center',
    zIndex: 20,
  },
  tutorialHintText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  tutorialArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  tutorialCtaHitbox: {
    position: 'absolute',
    backgroundColor: 'transparent',
    zIndex: 25,
  },
});
