import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { GRADE_LABELS, GRADE_COLORS } from '../../types/user';

type RouteProps = RouteProp<RootStackParamList, 'FoodResult'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodResult'>;

export default function FoodResultScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { analysis, imageUri } = route.params;

  // 임시: 사용자 분석이 없으면 기본값
  const userAnalysis = analysis.userAnalysis || {
    grade: 'neutral',
    reasons: ['분석 결과입니다.'],
    warnings: [],
    alternatives: [],
    tips: [],
  };

  const renderGradeBadge = () => {
    const grade = userAnalysis.grade || 'neutral';
    const color = GRADE_COLORS[grade] || '#9CA3AF';
    const label = GRADE_LABELS[grade] || '보통';
    
    const icon = {
      very_good: '🎉',
      good: '👍',
      neutral: '👌',
      bad: '⚠️',
      very_bad: '🚫',
    }[grade] || '👌';

    return (
      <View style={[styles.gradeBadge, { backgroundColor: color }]}>
        <Text style={styles.gradeIcon}>{icon}</Text>
        <Text style={styles.gradeLabel}>{label}</Text>
      </View>
    );
  };

  const macros = analysis.macros || {};

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: imageUri }} style={styles.image} />

        {renderGradeBadge()}

        <View style={styles.card}>
          <Text style={styles.dishName}>{analysis.dishName}</Text>
          {analysis.description && (
            <Text style={styles.description}>{analysis.description}</Text>
          )}
          {analysis.categories && analysis.categories.length > 0 && (
            <View style={styles.categories}>
              {analysis.categories.map((cat, idx) => (
                <View key={idx} style={styles.categoryTag}>
                  <Text style={styles.categoryText}>{cat}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {userAnalysis.reasons && userAnalysis.reasons.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>💡 분석 결과</Text>
            {userAnalysis.reasons.map((reason, idx) => (
              <View key={idx} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{reason}</Text>
              </View>
            ))}
          </View>
        )}

        {userAnalysis.warnings && userAnalysis.warnings.length > 0 && (
          <View style={[styles.card, styles.warningCard]}>
            <Text style={styles.warningTitle}>⚠️ 주의사항</Text>
            {userAnalysis.warnings.map((warning, idx) => (
              <View key={idx} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.listText, styles.warningText]}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        {userAnalysis.alternatives && userAnalysis.alternatives.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🔄 대신 이런 음식은 어때요?</Text>
            {userAnalysis.alternatives.map((alt, idx) => (
              <View key={idx} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{alt}</Text>
              </View>
            ))}
          </View>
        )}

        {userAnalysis.tips && userAnalysis.tips.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>💬 섭취 팁</Text>
            {userAnalysis.tips.map((tip, idx) => (
              <View key={idx} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.nutritionHeader}>
            <Text style={styles.sectionTitle}>음식 성분</Text>
            {analysis.source && (
              <View style={[
                styles.sourceBadge,
                analysis.source.includes('DB') ? styles.sourceBadgeDB : styles.sourceBadgeAI
              ]}>
                <Text style={styles.sourceBadgeText}>
                  {analysis.source.includes('DB') ? '🗄️ DB 정보' : '🤖 AI 추정'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.nutritionSubHeader}>
            {analysis.referenceStandard || '1인분 기준'}
          </Text>
          
          <View style={styles.nutritionTable}>
            {macros.calories !== undefined && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>열량</Text>
                <Text style={styles.nutritionValue}>{macros.calories} kcal</Text>
              </View>
            )}
            {macros.carbs_g !== undefined && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>탄수화물</Text>
                <Text style={styles.nutritionValue}>{macros.carbs_g}g</Text>
              </View>
            )}
            {macros.protein_g !== undefined && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>단백질</Text>
                <Text style={styles.nutritionValue}>{macros.protein_g}g</Text>
              </View>
            )}
            {macros.fat_g !== undefined && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>지방</Text>
                <Text style={styles.nutritionValue}>{macros.fat_g}g</Text>
              </View>
            )}
            {macros.sodium_mg !== undefined && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>나트륨</Text>
                <Text style={styles.nutritionValue}>{macros.sodium_mg}mg</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.buttonPrimaryText}>처음으로 돌아가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 20, paddingBottom: 100 },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: '#E5E7EB',
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  gradeIcon: { fontSize: 24, marginRight: 8 },
  gradeLabel: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  dishName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: '#E0E7FF',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  categoryText: { fontSize: 12, color: '#3730A3' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D97706',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 8,
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  warningText: { color: '#92400E' },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sourceBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  sourceBadgeDB: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  sourceBadgeAI: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  nutritionSubHeader: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  nutritionTable: { gap: 8 },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  nutritionLabel: { fontSize: 14, color: '#6B7280' },
  nutritionValue: { fontSize: 14, fontWeight: '600', color: '#111' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimary: { backgroundColor: '#3B82F6' },
  buttonPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
