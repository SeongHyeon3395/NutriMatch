import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';
import { useAppAlert } from '../../components/ui/AppAlert';
import { useUserStore } from '../../store/userStore';
import { PRIVACY_POLICY_URL } from '../../config';

type PermissionStatus = 'granted' | 'denied' | 'unavailable' | 'unknown';

function statusToLabel(status: PermissionStatus) {
  switch (status) {
    case 'granted':
      return { text: '허용됨', variant: 'success' as const };
    case 'denied':
      return { text: '거부됨', variant: 'danger' as const };
    case 'unavailable':
      return { text: '지원 안 함', variant: 'outline' as const };
    default:
      return { text: '확인 필요', variant: 'outline' as const };
  }
}

async function openAppSettings() {
  // RN 0.82+ supports Linking.openSettings()
  return Linking.openSettings();
}

export default function PrivacySecurityScreen() {
  const navigation = useNavigation();
  const { alert } = useAppAlert();

  const profile = useUserStore(state => state.profile);
  const foodLogs = useUserStore(state => state.foodLogs);
  const bodyLogs = useUserStore(state => state.bodyLogs);
  const loadFoodLogs = useUserStore(state => state.loadFoodLogs);
  const loadBodyLogs = useUserStore(state => state.loadBodyLogs);
  const clearAllData = useUserStore(state => state.clearAllData);

  const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('unknown');
  const [photosStatus, setPhotosStatus] = useState<PermissionStatus>('unknown');
  const [locationStatus, setLocationStatus] = useState<PermissionStatus>('unknown');

  useEffect(() => {
    loadFoodLogs();
    loadBodyLogs();
  }, [loadFoodLogs, loadBodyLogs]);

  const refreshAndroidPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setCameraStatus('unknown');
      setPhotosStatus('unknown');
      setLocationStatus('unknown');
      return;
    }

    try {
      const cam = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      setCameraStatus(cam ? 'granted' : 'denied');

      const apiLevel =
        typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
      const photosPerm =
        apiLevel >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const photos = await PermissionsAndroid.check(photosPerm);
      setPhotosStatus(photos ? 'granted' : 'denied');

      const loc = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      setLocationStatus(loc ? 'granted' : 'denied');
    } catch {
      setCameraStatus('unknown');
      setPhotosStatus('unknown');
      setLocationStatus('unknown');
    }
  }, []);

  useEffect(() => {
    refreshAndroidPermissions();
  }, [refreshAndroidPermissions]);

  const handleOpenPrivacyPolicy = useCallback(async () => {
    if (!PRIVACY_POLICY_URL) {
      alert({
        title: '링크가 필요해요',
        message:
          '개인정보 처리방침 링크가 아직 설정되지 않았습니다.\nsrc/config.ts에서 PRIVACY_POLICY_URL을 설정해주세요.',
      });
      return;
    }

    const supported = await Linking.canOpenURL(PRIVACY_POLICY_URL);
    if (!supported) {
      alert({ title: '열 수 없음', message: '유효한 링크인지 확인해주세요.' });
      return;
    }

    Linking.openURL(PRIVACY_POLICY_URL);
  }, [alert]);

  const handleExportData = useCallback(async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      foodLogs,
      bodyLogs,
    };

    try {
      await Share.share({
        title: 'NutriMatch 데이터 내보내기',
        message: JSON.stringify(payload, null, 2),
      });
    } catch (e: any) {
      alert({ title: '내보내기 실패', message: e?.message || String(e) });
    }
  }, [alert, bodyLogs, foodLogs, profile]);

  const handleDeleteAccount = useCallback(() => {
    alert({
      title: '계정 삭제',
      message:
        '계정을 삭제하면 이 기기에 저장된 프로필/기록 데이터가 즉시 삭제됩니다.\n계속 진행할까요?',
      actions: [
        { text: '취소', variant: 'outline' },
        {
          text: '삭제',
          variant: 'danger',
          onPress: async () => {
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

  const handleNotReady = useCallback(
    (title: string) => {
      alert({ title, message: '현재 버전에서는 준비 중인 기능입니다.' });
    },
    [alert]
  );

  const permissionRows = useMemo(
    () => [
      {
        title: '카메라',
        desc: '음식/성분표 촬영에 사용',
        status: cameraStatus,
      },
      {
        title: '사진 접근',
        desc: '갤러리에서 사진 선택에 사용',
        status: photosStatus,
      },
      {
        title: '위치 서비스',
        desc: '위치 기반 기능(있는 경우)에 사용',
        status: locationStatus,
      },
    ],
    [cameraStatus, locationStatus, photosStatus]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보 및 보안</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>개인정보 처리방침 (필수)</Text>
            <Badge variant="outline" text="Privacy Policy" />
          </View>
          <Text style={styles.paragraph}>
            NutriMatch는 서비스 제공을 위해 최소한의 정보를 처리합니다. 자세한 내용은 개인정보 처리방침에서 확인할 수 있어요.
          </Text>

          <View style={styles.bullets}>
            <Text style={styles.bullet}>• 수집 항목: 이름, 이메일, 기기 식별 정보(기기 ID 등), 위치 정보(권한 허용 시)</Text>
            <Text style={styles.bullet}>• 수집 목적: 서비스 제공, 기능 개선(통계), 오류 분석</Text>
            <Text style={styles.bullet}>• 보유 기간: 목적 달성 시 또는 사용자가 삭제 요청 시</Text>
            <Text style={styles.bullet}>• 제3자 제공: Supabase(인증/DB), Google Gemini API(이미지 분석) 등</Text>
          </View>

          <Button
            title="개인정보 처리방침 열기"
            onPress={handleOpenPrivacyPolicy}
            icon={<AppIcon name="open-in-new" size={18} color="white" />}
            style={{ width: '100%' }}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>권한 관리</Text>
          <Text style={styles.paragraph}>앱에 부여한 권한을 확인하고, 설정에서 변경할 수 있어요.</Text>

          <View style={styles.list}>
            {permissionRows.map(row => {
              const badge = statusToLabel(row.status);
              return (
                <View key={row.title} style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowDesc}>{row.desc}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Badge variant={badge.variant} text={badge.text} />
                  </View>
                </View>
              );
            })}
          </View>

          <Button
            title={Platform.OS === 'android' ? '설정에서 권한 변경' : '설정으로 이동'}
            variant="outline"
            onPress={() => openAppSettings()}
            icon={<AppIcon name="settings" size={18} color={COLORS.primary} />}
            style={{ width: '100%' }}
          />

          {Platform.OS === 'android' && (
            <View style={{ marginTop: 12 }}>
              <Button
                title="권한 상태 새로고침"
                variant="ghost"
                onPress={refreshAndroidPermissions}
                style={{ width: '100%' }}
              />
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>계정 및 데이터 관리</Text>
          <Text style={styles.paragraph}>내 데이터는 내가 통제할 수 있어야 해요.</Text>

          <View style={styles.actionsGrid}>
            <Button
              title="데이터 내보내기"
              variant="outline"
              onPress={handleExportData}
              icon={<AppIcon name="file-download" size={18} color={COLORS.primary} />}
              style={styles.actionButton}
            />
            <Button
              title="계정 삭제(탈퇴)"
              variant="danger"
              onPress={handleDeleteAccount}
              icon={<AppIcon name="delete" size={18} color="white" />}
              style={styles.actionButton}
            />
          </View>

          <Text style={styles.noteText}>
            현재 앱은 기기에 저장된 프로필/기록(로컬 데이터)을 삭제합니다. 서버 계정 연동이 추가되면 서버 데이터 삭제도 함께 처리하도록 확장됩니다.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>보안 설정</Text>
          <Text style={styles.paragraph}>로그인/계정 보호 기능(생체인증, 2FA, 기기 관리)을 제공합니다.</Text>

          <TouchableOpacity style={styles.tapRow} onPress={() => handleNotReady('생체 인증')}>
            <View style={styles.tapLeft}>
              <AppIcon name="fingerprint" size={20} color={COLORS.text} />
              <Text style={styles.tapText}>생체 인증 (Face ID/지문)</Text>
            </View>
            <Badge variant="outline" text="준비 중" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.tapRow} onPress={() => handleNotReady('2단계 인증 (2FA)')}>
            <View style={styles.tapLeft}>
              <AppIcon name="verified-user" size={20} color={COLORS.text} />
              <Text style={styles.tapText}>2단계 인증 (2FA)</Text>
            </View>
            <Badge variant="outline" text="준비 중" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.tapRow} onPress={() => handleNotReady('로그인 기기 관리')}>
            <View style={styles.tapLeft}>
              <AppIcon name="devices" size={20} color={COLORS.text} />
              <Text style={styles.tapText}>로그인 기기 관리</Text>
            </View>
            <Badge variant="outline" text="준비 중" />
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  header: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  card: {
    padding: SPACING.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  paragraph: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  bullets: { marginTop: SPACING.md, gap: 6, marginBottom: SPACING.lg },
  bullet: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  list: { marginTop: SPACING.md, marginBottom: SPACING.lg, gap: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  rowDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  actionsGrid: { flexDirection: 'row', gap: 12, marginTop: SPACING.md },
  actionButton: { flex: 1 },
  noteText: { marginTop: SPACING.md, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  tapRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tapLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tapText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
});
