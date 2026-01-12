import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';

type RouteParams = {
  title: string;
  date: string;
  calories: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
};

export default function MealDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { title, date, calories, grade } = route.params as RouteParams;

  const gradeVariant = ((): 'success' | 'warning' | 'danger' | 'default' => {
    switch (grade) {
      case 'A':
      case 'B':
        return 'success';
      case 'C':
        return 'warning';
      case 'D':
      case 'F':
        return 'danger';
      default:
        return 'default';
    }
  })();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button">
          <AppIcon name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>자세히 보기</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mealTitle}>{title}</Text>
              <View style={styles.metaRow}>
                <AppIcon name="access-time" size={12} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{date}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{calories} kcal</Text>
              </View>
            </View>
            <Badge variant={gradeVariant} text={grade} style={{ alignSelf: 'flex-start' }} />
          </View>

          <Text style={styles.helperText}>최근 식사 카드에서 선택한 항목의 요약 정보예요.</Text>
        </Card>

        <Card style={styles.detailCard}>
          <Text style={styles.sectionTitle}>분석 요약</Text>
          <Text style={styles.paragraph}>
            현재는 최근 식사 예시 데이터로 동작합니다. 실제 분석 기록과 연결하면 촬영 이미지, 영양 성분표, 등급 이유 등을 여기에서 확인할 수 있어요.
          </Text>
        </Card>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
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
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  summaryCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  summaryTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  metaDot: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginHorizontal: 6,
  },
  helperText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  detailCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
