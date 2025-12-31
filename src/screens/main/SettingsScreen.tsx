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

type RowProps = {
  title: string;
  description?: string;
  onPress?: () => void;
  right?: React.ReactNode;
};

function Row({ title, description, onPress, right }: RowProps) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={styles.row}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      {right ?? <AppIcon name="chevron-right" size={22} color={COLORS.textSecondary} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { alert } = useAppAlert();
  const clearAllData = useUserStore(state => state.clearAllData);

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
              await supabase.auth.signOut();
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

  const handleClearLocal = useCallback(() => {
    alert({
      title: '데이터 초기화',
      message: '이 기기에 저장된 프로필/기록 데이터를 삭제합니다. 계속할까요?',
      actions: [
        { text: '취소', variant: 'outline' },
        {
          text: '삭제',
          variant: 'danger',
          onPress: async () => {
            await clearAllData();
            alert({ title: '완료', message: '로컬 데이터가 초기화되었습니다.' });
          },
        },
      ],
    });
  }, [alert, clearAllData]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Row
            title="내 정보"
            description="닉네임/목표/알레르기 등"
            onPress={() => navigation.navigate('PersonalInfo' as never)}
          />
          <View style={styles.divider} />
          <Row title="개인정보 및 보안" onPress={() => navigation.navigate('Privacy' as never)} />
          <View style={styles.divider} />
          <Row title="서비스 이용약관" onPress={() => navigation.navigate('Terms' as never)} />
          <View style={styles.divider} />
          <Row title="개인정보 처리방침" onPress={() => navigation.navigate('PrivacyPolicy' as never)} />
        </Card>

        <Card style={styles.card}>
          <Row title="로컬 데이터 초기화" description="이 기기에 저장된 프로필/기록 삭제" onPress={handleClearLocal} />
          <View style={styles.divider} />
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
    backgroundColor: COLORS.border,
    marginLeft: SPACING.md,
  },
});
