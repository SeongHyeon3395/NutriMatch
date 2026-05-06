import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { analyzeFoodImage } from '../../services/api';
import { useUserStore } from '../../store/userStore';
import { useAppAlert } from '../../components/ui/AppAlert';
import { useTheme } from '../../theme/ThemeProvider';
import { AppIcon } from '../../components/ui/AppIcon';
import { RADIUS, SPACING } from '../../constants/colors';
import { pickPhotoFromCamera, pickPhotoFromLibrary } from '../../services/imagePicker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const userProfile = useUserStore((state) => state.profile);
  const [loading, setLoading] = useState(false);
  const { alert } = useAppAlert();
  const { colors, isDark } = useTheme();

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (has) return true;
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        alert({ title: '카메라 권한이 필요합니다.' });
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const requestGalleryPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const apiLevel =
        typeof Platform.Version === 'number'
          ? Platform.Version
          : parseInt(String(Platform.Version), 10);
      const perm =
        apiLevel >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const has = await PermissionsAndroid.check(perm);
      if (has) return true;
      const granted = await PermissionsAndroid.request(perm);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        alert({ title: '갤러리 권한이 필요합니다.' });
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleCamera = async () => {
    const ok = await requestCameraPermission();
    if (!ok) return;
    try {
      const picked = await pickPhotoFromCamera({ maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
      if (picked?.uri) void analyzeImage(picked.uri);
    } catch (e: any) {
      alert({ title: '카메라 오류', message: e?.message || String(e) });
    }
  };

  const handleGallery = async () => {
    const ok = await requestGalleryPermission();
    if (!ok) return;
    try {
      const picked = await pickPhotoFromLibrary({ maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
      if (picked?.uri) void analyzeImage(picked.uri);
    } catch (e: any) {
      alert({ title: '갤러리 오류', message: e?.message || String(e) });
    }
  };

  const analyzeImage = async (imageUri: string) => {
    setLoading(true);
    try {
      const response = await analyzeFoodImage(
        imageUri,
        userProfile
          ? {
              bodyGoal: userProfile.bodyGoal,
              healthDiet: userProfile.healthDiet,
              lifestyleDiet: userProfile.lifestyleDiet,
              allergens: userProfile.allergens,
              currentWeight: userProfile.currentWeight,
              targetWeight: userProfile.targetWeight,
              height: userProfile.height,
              age: userProfile.age,
              gender: userProfile.gender,
              targetCalories: userProfile.targetCalories,
              targetProtein: userProfile.targetProtein,
            }
          : null
      );

      const rawData = response.data || response;

      const analysisData = {
        dishName:
          typeof rawData.dish === 'string'
            ? rawData.dish
            : rawData.dish?.name || '알 수 없는 음식',
        description: rawData.notes || rawData.description || '',
        categories: rawData.categories || [],
        confidence: rawData.confidence || 0,
        macros: rawData.estimated_macros || rawData.macros || {},
        referenceStandard: rawData.reference_standard || rawData.referenceStandard,
        source: rawData.source,
        userAnalysis: rawData.userAnalysis || null,
        geminiUsed: rawData.geminiUsed || false,
        geminiNotice: rawData.notes || rawData.geminiNotice,
      };

      if (
        analysisData.description &&
        (analysisData.description.includes('Quota exceeded') ||
          analysisData.description.includes('429') ||
          analysisData.description.includes('RESOURCE_EXHAUSTED'))
      ) {
        alert({
          title: '잠시만요',
          message: 'AI 분석 요청이 많아요. 약 1분 뒤 다시 시도해주세요.',
        });
        return;
      }

      navigation.navigate('FoodResult', { analysis: analysisData as any, imageUri });
    } catch (e: any) {
      alert({ title: '분석 실패', message: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  const firstName =
    userProfile?.name
      ? userProfile.name.length <= 3
        ? userProfile.name
        : userProfile.name.slice(0, 2)
      : '사용자';

  const initials = userProfile?.name ? userProfile.name.slice(0, 1) : 'U';

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundGray }]}>
        <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingTitle, { color: colors.text }]}>AI 분석 중</Text>
          <Text style={[styles.loadingDesc, { color: colors.textSecondary }]}>
            음식을 인식하고 영양 정보를 계산하고 있어요
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.backgroundGray }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={styles.greetingCol}>
            <Text style={[styles.greetingSmall, { color: colors.textSecondary }]}>안녕하세요 👋</Text>
            <Text style={[styles.greetingName, { color: colors.text }]}>{firstName}님</Text>
          </View>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
          </View>
        </View>

        {/* ── Scan Prompt Card ── */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.primary },
          ]}
        >
          <View style={styles.heroTextCol}>
            <Text style={styles.heroTitle}>음식 스캔</Text>
            <Text style={styles.heroDesc}>
              사진 한 장으로{'\n'}영양 정보를 바로 확인해요
            </Text>
          </View>
          <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <AppIcon name="document-scanner" size={36} color="#FFFFFF" />
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>촬영 방법 선택</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                shadowColor: isDark ? 'transparent' : '#000',
              },
            ]}
            onPress={handleCamera}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#3B82F6' + '18' }]}>
              <AppIcon name="camera-alt" size={28} color="#3B82F6" />
            </View>
            <Text style={[styles.actionCardTitle, { color: colors.text }]}>카메라</Text>
            <Text style={[styles.actionCardDesc, { color: colors.textSecondary }]}>
              지금 바로 촬영
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                shadowColor: isDark ? 'transparent' : '#000',
              },
            ]}
            onPress={handleGallery}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#10B981' + '18' }]}>
              <AppIcon name="photo-library" size={28} color="#10B981" />
            </View>
            <Text style={[styles.actionCardTitle, { color: colors.text }]}>갤러리</Text>
            <Text style={[styles.actionCardDesc, { color: colors.textSecondary }]}>
              저장된 사진 선택
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Tips Card ── */}
        <View
          style={[
            styles.tipsCard,
            { backgroundColor: colors.surface, shadowColor: isDark ? 'transparent' : '#000' },
          ]}
        >
          <View style={styles.tipsHeader}>
            <AppIcon name="lightbulb-outline" size={18} color={colors.primary} />
            <Text style={[styles.tipsTitle, { color: colors.text }]}>더 정확하게 분석하려면</Text>
          </View>
          {[
            '음식이 화면의 70% 이상 차지하도록 촬영하세요',
            '밝은 환경에서 찍으면 인식률이 높아져요',
            '성분표는 전체가 보이도록 찍어주세요',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  loadingCard: {
    borderRadius: RADIUS.lg,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    minWidth: 220,
  },
  loadingTitle: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  loadingDesc: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  greetingCol: { gap: 2 },
  greetingSmall: { fontSize: 14, fontWeight: '500' },
  greetingName: { fontSize: 26, fontWeight: '800' },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800' },

  // Hero
  heroCard: {
    borderRadius: RADIUS.lg,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  heroTextCol: { gap: 6, flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  heroDesc: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.82)', lineHeight: 20 },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Action cards
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  actionCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: { fontSize: 16, fontWeight: '800' },
  actionCardDesc: { fontSize: 12, fontWeight: '500' },

  // Tips
  tipsCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tipsTitle: { fontSize: 14, fontWeight: '800' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 7 },
  tipText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },
});
