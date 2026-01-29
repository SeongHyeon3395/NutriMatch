import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StatusBar, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AppIcon } from '../../components/ui/AppIcon';
import { Badge } from '../../components/ui/Badge';
import { useAppAlert } from '../../components/ui/AppAlert';
import { MONTHLY_SCAN_LIMIT } from '../../config';
import { getMonthlyScanCountRemote, getSessionUserId } from '../../services/userData';
import { pickPhotoFromCamera, pickPhotoFromLibrary } from '../../services/imagePicker';

export default function ScanScreen() {
  const navigation = useNavigation();
  const { alert } = useAppAlert();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const scanButtonAnchorRef = useRef<View | null>(null);
  const [scanButtonRect, setScanButtonRect] = useState<null | { x: number; y: number; width: number; height: number }>(null);

  const [tutorialKeys, setTutorialKeys] = useState(() => ({
    seen: '@nutrimatch_scan_tutorial_seen',
    phase: '@nutrimatch_scan_tutorial_phase',
  }));
  const baseTutorialSeenKey = useMemo(() => '@nutrimatch_scan_tutorial_seen', []);
  const baseTutorialPhaseKey = useMemo(() => '@nutrimatch_scan_tutorial_phase', []);
  const [showTutorial, setShowTutorial] = useState(false);

  const ensureScanQuotaOrAlert = async () => {
    const userId = await getSessionUserId().catch(() => null);
    if (!userId) return true; // 로컬 모드 제한 없음

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
      // 카운트 조회 실패 시에는 보수적으로 막지 않음
    }
    return true;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const userId = await getSessionUserId().catch(() => null);
      if (!mounted || !userId) return;
      setTutorialKeys(prev => {
        const next = {
          seen: `@nutrimatch_scan_tutorial_seen:${userId}`,
          phase: `@nutrimatch_scan_tutorial_phase:${userId}`,
        };
        if (prev.seen === next.seen && prev.phase === next.phase) return prev;
        return next;
      });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(tutorialKeys.seen);
        if (mounted) setShowTutorial(seen !== '1');
      } catch {
        if (mounted) setShowTutorial(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tutorialKeys.seen]);

  const measureScanButton = () => {
    // measureInWindow gives absolute coordinates for overlay alignment
    scanButtonAnchorRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setScanButtonRect(prev => {
          if (prev && prev.x === x && prev.y === y && prev.width === width && prev.height === height) return prev;
          return { x, y, width, height };
        });
      }
    });
  };

  const finalizeTutorial = async () => {
    setShowTutorial(false);
    try {
      await AsyncStorage.setItem(tutorialKeys.seen, '1');
      await AsyncStorage.removeItem(tutorialKeys.phase);
      // legacy/base 키도 같이 정리
      await AsyncStorage.setItem(baseTutorialSeenKey, '1');
      await AsyncStorage.removeItem(baseTutorialPhaseKey);
    } catch {
      // ignore
    }
  };

  const goToVerifyTutorialPhase = async () => {
    // Hide scan overlay but continue tutorial on Verify screen.
    setShowTutorial(false);
    try {
      await AsyncStorage.setItem(tutorialKeys.phase, 'verify');
      await AsyncStorage.setItem(baseTutorialPhaseKey, 'verify');
    } catch {
      // ignore
    }
  };

  const tutorialTop = (insets.top || StatusBar.currentHeight || 0) + 8;

  const handleTips = () => {
    alert({
      title: '촬영 팁',
      message: [
        '• 밝은 조명에서 촬영하세요',
        '• 음식은 접시 전체가 나오게 촬영하세요',
        '• 성분표/원재료명은 글자가 선명하게 나오게 가까이 촬영하세요',
        '• 흔들림 없이 선명하게 촬영하세요',
      ].join('\n'),
      actions: [{ text: '확인', variant: 'primary' }],
    });
  };

  const handleScan = async () => {
    const ok = await ensureScanQuotaOrAlert();
    if (!ok) return;

    try {
      const nav: any = navigation as any;
      const rootNav = nav?.getParent?.() ?? nav;
      rootNav.navigate('Camera');
    } catch (error: any) {
      console.error('Camera Error:', error);
      alert({ title: '오류', message: error?.message || '카메라를 실행하는 중 문제가 발생했습니다.' });
    }
  };

  const handleScanFromTutorial = async () => {
    if (showTutorial) {
      await goToVerifyTutorialPhase();
    }
    await handleScan();
  };

  const handleGallery = async () => {
    const ok = await ensureScanQuotaOrAlert();
    if (!ok) return;

    try {
      const picked = await pickPhotoFromLibrary({ quality: 0.84 });
      if (picked?.uri) {
        const nav: any = navigation as any;
        const rootNav = nav?.getParent?.() ?? nav;
        rootNav.navigate('Edit', { imageUri: picked.uri });
      }
    } catch (error: any) {
      console.error('Gallery Error:', error);
      alert({ title: '오류', message: error?.message || '갤러리를 여는 중 문제가 발생했습니다.' });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>음식 분석</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topContent}>
          <Card style={styles.scannerCard}>
            <View style={styles.scannerHeader}>
              <View style={styles.iconContainer}>
                <AppIcon name="manage-search" color="#FFFFFF" size={24} />
              </View>
              <View style={styles.scannerTextContainer}>
                <Text style={styles.scannerTitle}>스마트 스캐너</Text>
                <Text style={styles.scannerDesc}>
                  음식 사진이나 포장지의 영양성분표/원재료명을 찍어주시면,
                  AI가 빠르게 읽고 정리해드려요.
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.infoCard}>
            <Text style={styles.cardTitle}>무엇을 찍으면 되나요?</Text>
            <View style={styles.tagRow}>
              <Badge variant="outline" text="밝은 조명" />
              <Badge variant="outline" text="선명한 초점" />
              <Badge variant="outline" text="전체가 보이게" />
            </View>
            <View style={styles.quickList}>
              <Text style={styles.quickItem}>• 음식 사진 (접시 전체가 나오게)</Text>
              <Text style={styles.quickItem}>• 영양성분표 / 원재료명 (글자 선명하게)</Text>
              <Text style={styles.quickItem}>• 결과는 사진 기반 추정이므로 참고용이에요</Text>
            </View>
          </Card>

        </View>

        <View style={styles.bottomActions}>
          <View ref={scanButtonAnchorRef} onLayout={measureScanButton}>
            <Button
              title="사진 촬영하기"
              onPress={handleScanFromTutorial}
              style={styles.scanButton}
              icon={<AppIcon name="photo-camera" color="#FFFFFF" size={20} />}
            />
          </View>

          <View style={styles.secondaryActions}>
            <View style={{ height: 12 }} />
            <Button
              title="사진 선택하기"
              onPress={handleGallery}
              variant="outline"
              style={styles.scanButton}
              icon={<AppIcon name="photo-library" color={COLORS.primary} size={20} />}
            />
            <View style={{ height: 12 }} />
            <Button
              title="촬영 팁"
              onPress={handleTips}
              variant="outline"
              style={styles.scanButton}
              icon={<AppIcon name="lightbulb" color={COLORS.primary} size={20} />}
            />
          </View>
        </View>
      </View>

      <Modal transparent visible={showTutorial} animationType="fade">
        <View style={styles.tutorialModalRoot} onLayout={measureScanButton}>
          <View style={[styles.tutorialModalTopRow, { paddingTop: tutorialTop }]}>
            <Text style={styles.tutorialTopLabel} accessibilityRole="text">
              사용 가이드
            </Text>
            <TouchableOpacity onPress={finalizeTutorial} accessibilityRole="button" style={styles.tutorialSkip}>
              <Text style={styles.tutorialSkipText}>건너뛰기</Text>
            </TouchableOpacity>
          </View>

          {!!scanButtonRect && (
            <>
              {(() => {
                const highlightPadding = 6;
                const holeX = scanButtonRect.x - highlightPadding;
                const holeY = scanButtonRect.y - highlightPadding;
                const holeW = scanButtonRect.width + highlightPadding * 2;
                const holeH = scanButtonRect.height + highlightPadding * 2;
                const holeR = RADIUS.sm + highlightPadding;

                return (
                  <>
                    {/* Absorb touches everywhere by default */}
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => {}}
                      style={styles.tutorialTouchAbsorber}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    />

                    {/* Dim layer with rounded cutout */}
                    <Svg
                      pointerEvents="none"
                      width={screenWidth}
                      height={screenHeight}
                      style={styles.tutorialDimSvg}
                    >
                      <Defs>
                        <Mask id="scanCutoutMask">
                          <Rect width="100%" height="100%" fill="white" />
                          <Rect x={holeX} y={holeY} width={holeW} height={holeH} rx={holeR} ry={holeR} fill="black" />
                        </Mask>
                      </Defs>
                      <Rect
                        width="100%"
                        height="100%"
                        fill="rgba(0,0,0,0.35)"
                        mask="url(#scanCutoutMask)"
                      />
                    </Svg>

                    {/* Highlight frame */}
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

                    {/* Arrow + text */}
                    <View
                      pointerEvents="none"
                      style={[
                        styles.tutorialHint,
                        {
                          left: Math.max(16, scanButtonRect.x + scanButtonRect.width / 2 - 130),
                          top: Math.max(tutorialTop + 10, scanButtonRect.y - 78),
                        },
                      ]}
                    >
                      <Text style={styles.tutorialHintText}>여기를 눌러 음식 사진을 찍고 분석해요</Text>
                      <Text style={styles.tutorialArrow}>↓</Text>
                    </View>

                    {/* Click-through area for CTA: call the same handler as the existing button */}
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={handleScanFromTutorial}
                      style={[
                        styles.tutorialCtaHitbox,
                        {
                          left: scanButtonRect.x - 10,
                          top: scanButtonRect.y - 10,
                          width: scanButtonRect.width + 20,
                          height: scanButtonRect.height + 20,
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
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  header: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  topContent: { gap: SPACING.md },
  bottomActions: { marginTop: 'auto' },
  secondaryActions: {},
  
  // Scanner Card
  scannerCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.blue50,
    borderColor: COLORS.blue200,
  },
  scannerHeader: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTextContainer: { flex: 1 },
  scannerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  scannerDesc: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  scanButton: { width: '100%' },

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
  tutorialModalTopRow: {
    paddingHorizontal: SPACING.md,
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
    borderRadius: RADIUS.full,
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

  // Info Card
  infoCard: { padding: SPACING.md },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.sm },
  quickList: { gap: 4 },
  quickItem: { fontSize: 14, color: COLORS.textGray, lineHeight: 20 },
});
