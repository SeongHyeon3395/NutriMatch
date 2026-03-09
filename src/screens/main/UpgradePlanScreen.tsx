import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';
import { useAppAlert } from '../../components/ui/AppAlert';
import { useUserStore } from '../../store/userStore';
import { getPlanLabel, normalizePlanId, PLAN_LIMITS, type AppPlanId } from '../../services/plans';
import { useTheme } from '../../theme/ThemeProvider';

type PlanFeature = {
  text: string;
  tokenInfo?: {
    title: string;
    message: string;
  };
};

const PLAN_FEATURES: Record<'plus' | 'pro', PlanFeature[]> = {
  plus: [
    {
      text: '월 챗봇 300,000 토큰',
      tokenInfo: {
        title: '300,000 토큰은 어느 정도인가요?',
        message:
          '질문 + 답변 1번 왕복을 대략 1,000~2,000 토큰 정도로 보면, 보통 약 150~300번 정도의 채팅이 가능해요.\n\n질문이 길거나 답변을 길게 받을수록 더 빨리 소진될 수 있어요.',
      },
    },
    { text: '월 스캔 30회' },
    { text: '월 식단 생성 30회' },
    { text: '우선 응답 처리' },
  ],
  pro: [
    {
      text: '월 챗봇 1,000,000 토큰',
      tokenInfo: {
        title: '1,000,000 토큰은 어느 정도인가요?',
        message:
          '질문 + 답변 1번 왕복을 대략 1,000~2,000 토큰 정도로 보면, 보통 약 500~1,000번 정도의 채팅이 가능해요.\n\n매일 자주 물어보는 편이어도 꽤 넉넉한 편이고, 긴 상담형 대화를 많이 하면 사용량은 더 빨라질 수 있어요.',
      },
    },
    { text: '월 스캔 80회' },
    { text: '월 식단 생성 80회' },
    { text: '헤비 유저용 대화량' },
  ],
};

export default function UpgradePlanScreen() {
  const navigation = useNavigation<any>();
  const { alert } = useAppAlert();
  const { colors } = useTheme();
  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);

  const currentPlan = useMemo(() => normalizePlanId(profile?.plan_id), [profile?.plan_id]);

  const openTokenInfo = (feature: PlanFeature) => {
    if (!feature.tokenInfo) return;
    alert({
      title: feature.tokenInfo.title,
      message: feature.tokenInfo.message,
      actions: [{ text: '확인', variant: 'primary' }],
    });
  };

  const applyPlan = async (planId: 'plus' | 'pro') => {
    if (currentPlan === planId) {
      alert({ title: '안내', message: `이미 ${getPlanLabel(planId)} 플랜을 사용 중이에요.` });
      return;
    }

    await updateProfile({ plan_id: planId as AppPlanId });
    alert({
      title: '플랜 변경 완료',
      message: `${getPlanLabel(planId)} 플랜이 적용되었어요.`,
      actions: [{ text: '확인', variant: 'primary', onPress: () => navigation.goBack() }],
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundGray }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>프리미엄 업그레이드</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard} variant="elevated">
          <Text style={[styles.summaryTitle, { color: colors.text }]}>현재 플랜</Text>
          <View style={styles.summaryRow}>
            <Badge variant="secondary" text={`${getPlanLabel(currentPlan)} 플랜`} />
            <Text style={[styles.summaryDesc, { color: colors.textSecondary }]}>필요할 때 언제든 상위 플랜으로 변경할 수 있어요.</Text>
          </View>
        </Card>

        <Card style={styles.planCard} variant="elevated">
          <View style={styles.planHeader}>
            <Text style={[styles.planName, { color: colors.text }]}>Plus</Text>
            <Text style={[styles.planPrice, { color: colors.textSecondary }]}>₩4,900 / $4.99</Text>
          </View>
          {PLAN_FEATURES.plus.map((feature) => (
            <View key={feature.text} style={styles.featureRow}>
              <Text style={[styles.featureItem, { color: colors.text }]}>• {feature.text}</Text>
              {feature.tokenInfo ? (
                <TouchableOpacity
                  onPress={() => openTokenInfo(feature)}
                  style={[styles.infoButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  accessibilityRole="button"
                  accessibilityLabel="토큰 설명 보기"
                >
                  <AppIcon name="info-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
          <View style={{ height: 12 }} />
          <Button
            title={currentPlan === 'plus' ? '현재 플랜' : 'Plus로 업그레이드'}
            variant={currentPlan === 'plus' ? 'outline' : 'primary'}
            disabled={currentPlan === 'plus'}
            onPress={() => applyPlan('plus')}
          />
        </Card>

        <Card style={styles.planCard} variant="elevated">
          <View style={styles.planHeader}>
            <Text style={[styles.planName, { color: colors.text }]}>Pro</Text>
            <Text style={[styles.planPrice, { color: colors.textSecondary }]}>₩12,900 / $12.99</Text>
          </View>
          {PLAN_FEATURES.pro.map((feature) => (
            <View key={feature.text} style={styles.featureRow}>
              <Text style={[styles.featureItem, { color: colors.text }]}>• {feature.text}</Text>
              {feature.tokenInfo ? (
                <TouchableOpacity
                  onPress={() => openTokenInfo(feature)}
                  style={[styles.infoButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  accessibilityRole="button"
                  accessibilityLabel="토큰 설명 보기"
                >
                  <AppIcon name="info-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
          <View style={{ height: 12 }} />
          <Button
            title={currentPlan === 'pro' ? '현재 플랜' : 'Pro로 업그레이드'}
            variant={currentPlan === 'pro' ? 'outline' : 'primary'}
            disabled={currentPlan === 'pro'}
            onPress={() => applyPlan('pro')}
          />
        </Card>

        <Card style={styles.noteCard} variant="elevated">
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>※ 실제 결제 연동 전에는 테스트용으로 즉시 플랜이 적용됩니다.</Text>
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>※ 월간 제공량은 매월 1일 자동 초기화됩니다.</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  summaryCard: { padding: SPACING.md },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  summaryRow: { gap: 8 },
  summaryDesc: { fontSize: 13, color: COLORS.textSecondary },
  planCard: { padding: SPACING.md, borderRadius: RADIUS.md },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  planName: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  planPrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  featureItem: { flex: 1, fontSize: 14, color: COLORS.text },
  infoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCard: { padding: SPACING.md },
  noteText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});
