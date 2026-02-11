import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';
import { useAppAlert } from '../../components/ui/AppAlert';
import { useUserStore } from '../../store/userStore';
import { supabase } from '../../services/supabaseClient';
import { getMonthlyAverageDietScoreRemote, getMonthlyMealPlanCountRemote, getMonthlyScanCountRemote, getSessionUserId, updateMyProfileAvatarRemote } from '../../services/userData';
import { MONTHLY_MEAL_PLAN_LIMIT, MONTHLY_SCAN_LIMIT } from '../../config';
import { pickAvatarFromLibrary } from '../../services/imagePicker';
import { markUserInitiatedSignOut } from '../../services/authSignals';
import { GRADE_COLORS } from '../../types/user';

function scoreToColor(score: number) {
  if (score >= 85) return GRADE_COLORS.very_good;
  if (score >= 70) return GRADE_COLORS.good;
  if (score >= 55) return GRADE_COLORS.neutral;
  if (score >= 40) return GRADE_COLORS.bad;
  return GRADE_COLORS.very_bad;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { alert } = useAppAlert();

  const profile = useUserStore(state => state.profile);
  const clearAllData = useUserStore(state => state.clearAllData);
  const setProfile = useUserStore(state => state.setProfile);

  const [monthlyScanCount, setMonthlyScanCount] = useState<number | null>(null);
  const [monthlyMealPlanCount, setMonthlyMealPlanCount] = useState<number | null>(null);
  const [monthlyDietScore, setMonthlyDietScore] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  const userName = profile?.nickname || profile?.name || '사용자';
  const plan = profile?.plan_id ? String(profile.plan_id) : 'Free';

  const usedThisMonth = typeof monthlyScanCount === 'number' ? monthlyScanCount : null;
  const remainingThisMonth = typeof usedThisMonth === 'number' ? Math.max(0, MONTHLY_SCAN_LIMIT - usedThisMonth) : null;
  const usedMealPlanThisMonth = typeof monthlyMealPlanCount === 'number' ? monthlyMealPlanCount : null;
  const remainingMealPlanThisMonth =
    typeof usedMealPlanThisMonth === 'number' ? Math.max(0, MONTHLY_MEAL_PLAN_LIMIT - usedMealPlanThisMonth) : null;
  const monthlyScoreColor = typeof monthlyDietScore === 'number' ? scoreToColor(monthlyDietScore) : COLORS.text;

  const avatarPath = profile?.avatarPath || null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!avatarPath) {
        if (mounted) setAvatarUrl(null);
        if (mounted) setIsLoadingAvatar(false);
        return;
      }
      try {
        if (!supabase) {
          if (mounted) setAvatarUrl(null);
          if (mounted) setIsLoadingAvatar(false);
          return;
        }

        if (mounted) setIsLoadingAvatar(true);
        const { data, error } = await supabase.storage.from('profile-avatars').createSignedUrl(avatarPath, 60 * 60 * 24 * 7);
        if (!mounted) return;
        if (error) {
          setAvatarUrl(null);
          return;
        }
        setAvatarUrl(data.signedUrl);
      } catch {
        if (mounted) setAvatarUrl(null);
      } finally {
        if (mounted) setIsLoadingAvatar(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [avatarPath]);

  const handleEditAvatar = useCallback(async () => {
    if (!profile?.id) {
      alert({ title: '로그인이 필요해요', message: '로그인 후 프로필 사진을 변경할 수 있습니다.' });
      return;
    }
    if (isUpdatingAvatar) return;

    try {
      const picked = await pickAvatarFromLibrary();
      const localUri = String(picked?.uri ?? '').trim();
      if (!localUri) return;

      const base64 = typeof picked?.base64 === 'string' ? picked.base64 : null;

      setIsUpdatingAvatar(true);
      const result = await updateMyProfileAvatarRemote({
        localUri,
        base64,
        mime: picked?.type ?? null,
        previousAvatarPath: profile.avatarPath ?? null,
      });

      await setProfile(result.profile);
      setAvatarUrl(result.signedUrl ?? null);
    } catch (e: any) {
      const msg = e?.message || String(e);
      // 취소 케이스는 조용히 무시
      if (/cancel/i.test(msg)) return;
      alert({ title: '프로필 사진 변경 실패', message: msg });
    } finally {
      setIsUpdatingAvatar(false);
    }
  }, [alert, isUpdatingAvatar, profile?.avatarPath, profile?.id, setProfile]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const userId = await getSessionUserId().catch(() => null);
        if (!userId) {
          if (mounted) setMonthlyScanCount(null);
          if (mounted) setMonthlyMealPlanCount(null);
          if (mounted) setMonthlyDietScore(null);
          return;
        }
        const [n, dietScore] = await Promise.all([
          getMonthlyScanCountRemote().catch(() => null),
          getMonthlyAverageDietScoreRemote().catch(() => null),
        ]);
        const mealPlanN = await getMonthlyMealPlanCountRemote().catch(() => null);
        if (!mounted) return;
        setMonthlyScanCount(typeof n === 'number' ? n : 0);
        setMonthlyMealPlanCount(typeof mealPlanN === 'number' ? mealPlanN : 0);
        setMonthlyDietScore(typeof dietScore === 'number' ? dietScore : null);
      } catch {
        if (mounted) setMonthlyScanCount(null);
        if (mounted) setMonthlyMealPlanCount(null);
        if (mounted) setMonthlyDietScore(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  const menuItems = [
    { iconName: 'person', label: '내 정보', route: 'PersonalInfo' },
    { iconName: 'history', label: '히스토리', route: 'History' },
    { iconName: 'notifications', label: '알림 설정', route: 'Notifications' },
    { iconName: 'security', label: '개인정보 및 보안', route: 'Privacy' },
    { iconName: 'credit-card', label: '구독 관리', route: 'Subscription' },
    { iconName: 'help-outline', label: '고객 센터', route: 'Help' },
  ];

  const handleLogout = () => {
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
            try {
              await clearAllData();
            } catch {
              // ignore
            }
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' as never }],
            });
          },
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Profile Section */}
        <View style={styles.header}>
          <View style={styles.avatarBlock}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleEditAvatar}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="프로필 이미지 추가"
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : isUpdatingAvatar || isLoadingAvatar ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <AppIcon name="add" size={30} color={COLORS.text} />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName} 님</Text>
            <View style={styles.planBadge}>
              <Badge variant="secondary" text={plan + ' 플랜'} />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('MonthlyDietScores' as never)}
                accessibilityRole="button"
                accessibilityLabel="월간 식단 점수 보기"
              >
                <Badge
                  variant="outline"
                  text={`이번 달 식단 점수 ${typeof monthlyDietScore === 'number' ? `${monthlyDietScore}점` : '-'}`}
                  textStyle={{ color: typeof monthlyDietScore === 'number' ? monthlyScoreColor : COLORS.textSecondary }}
                />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings' as never)}>
            <AppIcon name="settings" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{typeof remainingThisMonth === 'number' ? String(remainingThisMonth) : '-'}</Text>
            <Text style={styles.statLabel}>이번 달 남은 스캔</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statValue}>
              {typeof remainingMealPlanThisMonth === 'number' ? String(remainingMealPlanThisMonth) : '-'}
            </Text>
            <Text style={styles.statLabel}>이번 달 남은 식단 생성</Text>
          </Card>
        </View>

        {/* Premium Banner */}
        <TouchableOpacity style={styles.premiumBanner}>
          <View style={styles.premiumContent}>
            <View style={styles.premiumHeader}>
              <AppIcon name="workspace-premium" size={24} color="gold" />
              <Text style={styles.premiumTitle}>프리미엄으로 업그레이드</Text>
            </View>
            <Text style={styles.premiumDesc}>무제한 스캔과 상세 분석 리포트를 받아보세요.</Text>
          </View>
          <AppIcon name="chevron-right" size={26} color="white" />
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={() => {
                if (item.route === 'PersonalInfo') {
                  navigation.navigate('PersonalInfo' as never);
                  return;
                }
                if (item.route === 'History') {
                  navigation.navigate('History' as never);
                  return;
                }
                if (item.route === 'Privacy') {
                  navigation.navigate('Privacy' as never);
                  return;
                }
                alert({ title: item.label, message: '현재 버전에서는 준비 중인 기능입니다.' });
              }}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconBox}>
                  <AppIcon name={item.iconName} size={20} color={COLORS.text} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <AppIcon name="chevron-right" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <AppIcon name="logout" size={20} color={COLORS.destructive} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>버전 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarBlock: {
    alignItems: 'center',
    marginRight: 16,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.text,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarHint: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  premiumBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumContent: {
    flex: 1,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  premiumDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.destructive,
  },
  versionText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 20,
  },
});
