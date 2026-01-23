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
import { useAppAlert } from '../../components/ui/AppAlert';
import { useUserStore } from '../../store/userStore';
import { Card } from '../../components/ui/Card';
import { MONTHLY_SCAN_LIMIT } from '../../config';
import { getMonthlyScanCountRemote, getSessionUserId } from '../../services/userData';

export default function VerifyScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { imageUri } = route.params as { imageUri: string };
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { alert } = useAppAlert();
  const profile = useUserStore(state => state.profile);
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

  const ensureScanQuotaOrAlert = async () => {
    const userId = await getSessionUserId().catch(() => null);
    if (!userId) return true;

    try {
      const used = await getMonthlyScanCountRemote();
      if (typeof used === 'number' && used >= MONTHLY_SCAN_LIMIT) {
        alert({
          title: '스캔 기회 소진',
          message: `이번 달 스캔 기회를 모두 사용했어요. (${MONTHLY_SCAN_LIMIT}회/월)`,
        });
        return false;
      }
    } catch {
      // ignore
    }
    return true;
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

      try {
        const phase = await AsyncStorage.getItem(tutorialKeys.phase);
        if (mounted) setShowVerifyTutorial(phase === 'verify');
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
      await AsyncStorage.setItem(tutorialKeys.seen, '1');
      await AsyncStorage.removeItem(tutorialKeys.phase);
      await AsyncStorage.setItem(baseTutorialSeenKey, '1');
      await AsyncStorage.removeItem(baseTutorialPhaseKey);
    } catch {
      // ignore
    }
  };

  const handleRetake = () => {
    navigation.goBack();
  };

  const handleAnalyze = async () => {
    const ok = await ensureScanQuotaOrAlert();
    if (!ok) return;

    setIsAnalyzing(true);
    try {
      const response = await analyzeFoodImage(
        imageUri,
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
      
      // Map API response to FoodAnalysis type
      const analysis: FoodAnalysis = {
        dishName: data.dish || '알 수 없는 음식',
        description: data.notes || '분석된 정보가 없습니다.',
        categories: [], 
        confidence: data.confidence || 0,
        macros: {
          calories: data.estimated_macros?.calories,
          protein_g: data.estimated_macros?.protein_g,
          carbs_g: data.estimated_macros?.carbs_g,
          fat_g: data.estimated_macros?.fat_g,
        },
        userAnalysis: data.userAnalysis,
        source: data.source,
        referenceStandard: data.reference_standard,
        geminiUsed: data.geminiUsed || false,
      };

      navigation.navigate('Result', {
        imageUri,
        analysis,
      });
    } catch (error: any) {
      console.error(error);
      alert({
        title: '분석 실패',
        message: error.message || '음식 분석 중 오류가 발생했습니다.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeFromTutorial = async () => {
    const ok = await ensureScanQuotaOrAlert();
    if (!ok) return;

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
