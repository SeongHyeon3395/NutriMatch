import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';
import { useAppAlert } from '../../components/ui/AppAlert';
import { useUserStore } from '../../store/userStore';
import { getMonthlyScanCountRemote, getSessionUserId, insertFoodLogRemote } from '../../services/userData';
import { MONTHLY_SCAN_LIMIT } from '../../config';
import { getFoodScore100 } from '../../services/foodScore';

import { FoodAnalysis } from '../../types/user';

export default function ResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { imageUri, analysis } = route.params as { imageUri: string, analysis: FoodAnalysis };

  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  const { alert } = useAppAlert();

  const profile = useUserStore(state => state.profile);
  const addFoodLog = useUserStore(state => state.addFoodLog);

  const score100 = getFoodScore100(analysis);

  const listOrEmpty = (arr: any): string[] =>
    Array.isArray(arr) ? arr.filter((x: any) => typeof x === 'string' && x.trim()) : [];

  const ua: any = analysis.userAnalysis;
  const pros = listOrEmpty(ua?.pros);
  const cons = listOrEmpty(ua?.cons);
  const goalFit = listOrEmpty(ua?.goalFit);
  const dietFit = listOrEmpty(ua?.dietFit);
  const healthImpact = listOrEmpty(ua?.healthImpact);
  const warnings = listOrEmpty(ua?.warnings);
  const alternatives = listOrEmpty(ua?.alternatives);
  const tips = listOrEmpty(ua?.tips);

  const macros = analysis.macros || {};
  const proteinG = typeof macros.protein_g === 'number' ? macros.protein_g : Number(macros.protein_g ?? 0) || 0;
  const carbsG = typeof macros.carbs_g === 'number' ? macros.carbs_g : Number(macros.carbs_g ?? 0) || 0;
  const fatG = typeof macros.fat_g === 'number' ? macros.fat_g : Number(macros.fat_g ?? 0) || 0;
  const sodiumMg = typeof macros.sodium_mg === 'number' ? macros.sodium_mg : Number(macros.sodium_mg ?? NaN);

  const proteinKcal = Math.max(0, proteinG) * 4;
  const carbsKcal = Math.max(0, carbsG) * 4;
  const fatKcal = Math.max(0, fatG) * 9;
  const macroKcalSum = proteinKcal + carbsKcal + fatKcal;

  const macroPct = useMemo(() => {
    if (!(macroKcalSum > 0)) return { protein: 0, carbs: 0, fat: 0 };

    const p = Math.round((proteinKcal / macroKcalSum) * 100);
    const c = Math.round((carbsKcal / macroKcalSum) * 100);
    let f = 100 - p - c;
    if (f < 0) f = 0;
    if (p + c + f !== 100) {
      const delta = 100 - (p + c + f);
      f = Math.max(0, f + delta);
    }
    return { protein: p, carbs: c, fat: f };
  }, [carbsKcal, macroKcalSum, proteinKcal]);

  const userDisplayName = (profile?.nickname || profile?.name || '사용자').trim();

  const macroAdjustments = useMemo(() => {
    const out: string[] = [];
    if (!(macroKcalSum > 0)) return out;

    if (macroPct.protein < 20) out.push('단백질 비중이 낮은 편이에요. 단백질(닭/생선/두부/계란/그릭요거트)을 추가해보세요.');
    if (macroPct.protein > 45) out.push('단백질 비중이 높은 편이에요. 채소/수분/탄수 밸런스를 함께 챙기면 좋아요.');
    if (macroPct.carbs > 55) out.push('탄수화물 비중이 높은 편이에요. 면/밥 양을 줄이거나 통곡/채소로 대체해보세요.');
    if (macroPct.fat > 40) out.push('지방 비중이 높은 편이에요. 튀김/소스/기름진 부위를 줄이면 점수가 오르기 쉬워요.');

    if (profile?.healthDiet === 'low_carb' && macroPct.carbs > 45) out.push('저당식(저탄수) 식단이라면 탄수 비중을 더 낮추는 게 좋아요.');
    if (profile?.healthDiet === 'high_protein' && macroPct.protein < 25) out.push('고단백 식단이라면 단백질을 조금 더 보강하는 게 좋아요.');
    if (profile?.healthDiet === 'low_fat' && macroPct.fat > 35) out.push('저지방식이라면 지방(특히 튀김/가공)을 줄여보세요.');

    return out.slice(0, 6);
  }, [macroKcalSum, macroPct.carbs, macroPct.fat, macroPct.protein, profile?.healthDiet]);

  const dietSpecificWarningLine = useMemo(() => {
    // 상단 '내 식단 정보'는 제거하되, 주의 섹션에서만 최소한의 힌트로 사용
    if (profile?.healthDiet === 'low_sodium') {
      const highSodium = Number.isFinite(sodiumMg) ? sodiumMg > 800 : false;
      return `${userDisplayName}님: 저염식 관점에서 나트륨이 ${highSodium ? '높을 수 있어요' : '확인해보세요'}!`;
    }
    return null;
  }, [profile?.healthDiet, sodiumMg, userDisplayName]);

  const renderList = (items: string[], variant: 'good' | 'bad' | 'warn') => {
    const iconName = variant === 'good' ? 'check-circle' : variant === 'bad' ? 'error' : 'warning';
    const color = variant === 'good' ? COLORS.success : variant === 'bad' ? COLORS.danger : COLORS.secondary;
    const textStyle = variant === 'good' ? styles.goodText : variant === 'bad' ? styles.badText : styles.warnText;

    if (!items || items.length === 0) {
      return <Text style={styles.emptyText}>X</Text>;
    }

    return (
      <View style={styles.listBlock}>
        {items.slice(0, 6).map((t, idx) => (
          <View key={`${variant}-${idx}`} style={styles.listRow}>
            <AppIcon name={iconName as any} size={18} color={color} />
            <Text style={[styles.listRowText, textStyle]}>{t}</Text>
          </View>
        ))}
      </View>
    );
  };

  const Section = ({ title, subtitle, children }: { title: string; subtitle?: string | null; children: React.ReactNode }) => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        {children}
      </View>
    );
  };

  const getMealTypeFromNow = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 22) return 'dinner';
    return 'snack';
  };

  const handleDone = async () => {
    try {
      const timestamp = new Date().toISOString();
      const mealType = getMealTypeFromNow();

      const userId = await getSessionUserId().catch(() => null);
      if (userId) {
        try {
          const used = await getMonthlyScanCountRemote();
          if (typeof used === 'number' && used >= MONTHLY_SCAN_LIMIT) {
            alert({
              title: '스캔 기회 소진',
              message: `이번 달 스캔 기회를 모두 사용했어요. (${MONTHLY_SCAN_LIMIT}회/월)`,
            });
            return;
          }
        } catch {
          // 카운트 조회 실패 시에는 보수적으로 막지 않고 진행
        }
        // 서버 우선 저장
        const saved = await insertFoodLogRemote({
          userId,
          imageUri,
          analysis,
          mealType,
          timestamp,
        });
        // 로컬 캐시(오프라인 빠른 표시용)
        await addFoodLog(saved);
      } else {
        // 로컬 모드
        await addFoodLog({
          id: `${Date.now()}`,
          userId: profile?.id ?? 'local',
          imageUri,
          analysis,
          mealType,
          timestamp,
        });
      }

      navigation.navigate('MainTab', { screen: 'History' });
    } catch (e) {
      console.error('Failed to save food log', e);
      const message =
        e instanceof Error ? e.message :
        typeof e === 'string' ? e :
        '';
      alert({
        title: '저장 실패',
        message: message || '기록 저장 중 오류가 발생했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Image */}
        <View style={styles.imageHeader}>
          <Image source={{ uri: imageUri }} style={styles.headerImage} />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <AppIcon name="chevron-left" size={26} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewButton} onPress={() => setIsImagePreviewOpen(true)}>
            <Text style={styles.previewButtonText}>사진 자세히 보기</Text>
          </TouchableOpacity>

          {/* Dish label (sticker-like) */}
          <View style={styles.dishSticker}>
            <Text style={styles.dishStickerText} numberOfLines={1}>{analysis.dishName}!</Text>
          </View>

          {typeof score100 === 'number' ? (
            <View style={styles.scoreSticker}>
              <Text style={styles.scoreStickerText}>{score100}점</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <Text style={styles.foodName}>{analysis.dishName}</Text>
          <Text style={styles.calories}>{macros.calories ?? '-'} kcal</Text>

          {/* Macros + Diet Type */}
          <Section title="영양 요약">
            <View style={styles.macrosContainer}>
              <Card style={styles.macroCard}>
                <Text style={styles.macroValue}>{proteinG || 0}g</Text>
                <Text style={styles.macroLabel}>단백질</Text>
                <View style={styles.macroBarTrack}>
                  <View style={[styles.macroBarFill, { backgroundColor: COLORS.primary, width: `${macroPct.protein}%` }]} />
                </View>
                <Text style={styles.macroPctText}>{macroPct.protein}%</Text>
              </Card>
              <Card style={styles.macroCard}>
                <Text style={styles.macroValue}>{carbsG || 0}g</Text>
                <Text style={styles.macroLabel}>탄수화물</Text>
                <View style={styles.macroBarTrack}>
                  <View style={[styles.macroBarFill, { backgroundColor: COLORS.secondary, width: `${macroPct.carbs}%` }]} />
                </View>
                <Text style={styles.macroPctText}>{macroPct.carbs}%</Text>
              </Card>
              <Card style={styles.macroCard}>
                <Text style={styles.macroValue}>{fatG || 0}g</Text>
                <Text style={styles.macroLabel}>지방</Text>
                <View style={styles.macroBarTrack}>
                  <View style={[styles.macroBarFill, { backgroundColor: COLORS.destructive, width: `${macroPct.fat}%` }]} />
                </View>
                <Text style={styles.macroPctText}>{macroPct.fat}%</Text>
              </Card>
            </View>

            <View style={[styles.macroGauge, { marginTop: 10 }]}>
              <View style={[styles.macroGaugeSeg, { backgroundColor: COLORS.primary, width: `${macroPct.protein}%` }]} />
              <View style={[styles.macroGaugeSeg, { backgroundColor: COLORS.secondary, width: `${macroPct.carbs}%` }]} />
              <View style={[styles.macroGaugeSeg, { backgroundColor: COLORS.destructive, width: `${macroPct.fat}%` }]} />
            </View>

            <Text style={[styles.subTitle, { marginTop: 12 }]}>수정/추가 포인트</Text>
            {macroAdjustments.length > 0 ? (
              <View style={styles.listBlock}>
                {macroAdjustments.map((t, idx) => (
                  <View key={`adj-${idx}`} style={styles.listRow}>
                    <AppIcon name="tune" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.listRowText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>X</Text>
            )}
          </Section>

          {/* Good */}
          <Section title="체크">
            {renderList(pros, 'good')}
          </Section>

          {/* Bad */}
          <Section title="경고">
            {renderList(cons, 'bad')}
          </Section>

          {/* Caution */}
          <Section title="주의" subtitle={dietSpecificWarningLine}>
            {renderList(warnings, 'warn')}
          </Section>

          {/* Alternatives */}
          <Section title="추천/대체" subtitle={tips.length > 1 ? '개선하면 점수가 오를 수 있어요.' : null}>
            {alternatives.length > 0 ? (
              <View style={styles.listBlock}>
                {alternatives.slice(0, 6).map((t: string, idx: number) => (
                  <View key={`alt-${idx}`} style={styles.listRow}>
                    <AppIcon name="swap-horiz" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.listRowText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>X</Text>
            )}
          </Section>

          {/* Other */}
          {(goalFit.length > 0 || dietFit.length > 0 || healthImpact.length > 0) ? (
            <Section title="분석 상세" subtitle="목표/식단/건강 관점에서 더 풀어쓴 내용">
              {goalFit.length > 0 ? (
                <>
                  <Text style={styles.subTitle}>목표 기준</Text>
                  {goalFit.slice(0, 4).map((t: string, idx: number) => (
                    <Text key={`goal-${idx}`} style={styles.bulletText}>• {t}</Text>
                  ))}
                </>
              ) : null}
              {dietFit.length > 0 ? (
                <>
                  <Text style={[styles.subTitle, { marginTop: goalFit.length > 0 ? 10 : 6 }]}>현재 식단 기준</Text>
                  {dietFit.slice(0, 4).map((t: string, idx: number) => (
                    <Text key={`diet-${idx}`} style={styles.bulletText}>• {t}</Text>
                  ))}
                </>
              ) : null}
              {healthImpact.length > 0 ? (
                <>
                  <Text style={[styles.subTitle, { marginTop: (goalFit.length > 0 || dietFit.length > 0) ? 10 : 6 }]}>건강 관점</Text>
                  {healthImpact.slice(0, 6).map((t: string, idx: number) => (
                    <Text key={`health-${idx}`} style={styles.bulletText}>• {t}</Text>
                  ))}
                </>
              ) : null}
            </Section>
          ) : (
            <Section title="분석 상세" subtitle="목표/식단/건강 관점에서 더 풀어쓴 내용">
              <Text style={styles.emptyText}>X</Text>
            </Section>
          )}

          {/* At a glance (bottom) */}
          <Section title="한눈에 보기" subtitle={tips[0] ? null : '분석이 비어있으면 기본 설명이 표시돼요.'}>
            <Text style={styles.analysisText}>
              {tips[0] || analysis.description || '분석 결과가 없습니다.'}
            </Text>
            <Text style={styles.analysisNote}>
              사진과 사용자 프로필을 바탕으로 AI가 추정한 결과예요. 더 정확히 보려면 선명하게 다시 찍어주세요.
            </Text>
          </Section>

          <Button 
            title="기록에 남기기" 
            onPress={handleDone} 
            icon={<AppIcon name="check" size={20} color="white" />}
            style={styles.doneButton}
          />
        </View>
      </ScrollView>

      <Modal visible={isImagePreviewOpen} transparent animationType="fade" onRequestClose={() => setIsImagePreviewOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Image source={{ uri: imageUri }} style={styles.modalImage} resizeMode="contain" />
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsImagePreviewOpen(false)}>
            <AppIcon name="close" size={26} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageHeader: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewButton: {
    position: 'absolute',
    top: 22,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  previewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  dishSticker: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    maxWidth: '75%',
  },
  dishStickerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  scoreSticker: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  scoreStickerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    padding: 24,
    marginTop: -24,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  foodName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  calories: {
    fontSize: 20,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  sectionSubtitle: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  macrosContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  macroBarTrack: {
    height: 6,
    borderRadius: 999,
    width: '100%',
    backgroundColor: COLORS.backgroundGray,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  macroPctText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },
  macroGauge: {
    height: 12,
    width: '100%',
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundGray,
  },
  macroGaugeSeg: {
    height: '100%',
  },
  analysisText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  subTitle: {
    marginTop: 2,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  bulletText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  listBlock: {
    marginTop: 2,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  listRowText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  goodText: {
    color: COLORS.success,
    fontWeight: '700',
  },
  badText: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  warnText: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '800',
  },
  analysisNote: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  doneButton: {
    width: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 30,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
