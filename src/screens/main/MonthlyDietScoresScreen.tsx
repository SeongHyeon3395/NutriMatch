import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppIcon } from '../../components/ui/AppIcon';
import { Card } from '../../components/ui/Card';
import { COLORS } from '../../constants/colors';
import { GRADE_COLORS } from '../../types/user';
import { getMonthlyDietScoresTimelineRemote, MonthlyDietScoreRow } from '../../services/userData';

function scoreToColor(score: number) {
  if (score >= 85) return GRADE_COLORS.very_good;
  if (score >= 70) return GRADE_COLORS.good;
  if (score >= 55) return GRADE_COLORS.neutral;
  if (score >= 40) return GRADE_COLORS.bad;
  return GRADE_COLORS.very_bad;
}

function formatMonthLabel(monthStartIso: string) {
  const d = new Date(monthStartIso);
  if (Number.isNaN(d.getTime())) return monthStartIso;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

export default function MonthlyDietScoresScreen() {
  const navigation = useNavigation();
  const [rows, setRows] = useState<MonthlyDietScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getMonthlyDietScoresTimelineRemote(36);
        if (!mounted) return;
        setRows(data);
      } catch {
        if (!mounted) return;
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const current = rows[0];
    const s = typeof current?.avg_score100 === 'number' ? current.avg_score100 : null;
    const n = typeof current?.logs_count === 'number' ? current.logs_count : 0;
    return { score: s, count: n };
  }, [rows]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button">
          <AppIcon name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>월간 식단 점수</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.hero}>
          <Text style={styles.heroTitle}>2026년 1월부터 월간 기록</Text>
          <Text style={styles.heroSub}>
            이번 달 평균 점수는 {typeof summary.score === 'number' ? `${summary.score}점` : '-'} · 기록 {summary.count}개 기준이에요.
          </Text>
        </Card>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>불러오는 중…</Text>
          </View>
        ) : rows.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>표시할 기록이 없어요</Text>
            <Text style={styles.emptySub}>식단 기록을 저장하면 월별 점수가 자동으로 쌓여요.</Text>
          </Card>
        ) : (
          <Card style={styles.listCard}>
            {rows.map((r, idx) => {
              const score = typeof r.avg_score100 === 'number' ? r.avg_score100 : null;
              const color = typeof score === 'number' ? scoreToColor(score) : COLORS.textSecondary;
              return (
                <View key={`m-${idx}`} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <View style={styles.rowText}>
                    <Text style={styles.month}>{formatMonthLabel(r.month_start)}</Text>
                    <Text style={styles.meta}>기록 {r.logs_count}개</Text>
                  </View>
                  <Text style={[styles.score, { color }]}>{typeof score === 'number' ? `${score}점` : '-'}</Text>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  hero: {
    padding: 14,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  heroSub: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  loading: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: COLORS.textSecondary,
  },
  emptyCard: {
    padding: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptySub: {
    marginTop: 6,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  listCard: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  rowText: {
    flex: 1,
  },
  month: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  score: {
    fontSize: 14,
    fontWeight: '900',
  },
});
