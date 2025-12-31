import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { AppIcon } from '../../components/ui/AppIcon';
import { useUserStore } from '../../store/userStore';
import { Button } from '../../components/ui/Button';
import { useAppAlert } from '../../components/ui/AppAlert';
import { ALL_ALLERGENS, BODY_GOALS, HEALTH_DIETS, LIFESTYLE_DIETS } from '../../constants';
import { BodyGoalType, HealthDietType, LifestyleDietType } from '../../types/user';

const { width } = Dimensions.get('window');

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function PersonalInfoScreen() {
  const navigation = useNavigation();
  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);
  const { alert } = useAppAlert();

  const [isEditing, setIsEditing] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [bodyGoal, setBodyGoal] = useState<BodyGoalType | null>(null);
  const [healthDiet, setHealthDiet] = useState<HealthDietType | null>(null);
  const [lifestyleDiet, setLifestyleDiet] = useState<LifestyleDietType | null>(null);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [allergenSearch, setAllergenSearch] = useState('');
  const [customAllergen, setCustomAllergen] = useState('');

  useEffect(() => {
    if (!profile) return;
    if (!isEditing) return;

    setNicknameDraft(profile.nickname || profile.name || '');
    setBodyGoal((profile.bodyGoal as BodyGoalType) || null);
    setHealthDiet((profile.healthDiet as HealthDietType) || null);
    setLifestyleDiet((profile.lifestyleDiet as LifestyleDietType) || null);
    setSelectedAllergens(Array.isArray(profile.allergens) ? profile.allergens : []);
    setAllergenSearch('');
    setCustomAllergen('');
  }, [isEditing, profile]);

  const username = profile?.username || (profile?.email ? profile.email.split('@')[0] : '');
  const nickname = profile?.nickname || profile?.name || '';

  const bodyGoalLabel = useMemo(() => {
    if (!profile?.bodyGoal) return '설정 전';
    return BODY_GOALS.find(x => x.id === profile.bodyGoal)?.label || String(profile.bodyGoal);
  }, [profile?.bodyGoal]);

  const healthDietLabel = useMemo(() => {
    if (!profile?.healthDiet) return '설정 전';
    return HEALTH_DIETS.find(x => x.id === profile.healthDiet)?.label || String(profile.healthDiet);
  }, [profile?.healthDiet]);

  const lifestyleDietLabel = useMemo(() => {
    if (!profile?.lifestyleDiet) return '설정 전';
    return LIFESTYLE_DIETS.find(x => x.id === profile.lifestyleDiet)?.label || String(profile.lifestyleDiet);
  }, [profile?.lifestyleDiet]);

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens(prev => {
      if (prev.includes(allergen)) return prev.filter(a => a !== allergen);
      return [...prev, allergen];
    });
  };

  const addCustomAllergen = () => {
    const next = customAllergen.trim();
    if (!next) return;
    setSelectedAllergens(prev => (prev.includes(next) ? prev : [...prev, next]));
    setCustomAllergen('');
  };

  const handleNicknameChange = async () => {
    if (!profile) {
      alert({ title: '프로필 없음', message: '로그인/온보딩 후 변경할 수 있어요.' });
      return;
    }
    const next = nicknameDraft.trim();
    if (!next) {
      alert({ title: '닉네임 입력', message: '닉네임을 입력해주세요.' });
      return;
    }
    await updateProfile({ nickname: next });
    alert({ title: '닉네임 변경 완료', message: '닉네임이 변경되었습니다.' });
  };

  const handleSaveAll = async () => {
    if (!profile) {
      alert({ title: '프로필 없음', message: '로그인/온보딩 후 변경할 수 있어요.' });
      return;
    }

    if (!bodyGoal || !healthDiet || !lifestyleDiet) {
      alert({ title: '필수 항목', message: '체형 목표 / 건강 목적 / 식습관을 선택해주세요.' });
      return;
    }

    await updateProfile({
      nickname: nicknameDraft.trim() || nickname,
      bodyGoal,
      healthDiet,
      lifestyleDiet,
      allergens: selectedAllergens,
    });
    setIsEditing(false);
    alert({ title: '저장 완료', message: '내 정보가 저장되었습니다.' });
  };

  const filteredAllergens = useMemo(() => {
    if (!allergenSearch) return [];
    return ALL_ALLERGENS.filter(a => a.includes(allergenSearch));
  }, [allergenSearch]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <AppIcon name="chevron-left" size={26} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내 정보</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>안내</Text>
            <Text style={styles.emptyText}>프로필 정보가 없습니다. 온보딩 또는 로그인 후 이용해주세요.</Text>
            <View style={{ height: 12 }} />
            <Button variant="outline" onPress={() => navigation.goBack()}>
              뒤로
            </Button>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 정보</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            if (isEditing) {
              setIsEditing(false);
              return;
            }
            setIsEditing(true);
          }}>
          <Text style={styles.editButtonText}>{isEditing ? '취소' : '수정'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>계정</Text>
          <InfoRow label="아이디" value={username || '로그인 후 표시'} />

          {!isEditing ? (
            <InfoRow label="닉네임" value={nickname || '로그인 후 표시'} />
          ) : (
            <View style={styles.editRow}>
              <Text style={styles.infoLabel}>닉네임</Text>
              <View style={styles.editRowRight}>
                <TextInput
                  style={styles.textInput}
                  value={nicknameDraft}
                  onChangeText={setNicknameDraft}
                  placeholder="닉네임 입력"
                  placeholderTextColor={COLORS.textGray}
                />
                <Button variant="outline" size="sm" onPress={handleNicknameChange}>
                  변경
                </Button>
              </View>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>내 설정</Text>
          {!isEditing ? (
            <>
              <InfoRow label="체형 목표" value={bodyGoalLabel} />
              <InfoRow label="건강 목적" value={healthDietLabel} />
              <InfoRow label="식습관" value={lifestyleDietLabel} />
              <InfoRow label="알레르기" value={profile?.allergens?.length ? profile.allergens.join(', ') : '없음'} />
            </>
          ) : (
            <>
              <Text style={styles.subTitle}>체형 목표</Text>
              <View style={styles.optionsContainer}>
                {BODY_GOALS.map(goal => (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.optionCard, bodyGoal === goal.id && styles.optionCardSelected]}
                    onPress={() => setBodyGoal(goal.id as BodyGoalType)}>
                    <Text style={[styles.optionLabel, bodyGoal === goal.id && styles.optionLabelSelected]}>
                      {goal.label}
                    </Text>
                    <Text style={styles.optionDesc}>{goal.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.subTitle}>건강 목적</Text>
              <View style={styles.gridContainer}>
                {HEALTH_DIETS.map(diet => (
                  <TouchableOpacity
                    key={diet.id}
                    style={[styles.gridCard, healthDiet === diet.id && styles.optionCardSelected]}
                    onPress={() => setHealthDiet(diet.id as HealthDietType)}>
                    <Text style={[styles.optionLabel, healthDiet === diet.id && styles.optionLabelSelected]}>
                      {diet.label}
                    </Text>
                    <Text style={styles.optionDesc} numberOfLines={2}>
                      {diet.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.subTitle}>식습관</Text>
              <View style={styles.gridContainer}>
                {LIFESTYLE_DIETS.map(diet => (
                  <TouchableOpacity
                    key={diet.id}
                    style={[styles.gridCard, lifestyleDiet === diet.id && styles.optionCardSelected]}
                    onPress={() => setLifestyleDiet(diet.id as LifestyleDietType)}>
                    <Text style={[styles.optionLabel, lifestyleDiet === diet.id && styles.optionLabelSelected]}>
                      {diet.label}
                    </Text>
                    <Text style={styles.optionDesc} numberOfLines={2}>
                      {diet.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.subTitle}>알레르기</Text>
              <View style={styles.searchContainer}>
                <View style={styles.searchIcon}>
                  <AppIcon name="search" size={20} color={COLORS.textGray} />
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="알레르기 성분 검색... (예: 땅콩, 우유)"
                  placeholderTextColor={COLORS.textGray}
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
                    placeholderTextColor={COLORS.textGray}
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
                  <TouchableOpacity key={`${allergen}-${idx}`} style={styles.tag} onPress={() => toggleAllergen(allergen)}>
                    <Text style={styles.tagText}>{allergen}</Text>
                    <AppIcon name="close" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                ))}
              </View>

              {!!allergenSearch && (
                <View style={styles.allergenList}>
                  {filteredAllergens.slice(0, 10).map((allergen, idx) => (
                    <TouchableOpacity
                      key={`${allergen}-${idx}`}
                      style={styles.allergenItem}
                      onPress={() => toggleAllergen(allergen)}>
                      <Text
                        style={[
                          styles.allergenItemText,
                          selectedAllergens.includes(allergen) && styles.allergenItemTextSelected,
                        ]}>
                        {allergen} {selectedAllergens.includes(allergen) && '(선택됨)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>플랜</Text>
          <InfoRow label="플랜" value={profile?.plan_id ? String(profile.plan_id) : 'free'} />
          <InfoRow
            label="무료 이미지 쿼터"
            value={
              typeof profile?.free_image_quota_remaining === 'number'
                ? String(profile.free_image_quota_remaining)
                : '3'
            }
          />
          <InfoRow
            label="프리미엄 쿼터"
            value={
              typeof profile?.premium_quota_remaining === 'number'
                ? String(profile.premium_quota_remaining)
                : '0'
            }
          />
        </Card>

        {isEditing && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>저장</Text>
            <View style={styles.saveRow}>
              <Button variant="outline" onPress={() => setIsEditing(false)} style={{ flex: 1 }}>
                취소
              </Button>
              <Button onPress={handleSaveAll} style={{ flex: 1 }}>
                저장
              </Button>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  infoLabel: {
    width: 90,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    color: COLORS.text,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  editRowRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    color: COLORS.text,
  },

  subTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  optionsContainer: { gap: SPACING.sm },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  optionCard: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    minHeight: 84,
    justifyContent: 'center',
  },
  gridCard: {
    width: (width - 48 - SPACING.sm) / 2,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    minHeight: 96,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.blue50,
  },
  optionLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  optionLabelSelected: { color: COLORS.primary },
  optionDesc: { fontSize: 12, color: COLORS.textGray },

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
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  customInputContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  customInputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  customInputRow: { flexDirection: 'row', gap: SPACING.sm },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    height: 40,
    color: COLORS.text,
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
  tagText: { color: COLORS.danger, fontWeight: '700' },

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
  allergenItemText: { fontSize: 14, color: COLORS.text },
  allergenItemTextSelected: { color: COLORS.textGray, textDecorationLine: 'line-through' },

  saveRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
