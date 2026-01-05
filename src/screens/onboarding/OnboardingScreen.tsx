import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigation/types';
import { AppIcon } from '../../components/ui/AppIcon';
import { Button } from '../../components/ui/Button';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import { ALL_ALLERGENS, BODY_GOALS, HEALTH_DIETS, LIFESTYLE_DIETS } from '../../constants';
import { useUserStore } from '../../store/userStore';
import type { BodyGoalType, HealthDietType, LifestyleDietType, UserProfile } from '../../types/user';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const setProfile = useUserStore(state => state.setProfile);
  const addBodyLog = useUserStore(state => state.addBodyLog);

  const [step, setStep] = useState(1);
  const [bodyGoal, setBodyGoal] = useState<BodyGoalType | null>(null);
  const [healthDiet, setHealthDiet] = useState<HealthDietType | null>(null);
  const [lifestyleDiet, setLifestyleDiet] = useState<LifestyleDietType | null>(null);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [allergenSearch, setAllergenSearch] = useState('');
  const [customAllergen, setCustomAllergen] = useState('');

  const [currentWeightText, setCurrentWeightText] = useState('');
  const [targetWeightText, setTargetWeightText] = useState('');
  const [heightText, setHeightText] = useState('');
  const [ageText, setAgeText] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');

  const progressAnim = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step * 25,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progressAnim, step]);

  const handleNext = async () => {
    if (step === 1 && !bodyGoal) return;
    if (step === 2 && !healthDiet) return;
    if (step === 3 && !lifestyleDiet) return;

    if (step < 4) {
      setStep(step + 1);
      return;
    }

    const now = new Date().toISOString();

    const parseNumber = (v: string) => {
      const n = Number(String(v).replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) ? n : undefined;
    };

    const currentWeight = parseNumber(currentWeightText);
    const targetWeight = parseNumber(targetWeightText);
    const height = parseNumber(heightText);
    const age = parseNumber(ageText);

    const newProfile: UserProfile = {
      id: Date.now().toString(),
      email: 'test@example.com',
      name: '테스트 유저',
      bodyGoal: bodyGoal!,
      healthDiet: healthDiet!,
      lifestyleDiet: lifestyleDiet!,
      allergens: selectedAllergens,
      currentWeight,
      targetWeight,
      height,
      age,
      gender: gender || undefined,
      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now,
      plan_id: 'free',
      premium_quota_remaining: 0,
      free_image_quota_remaining: 3,
    };

    await setProfile(newProfile);

    if (typeof currentWeight === 'number' && currentWeight > 0) {
      try {
        await addBodyLog({
          id: `${Date.now()}`,
          userId: newProfile.id,
          weight: currentWeight,
          timestamp: now,
        });
      } catch (e) {
        console.error('Failed to save initial body log', e);
      }
    }

    navigation.replace('MainTab');
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const toggleAllergen = (allergen: string) => {
    if (selectedAllergens.includes(allergen)) {
      setSelectedAllergens(prev => prev.filter(a => a !== allergen));
    } else {
      setSelectedAllergens(prev => [...prev, allergen]);
    }
  };

  const addCustomAllergen = () => {
    if (!customAllergen.trim()) return;
    const next = customAllergen.trim();
    if (!selectedAllergens.includes(next)) {
      setSelectedAllergens(prev => [...prev, next]);
    }
    setCustomAllergen('');
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressLabels}>
        <Text style={styles.stepText}>단계 {step} / 4</Text>
        <Text style={styles.percentText}>{step * 25}%</Text>
      </View>
      <View style={styles.progressBarBg}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>체형 관리 목적을 선택하세요</Text>
      <Text style={styles.stepSubtitle}>식단 분석의 기준이 됩니다</Text>
      <View style={styles.optionsContainer}>
        {BODY_GOALS.map(goal => (
          <TouchableOpacity
            key={goal.id}
            style={[styles.optionCard, bodyGoal === goal.id && styles.optionCardSelected]}
            onPress={() => setBodyGoal(goal.id as BodyGoalType)}
          >
            <Text style={[styles.optionLabel, bodyGoal === goal.id && styles.optionLabelSelected]}>
              {goal.label}
            </Text>
            <Text style={styles.optionDesc}>{goal.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>건강 관리 목적을 선택하세요</Text>
      <Text style={styles.stepSubtitle}>질병 예방 및 건강 개선에 활용됩니다</Text>
      <View style={styles.gridContainer}>
        {HEALTH_DIETS.map(diet => (
          <TouchableOpacity
            key={diet.id}
            style={[styles.gridCard, healthDiet === diet.id && styles.optionCardSelected]}
            onPress={() => setHealthDiet(diet.id as HealthDietType)}
          >
            <Text style={[styles.optionLabel, healthDiet === diet.id && styles.optionLabelSelected]}>
              {diet.label}
            </Text>
            <Text style={styles.optionDesc} numberOfLines={2}>
              {diet.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>식습관 유형을 선택하세요</Text>
      <Text style={styles.stepSubtitle}>신념이나 선호에 따른 식단입니다</Text>
      <View style={styles.gridContainer}>
        {LIFESTYLE_DIETS.map(diet => (
          <TouchableOpacity
            key={diet.id}
            style={[styles.gridCard, lifestyleDiet === diet.id && styles.optionCardSelected]}
            onPress={() => setLifestyleDiet(diet.id as LifestyleDietType)}
          >
            <Text style={[styles.optionLabel, lifestyleDiet === diet.id && styles.optionLabelSelected]}>
              {diet.label}
            </Text>
            <Text style={styles.optionDesc} numberOfLines={2}>
              {diet.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep4 = () => {
    const filteredAllergens = ALL_ALLERGENS.filter(a => a.includes(allergenSearch));

    return (
      <View>
        <Text style={styles.stepTitle}>추가 정보를 입력하세요</Text>
        <Text style={styles.stepSubtitle}>맞춤 분석과 기록에 활용됩니다</Text>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>신체 정보 (선택)</Text>
          <Text style={styles.sectionDesc}>체중은 첫 신체 기록으로 저장돼요.</Text>

          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={styles.formLabel}>현재 체중(kg)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="예: 67"
                keyboardType="numeric"
                value={currentWeightText}
                onChangeText={setCurrentWeightText}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.formLabel}>목표 체중(kg)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="예: 62"
                keyboardType="numeric"
                value={targetWeightText}
                onChangeText={setTargetWeightText}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={styles.formLabel}>키(cm)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="예: 172"
                keyboardType="numeric"
                value={heightText}
                onChangeText={setHeightText}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.formLabel}>나이</Text>
              <TextInput
                style={styles.formInput}
                placeholder="예: 28"
                keyboardType="numeric"
                value={ageText}
                onChangeText={setAgeText}
              />
            </View>
          </View>

          <Text style={[styles.formLabel, { marginTop: 10 }]}>성별</Text>
          <View style={styles.chipRow}>
            {([
              { id: 'male', label: '남' },
              { id: 'female', label: '여' },
            ] as const).map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, gender === opt.id && styles.chipSelected]}
                onPress={() => setGender(prev => (prev === opt.id ? '' : opt.id))}
              >
                <Text style={[styles.chipText, gender === opt.id && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>알레르기 성분</Text>
          <Text style={styles.sectionDesc}>위험 성분을 자동으로 감지합니다</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchIcon}>
            <AppIcon name="search" size={20} color={COLORS.textGray} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="알레르기 성분 검색... (예: 땅콩, 우유)"
            value={allergenSearch}
            onChangeText={setAllergenSearch}
          />
        </View>

        <View style={styles.customInputContainer}>
          <Text style={styles.customInputLabel}>직접 추가하기 (목록에 없는 성분)</Text>
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              placeholder="예: 파슬리, 고수, 민트 등"
              value={customAllergen}
              onChangeText={setCustomAllergen}
            />
            <Button variant="outline" size="sm" onPress={addCustomAllergen}>
              추가
            </Button>
          </View>
        </View>

        <View style={styles.selectedTags}>
          {selectedAllergens.map((allergen, idx) => (
            <TouchableOpacity key={idx} style={styles.tag} onPress={() => toggleAllergen(allergen)}>
              <Text style={styles.tagText}>{allergen}</Text>
              <AppIcon name="close" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          ))}
        </View>

        {allergenSearch.length > 0 && (
          <View style={styles.allergenList}>
            {filteredAllergens.slice(0, 10).map((allergen, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.allergenItem}
                onPress={() => toggleAllergen(allergen)}
              >
                <Text
                  style={[
                    styles.allergenItemText,
                    selectedAllergens.includes(allergen) && styles.allergenItemTextSelected,
                  ]}
                >
                  {allergen} {selectedAllergens.includes(allergen) && '(선택됨)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {renderProgressBar()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <Button variant="outline" onPress={handleBack} style={styles.backButton}>
            이전
          </Button>
        )}
        <Button
          style={styles.nextButton}
          disabled={(step === 1 && !bodyGoal) || (step === 2 && !healthDiet) || (step === 3 && !lifestyleDiet)}
          onPress={handleNext}
        >
          {step === 4 ? '완료' : '다음'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingBottom: 100 },

  // Progress Bar
  progressContainer: { marginBottom: SPACING.xl },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stepText: { fontSize: 16, fontWeight: '500', color: COLORS.textGray },
  percentText: { fontSize: 16, fontWeight: '500', color: COLORS.primary },
  progressBarBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: RADIUS.full },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.full },

  // Steps
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: COLORS.textGray, marginBottom: SPACING.xl },

  sectionBlock: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionDesc: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textGray,
  },
  fieldRow: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  field: {
    flex: 1,
    minWidth: 0,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textGray,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    height: 44,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  chipRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.blue50,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textGray,
  },
  chipTextSelected: {
    color: COLORS.primary,
  },

  optionsContainer: { gap: SPACING.sm },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },

  optionCard: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    height: 88,
    justifyContent: 'center',
  },
  gridCard: {
    width: (width - 48 - SPACING.sm) / 2,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    minHeight: 100,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.blue50,
  },
  optionLabel: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  optionLabelSelected: { color: COLORS.primary },
  optionDesc: { fontSize: 14, color: COLORS.textGray },

  // Step 4
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    height: 48,
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.text },

  customInputContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  customInputLabel: { fontSize: 16, fontWeight: '500', color: COLORS.text, marginBottom: SPACING.sm },
  customInputRow: { flexDirection: 'row', gap: SPACING.sm },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    height: 40,
  },

  selectedTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.red50,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.red200,
    gap: 8,
  },
  tagText: { color: COLORS.danger, fontWeight: '600' },

  allergenList: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    maxHeight: 200,
  },
  allergenItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  allergenItemText: { fontSize: 16, color: COLORS.text },
  allergenItemTextSelected: { color: COLORS.textGray, textDecorationLine: 'line-through' },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  backButton: { flex: 1 },
  nextButton: { flex: 2 },
});
