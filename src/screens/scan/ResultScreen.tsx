import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';

import { FoodAnalysis, FoodGrade } from '../../types/user';

export default function ResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { imageUri, analysis } = route.params as { imageUri: string, analysis: FoodAnalysis };

  const handleDone = () => {
    navigation.navigate('MainTab', { screen: 'History' });
  };

  const getGradeLetter = (grade?: FoodGrade) => {
    switch (grade) {
      case 'very_good': return 'A';
      case 'good': return 'B';
      case 'neutral': return 'C';
      case 'bad': return 'D';
      case 'very_bad': return 'E';
      default: return '?';
    }
  };

  const getGradeVariant = (grade?: FoodGrade) => {
    switch (grade) {
      case 'very_good': return 'success';
      case 'good': return 'success';
      case 'neutral': return 'warning';
      case 'bad': return 'danger';
      case 'very_bad': return 'danger';
      default: return 'default';
    }
  };

  const grade = analysis.userAnalysis?.grade;
  const gradeLetter = getGradeLetter(grade);
  const gradeVariant = getGradeVariant(grade);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Image */}
        <View style={styles.imageHeader}>
          <Image source={{ uri: imageUri }} style={styles.headerImage} />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <AppIcon name="chevron-left" size={26} color="white" />
          </TouchableOpacity>
          <View style={styles.scoreBadge}>
            <Badge 
              variant={gradeVariant} 
              text={`NutriScore ${gradeLetter}`} 
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.foodName}>{analysis.dishName}</Text>
          <Text style={styles.calories}>{analysis.macros.calories} kcal</Text>

          {/* Macros */}
          <View style={styles.macrosContainer}>
            <Card style={styles.macroCard}>
              <Text style={styles.macroValue}>{analysis.macros.protein_g}g</Text>
              <Text style={styles.macroLabel}>단백질</Text>
              <View style={[styles.macroBar, { backgroundColor: COLORS.primary, width: '80%' }]} />
            </Card>
            <Card style={styles.macroCard}>
              <Text style={styles.macroValue}>{analysis.macros.carbs_g}g</Text>
              <Text style={styles.macroLabel}>탄수화물</Text>
              <View style={[styles.macroBar, { backgroundColor: COLORS.secondary, width: '40%' }]} />
            </Card>
            <Card style={styles.macroCard}>
              <Text style={styles.macroValue}>{analysis.macros.fat_g}g</Text>
              <Text style={styles.macroLabel}>지방</Text>
              <View style={[styles.macroBar, { backgroundColor: COLORS.destructive, width: '60%' }]} />
            </Card>
          </View>

          {/* Analysis Text */}
          <Card style={styles.analysisCard}>
            <Text style={styles.sectionTitle}>분석 결과</Text>
            <Text style={styles.analysisText}>
              {analysis.userAnalysis?.tips?.[0] || analysis.description || '분석 결과가 없습니다.'}
            </Text>
          </Card>

          <Button 
            title="기록에 저장" 
            onPress={handleDone} 
            icon={<AppIcon name="check" size={20} color="white" />}
            style={styles.doneButton}
          />
        </View>
      </ScrollView>
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
  scoreBadge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
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
  macrosContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  macroCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  macroBar: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  analysisCard: {
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  analysisText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  doneButton: {
    width: '100%',
  },
});
