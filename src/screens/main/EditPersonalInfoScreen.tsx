import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { AppIcon } from '../../components/ui/AppIcon';
import { Button } from '../../components/ui/Button';
import { useAppAlert, type AppAlertActionVariant } from '../../components/ui/AppAlert';
import { useUserStore } from '../../store/userStore';
import { BODY_GOALS, HEALTH_DIETS, LIFESTYLE_DIETS } from '../../constants';
import type { BodyGoalType, HealthDietType, LifestyleDietType } from '../../types/user';

type EditRowProps = {
  label: string;
  value: string;
  onEdit: () => void;
};

function EditRow({ label, value, onEdit }: EditRowProps) {
  return (
    <View style={styles.editRow}>
      <View style={styles.editRowLeft}>
        <Text style={styles.editRowLabel}>{label}</Text>
        <Text style={styles.editRowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <Button variant="outline" size="sm" onPress={onEdit}>
        수정
      </Button>
    </View>
  );
}

export default function EditPersonalInfoScreen() {
  const navigation = useNavigation();
  const { alert } = useAppAlert();

  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);

  const [nicknameDraft, setNicknameDraft] = useState(profile?.nickname || profile?.name || '');

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

  const allergensLabel = useMemo(() => {
    const list = profile?.allergens;
    if (!Array.isArray(list) || list.length === 0) return '없음';
    return list.join(', ');
  }, [profile?.allergens]);

  const handleNicknameChangeOnly = async () => {
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

  const openBodyGoalAlert = () => {
    if (!profile) {
      alert({ title: '프로필 없음', message: '로그인/온보딩 후 변경할 수 있어요.' });
      return;
    }

    alert({
      title: '체형 목표 수정',
      message: '변경할 값을 선택하세요.',
      actions: [
        ...BODY_GOALS.map(g => ({
          text: g.label,
          variant: (profile.bodyGoal === g.id ? 'primary' : 'outline') as AppAlertActionVariant,
          onPress: () => updateProfile({ bodyGoal: g.id as BodyGoalType }),
        })),
      ],
    });
  };

  const openHealthDietAlert = () => {
    if (!profile) {
      alert({ title: '프로필 없음', message: '로그인/온보딩 후 변경할 수 있어요.' });
      return;
    }

    alert({
      title: '건강 목적 수정',
      message: '변경할 값을 선택하세요.',
      actions: [
        ...HEALTH_DIETS.map(d => ({
          text: d.label,
          variant: (profile.healthDiet === d.id ? 'primary' : 'outline') as AppAlertActionVariant,
          onPress: () => updateProfile({ healthDiet: d.id as HealthDietType }),
        })),
      ],
    });
  };

  const openLifestyleDietAlert = () => {
    if (!profile) {
      alert({ title: '프로필 없음', message: '로그인/온보딩 후 변경할 수 있어요.' });
      return;
    }

    alert({
      title: '식습관 수정',
      message: '변경할 값을 선택하세요.',
      actions: [
        ...LIFESTYLE_DIETS.map(d => ({
          text: d.label,
          variant: (profile.lifestyleDiet === d.id ? 'primary' : 'outline') as AppAlertActionVariant,
          onPress: () => updateProfile({ lifestyleDiet: d.id as LifestyleDietType }),
        })),
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 정보 수정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>닉네임</Text>
          <View style={styles.nicknameRow}>
            <TextInput
              style={styles.textInput}
              value={nicknameDraft}
              onChangeText={setNicknameDraft}
              placeholder="닉네임 입력"
              placeholderTextColor={COLORS.textGray}
            />
            <Button variant="outline" size="sm" onPress={handleNicknameChangeOnly}>
              변경
            </Button>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>내 설정</Text>
          <EditRow label="체형 목표" value={bodyGoalLabel} onEdit={openBodyGoalAlert} />
          <EditRow label="건강 목적" value={healthDietLabel} onEdit={openHealthDietAlert} />
          <EditRow label="식습관" value={lifestyleDietLabel} onEdit={openLifestyleDietAlert} />
          <EditRow
            label="알레르기"
            value={allergensLabel}
            onEdit={() => navigation.navigate('EditAllergens' as never)}
          />
        </Card>

        <View style={{ height: 6 }} />
        <Button onPress={() => navigation.goBack()}>
          확인
        </Button>
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
  nicknameRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  editRowLeft: {
    flex: 1,
  },
  editRowLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  editRowValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
  },
});
