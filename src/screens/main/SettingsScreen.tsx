import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { AppIcon } from '../../components/ui/AppIcon';
import { useAppAlert } from '../../components/ui/AppAlert';
import { useUserStore } from '../../store/userStore';
import { supabase } from '../../services/supabaseClient';
import { markUserInitiatedSignOut } from '../../services/authSignals';
import { resetMyAccountDataRemote } from '../../services/userData';
import { useTheme, type ThemeMode } from '../../theme/ThemeProvider';

type RowProps = {
  title: string;
  description?: string;
  onPress?: () => void;
  right?: React.ReactNode;
};

function Row({ title, description, onPress, right }: RowProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={styles.row}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {description ? <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{description}</Text> : null}
      </View>
      {right ?? <AppIcon name="chevron-right" size={22} color={colors.textSecondary} />}
    </TouchableOpacity>
  );
}

type ThemeOptionRowProps = {
  title: string;
  description: string;
  iconName?: React.ComponentProps<typeof AppIcon>['name'];
  selected?: boolean;
  onPress: () => void;
};

function ThemeOptionRow({ title, description, iconName, selected, onPress }: ThemeOptionRowProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.themeOptionRow,
        {
          backgroundColor: selected ? colors.primary : colors.background,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.themeOptionTextCol}>
        <Text style={[styles.themeOptionTitle, { color: selected ? '#FFFFFF' : colors.text }]}>{title}</Text>
        <Text
          style={[
            styles.themeOptionDesc,
            { color: selected ? 'rgba(255,255,255,0.82)' : colors.textSecondary },
          ]}
        >
          {description}
        </Text>
      </View>

      <View style={styles.themeOptionRight}>
        {iconName ? (
          <AppIcon
            name={iconName}
            size={22}
            color={selected ? '#FFFFFF' : colors.textSecondary}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { alert, dismiss } = useAppAlert();
  const clearAllData = useUserStore(state => state.clearAllData);
  const { colors, mode, setMode } = useTheme();

  const themeLabelMap: Record<ThemeMode, string> = {
    system: '시스템',
    light: '라이트',
    dark: '다크',
  };

  const handleLogout = useCallback(() => {
    alert({
      title: '로그아웃',
      message: '정말 로그아웃 하시겠습니까?',
      actions: [
        { text: '취소', variant: 'outline' },
        {
          text: '로그아웃',
          variant: 'danger',
          onPress: async () => {
            try {
              markUserInitiatedSignOut();
              await supabase?.auth.signOut();
            } catch {
              // ignore
            }
            await clearAllData();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' as never }],
            });
          },
        },
      ],
    });
  }, [alert, clearAllData, navigation]);

  const handleResetAccountData = useCallback(() => {
    alert({
      title: '계정 데이터 초기화',
      message:
        '식단/히스토리 기록(최근 만든 식단 포함)을 삭제하고 신체정보를 초기화합니다.\n' +
        '초기화하면 되돌릴 수 없습니다.\n' +
        '초기화 후 신체정보를 다시 입력해야 합니다.\n' +
        '계속할까요?',
      actions: [
        { text: '취소', variant: 'outline' },
        {
          text: '초기화',
          variant: 'danger',
          onPress: async () => {
            try {
              await resetMyAccountDataRemote();
            } catch {
              // 서버 초기화 실패 시에도 로컬은 초기화하지 않음
              alert({ title: '실패', message: '계정 데이터 초기화에 실패했습니다. 잠시 후 다시 시도해주세요.' });
              return;
            }

            // 튜토리얼은 계정당 "최초 1회"만 노출: 계정 데이터 초기화로 다시 나오지 않도록 키를 유지합니다.

            await clearAllData();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding' as never, params: { initialStep: 1 } as never }],
            });
          },
        },
      ],
    });
  }, [alert, clearAllData, navigation]);

  const handleThemeMode = useCallback(() => {
    alert({
      title: '테마 설정',
      message: '앱 전체 색상 모드를 선택하세요.',
      content: (
        <View style={styles.themeOptionsWrap}>
          <ThemeOptionRow
            title="시스템"
            description="휴대폰 설정을 따라갑니다."
            iconName="brightness-auto"
            selected={mode === 'system'}
            onPress={() => {
              void setMode('system');
              dismiss();
            }}
          />
          <ThemeOptionRow
            title="라이트"
            description="항상 밝은 화면으로 표시합니다."
            iconName="light-mode"
            selected={mode === 'light'}
            onPress={() => {
              void setMode('light');
              dismiss();
            }}
          />
          <ThemeOptionRow
            title="다크"
            description="항상 어두운 화면으로 표시합니다."
            iconName="dark-mode"
            selected={mode === 'dark'}
            onPress={() => {
              void setMode('dark');
              dismiss();
            }}
          />
        </View>
      ),
      actions: [{ text: '닫기', variant: 'outline' }],
    });
  }, [alert, dismiss, mode, setMode]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Row
            title="테마"
            description="라이트 / 다크 / 시스템"
            onPress={handleThemeMode}
            right={<Text style={[styles.rightLabel, { color: colors.primary }]}>{themeLabelMap[mode]}</Text>}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row
            title="내 정보"
            description="닉네임/목표/알레르기 등"
            onPress={() => navigation.navigate('PersonalInfo' as never)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row
            title="알림 설정"
            description="식사 기록/요약 알림 관리"
            onPress={() => navigation.navigate('NotificationSettings' as never)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row title="구독 관리" description="플랜/월간 제공량 확인" onPress={() => navigation.navigate('Subscription' as never)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row title="고객 센터" description="문의 및 FAQ" onPress={() => navigation.navigate('HelpCenter' as never)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row title="개인정보 및 보안" onPress={() => navigation.navigate('Privacy' as never)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row title="서비스 이용약관" onPress={() => navigation.navigate('Terms' as never)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row title="개인정보 처리방침" onPress={() => navigation.navigate('PrivacyPolicy' as never)} />
        </Card>

        <Card style={styles.card}>
          <Row
            title="계정 데이터 초기화"
            description="신체정보/식단/히스토리 초기화"
            onPress={handleResetAccountData}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row title="로그아웃" onPress={handleLogout} />
        </Card>
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
    padding: 20,
    gap: SPACING.md,
  },
  card: {
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  rowDesc: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    marginLeft: SPACING.md,
  },
  rightLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  themeOptionsWrap: {
    gap: 10,
  },
  themeOptionRow: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeOptionTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  themeOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  themeOptionDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  themeOptionRight: {
    minWidth: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
