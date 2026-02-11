import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';
import { useAppAlert } from '../../components/ui/AppAlert';
import { useUserStore } from '../../store/userStore';
import { PRIVACY_POLICY_URL } from '../../config';
import { deleteMyAccountRemote, getSessionUserId } from '../../services/userData';
import { supabase } from '../../services/supabaseClient';

type PermissionStatus = 'granted' | 'denied' | 'unavailable' | 'unknown';

function statusToLabel(status: PermissionStatus) {
  switch (status) {
    case 'granted':
      return { text: '허용됨', variant: 'success' as const };
    case 'denied':
      return { text: '거부됨', variant: 'danger' as const };
    case 'unavailable':
      return { text: '설정에서 확인', variant: 'outline' as const };
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

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const isDeletingAccountRef = useRef(false);
  const isMountedRef = useRef(true);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const requiredDeletePhrase = '확인했습니다';

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetIsDeletingAccount = useCallback((next: boolean) => {
    if (!isMountedRef.current) return;
    setIsDeletingAccount(next);
  }, []);

  useEffect(() => {
    loadFoodLogs();
    loadBodyLogs();
  }, [loadFoodLogs, loadBodyLogs]);

  const refreshAndroidPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') {
      // iOS 권한 상태는 별도 라이브러리 없이 정밀 조회가 어려워 설정에서 확인하도록 안내
      setCameraStatus('unavailable');
      setPhotosStatus('unavailable');
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
    } catch {
      setCameraStatus('unknown');
      setPhotosStatus('unknown');
    }
  }, []);

  useEffect(() => {
    refreshAndroidPermissions();
  }, [refreshAndroidPermissions]);

  // 화면이 다시 포커스될 때마다 권한 상태를 재확인
  useFocusEffect(
    useCallback(() => {
      refreshAndroidPermissions();
      return () => {
        // no-op
      };
    }, [refreshAndroidPermissions])
  );

  // 설정 앱에서 돌아왔을 때(포그라운드 복귀) 권한 상태를 재확인
  useEffect(() => {
    const handler = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refreshAndroidPermissions();
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
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

  const handleDeleteAccount = useCallback(() => {
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    if (isDeletingAccountRef.current) return;
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  }, []);

  const confirmAndDeleteAccount = useCallback(async () => {
    if (deleteConfirmText.trim() !== requiredDeletePhrase) return;
    if (isDeletingAccountRef.current) return;
    isDeletingAccountRef.current = true;
    safeSetIsDeletingAccount(true);

    try {
      const userId = await getSessionUserId().catch(() => null);
      if (userId) {
        await deleteMyAccountRemote();
      }

      try {
        await supabase?.auth.signOut();
      } catch {
        // ignore
      }

      await clearAllData();
      setShowDeleteConfirm(false);
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    } catch (e) {
      const message = e instanceof Error ? e.message : typeof e === 'string' ? e : String(e);
      alert({
        title: '탈퇴 실패',
        message,
      });
    } finally {
      isDeletingAccountRef.current = false;
      safeSetIsDeletingAccount(false);
    }
  }, [alert, clearAllData, deleteConfirmText, navigation, requiredDeletePhrase, safeSetIsDeletingAccount]);

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
    ],
    [cameraStatus, photosStatus]
  );

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        transparent
        visible={showDeleteConfirm}
        animationType="fade"
        onRequestClose={closeDeleteConfirm}
      >
        <View style={styles.confirmModalRoot}>
          <Pressable style={styles.confirmBackdropPressable} onPress={closeDeleteConfirm}>
            <View style={styles.confirmBackdrop} />
          </Pressable>

          <View style={styles.confirmCenter} pointerEvents="box-none">
            <Card style={styles.confirmCard}>
              <View style={styles.confirmTitleRow}>
                <Text style={styles.confirmTitle}>계정 삭제</Text>
                <TouchableOpacity
                  onPress={closeDeleteConfirm}
                  style={styles.confirmCloseButton}
                  accessibilityRole="button"
                  disabled={isDeletingAccount}
                >
                  <AppIcon name="close" size={20} color={COLORS.textGray} />
                </TouchableOpacity>
              </View>

              <Text style={styles.confirmMessage}>
                계정을 삭제하면 서버에 저장된 데이터가 모두 삭제됩니다.
              </Text>
              <View style={styles.confirmBullets}>
                <Text style={styles.confirmBullet}>• 계정 정보(이메일/닉네임/프로필 등)</Text>
                <Text style={styles.confirmBullet}>• 음식 분석 기록(히스토리/식단 기록) 및 관련 이미지</Text>
                <Text style={styles.confirmBullet}>• 결제 내역/플랜 정보(구독/구매 기록 등)</Text>
              </View>
              <Text style={styles.confirmHint}>
                계속하려면 아래 입력칸에 “{requiredDeletePhrase}”를 입력해주세요.
              </Text>

              <TextInput
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder={requiredDeletePhrase}
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isDeletingAccount}
                style={styles.confirmInput}
              />

              <View style={styles.confirmActions}>
                <Button
                  title="취소"
                  variant="outline"
                  onPress={closeDeleteConfirm}
                  disabled={isDeletingAccount}
                  style={{ flex: 1 }}
                />
                <Button
                  title="삭제"
                  variant="danger"
                  onPress={confirmAndDeleteAccount}
                  disabled={isDeletingAccount || deleteConfirmText.trim() !== requiredDeletePhrase}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isDeletingAccount}
        animationType="fade"
        onRequestClose={() => {
          // 탈퇴 진행 중에는 닫지 않음
        }}
      >
        <View style={styles.loadingModalRoot}>
          <Pressable style={styles.loadingBackdropPressable} onPress={() => {}}>
            <View style={styles.loadingBackdrop} />
          </Pressable>
          <View style={styles.loadingCenter} pointerEvents="box-none">
            <Card style={styles.loadingCard}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingTitle}>탈퇴 처리 중…</Text>
              <Text style={styles.loadingMessage}>잠시만 기다려주세요.</Text>
            </Card>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          disabled={isDeletingAccount}
        >
          <AppIcon name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>개인정보 처리방침 (필수)</Text>
            <Badge variant="outline" text="Privacy Policy" />
          </View>
          <Text style={styles.paragraph}>
            뉴핏은 서비스 제공을 위해 필요한 범위에서만 개인정보를 처리합니다. 자세한 내용은 개인정보 처리방침에서 확인할 수 있어요.
          </Text>

          <View style={styles.bullets}>
            <Text style={styles.bullet}>• 수집 항목: 이메일/닉네임/프로필, 신체 정보(선택), 사진(선택), 서비스 이용 기록/기기 정보</Text>
            <Text style={styles.bullet}>• 수집 목적: 서비스 제공(분석/기록/맞춤 기능), 기능 개선(통계), 오류 분석</Text>
            <Text style={styles.bullet}>• 보유 기간: 목적 달성 시 또는 사용자가 삭제 요청 시</Text>
            <Text style={styles.bullet}>• 처리 위탁/제공: Supabase(인증/DB/스토리지), AI 분석 제공자(이미지 분석) 등</Text>
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
            onPress={async () => {
              await openAppSettings();
              // settings -> app 복귀 시 AppState/useFocusEffect가 재갱신하지만,
              // 일부 기기에서 즉시 반영되는 케이스도 있어 한 번 더 호출
              refreshAndroidPermissions();
            }}
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
              title="계정 삭제(탈퇴)"
              variant="danger"
              onPress={handleDeleteAccount}
              icon={<AppIcon name="delete" size={18} color="white" />}
              style={styles.actionButton}
            />
          </View>

          <Text style={styles.noteText}>
            로그인 상태에서 탈퇴하면 서버(Supabase)에 저장된 계정/기록 등이 함께 삭제됩니다. 로그인하지 않은 경우에는 기기에 저장된 로컬 데이터만 삭제됩니다.
          </Text>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  confirmModalRoot: {
    flex: 1,
  },
  confirmBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: COLORS.text,
    opacity: 0.4,
  },
  confirmCenter: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  confirmCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  confirmTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  confirmCloseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  confirmMessage: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  confirmBullets: {
    marginTop: SPACING.md,
    gap: 6,
  },
  confirmBullet: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  confirmHint: {
    marginTop: SPACING.md,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  confirmInput: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.lg,
  },
  loadingModalRoot: {
    flex: 1,
  },
  loadingBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingBackdrop: {
    flex: 1,
    backgroundColor: COLORS.text,
    opacity: 0.4,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  loadingCard: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    gap: 12,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  loadingMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
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
});
