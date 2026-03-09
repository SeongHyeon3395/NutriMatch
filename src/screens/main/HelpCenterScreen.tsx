import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { AppIcon } from '../../components/ui/AppIcon';
import { useTheme } from '../../theme/ThemeProvider';

const FAQS = [
  {
    q: '토큰이 무엇인가요?',
    a: '챗봇 1회 질문/답변에서 사용되는 텍스트 처리량입니다. 플랜별로 월 제공량이 다르며 매월 초기화됩니다.',
  },
  {
    q: '토큰이 모두 소진되면 어떻게 되나요?',
    a: '해당 월에는 챗봇 사용이 제한됩니다. 플랜 업그레이드 시 즉시 추가 제공량이 적용됩니다.',
  },
  {
    q: '이번 달 남은 횟수/토큰은 어디서 보나요?',
    a: '내 정보 > 플랜 또는 구독 관리 화면에서 확인할 수 있습니다.',
  },
  {
    q: '결제 오류/환불은 어떻게 하나요?',
    a: '스토어 결제 정책에 따라 Play Store/App Store의 구독 관리에서 처리됩니다.',
  },
];

export default function HelpCenterScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundGray }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>고객 센터</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card} variant="elevated">
          <Text style={[styles.sectionTitle, { color: colors.text }]}>문의 채널</Text>
          <Text style={[styles.channelText, { color: colors.text }]}>• 이메일: support@nutrimatch.app</Text>
          <Text style={[styles.channelText, { color: colors.text }]}>• 운영시간: 평일 10:00 ~ 18:00 (KST)</Text>
          <Text style={[styles.channelSub, { color: colors.textSecondary }]}>문의 시 계정 아이디와 문제 화면 캡처를 함께 보내주시면 빠르게 도와드릴 수 있어요.</Text>
        </Card>

        <Card style={styles.card} variant="elevated">
          <Text style={[styles.sectionTitle, { color: colors.text }]}>자주 묻는 질문</Text>
          {FAQS.map((f) => (
            <View key={f.q} style={[styles.faqItem, { borderTopColor: colors.border }]}>
              <Text style={[styles.faqQ, { color: colors.text }]}>Q. {f.q}</Text>
              <Text style={[styles.faqA, { color: colors.textSecondary }]}>A. {f.a}</Text>
            </View>
          ))}
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
  card: { padding: SPACING.md, borderRadius: RADIUS.md },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  channelText: { fontSize: 14, color: COLORS.text, marginBottom: 6 },
  channelSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginTop: 4 },
  faqItem: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  faqQ: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  faqA: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
});
