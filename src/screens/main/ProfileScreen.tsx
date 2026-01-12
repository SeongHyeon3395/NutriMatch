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
import { getMonthlyAverageGradeLetterRemote, getMonthlyScanCountRemote, getSessionUserId, updateMyProfileAvatarRemote } from '../../services/userData';
import { MONTHLY_SCAN_LIMIT } from '../../config';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { alert } = useAppAlert();

  const profile = useUserStore(state => state.profile);
  const clearAllData = useUserStore(state => state.clearAllData);
  const setProfile = useUserStore(state => state.setProfile);

  const [monthlyScanCount, setMonthlyScanCount] = useState<number | null>(null);
  const [monthlyGradeLetter, setMonthlyGradeLetter] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  const userName = profile?.nickname || profile?.name || '사용자';
  const plan = profile?.plan_id ? String(profile.plan_id) : 'Free';

  const usedThisMonth = typeof monthlyScanCount === 'number' ? monthlyScanCount : null;
  const remainingThisMonth = typeof usedThisMonth === 'number' ? Math.max(0, MONTHLY_SCAN_LIMIT - usedThisMonth) : null;

  const avatarPath = profile?.avatarPath || null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!avatarPath) {
        if (mounted) setAvatarUrl(null);
        return;
      }
      try {
        if (!supabase) {
          if (mounted) setAvatarUrl(null);
          return;
        }
        const { data, error } = await supabase.storage.from('profile-avatars').createSignedUrl(avatarPath, 60 * 60 * 24 * 7);
        if (!mounted) return;
        if (error) {
          setAvatarUrl(null);
          return;
        }
        setAvatarUrl(data.signedUrl);
      } catch {
        if (mounted) setAvatarUrl(null);
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
      const ImagePicker = require('react-native-image-crop-picker');
      const picked = await ImagePicker.openPicker({
        mediaType: 'photo',
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.9,
        includeBase64: true,
      });

      const localUri = String(picked?.path ?? '').trim();
      if (!localUri) return;

      const base64 = typeof picked?.data === 'string' ? picked.data : null;

      setIsUpdatingAvatar(true);
      const result = await updateMyProfileAvatarRemote({
        localUri,
        base64,
        mime: picked?.mime ?? null,
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
          if (mounted) setMonthlyGradeLetter(null);
          return;
        }
        const [n, gradeLetter] = await Promise.all([
          getMonthlyScanCountRemote().catch(() => null),
          getMonthlyAverageGradeLetterRemote().catch(() => null),
        ]);
        if (!mounted) return;
        setMonthlyScanCount(typeof n === 'number' ? n : 0);
        setMonthlyGradeLetter(typeof gradeLetter === 'string' ? gradeLetter : null);
      } catch {
        if (mounted) setMonthlyScanCount(null);
        if (mounted) setMonthlyGradeLetter(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  const menuItems = [
    { iconName: 'person', label: '내 정보', route: 'PersonalInfo' },
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
              ) : isUpdatingAvatar ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <AppIcon name="add" size={30} color={COLORS.text} />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName} 님</Text>
            <View style={styles.planBadge}>
              <Badge variant="secondary" text={plan + ' 플랜'} />
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
              {monthlyGradeLetter || '-'}
            </Text>
            <Text style={styles.statLabel}>이번 달 등급</Text>
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
              style={styles.menuItem}
              onPress={() => {
                if (item.route === 'PersonalInfo') {
                  navigation.navigate('PersonalInfo' as never);
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
  },
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
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
