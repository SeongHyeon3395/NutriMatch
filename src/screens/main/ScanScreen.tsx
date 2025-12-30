import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ImagePicker from 'react-native-image-crop-picker';
import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AppIcon } from '../../components/ui/AppIcon';
import { Badge } from '../../components/ui/Badge';
import { useAppAlert } from '../../components/ui/AppAlert';

export default function ScanScreen() {
  const navigation = useNavigation();
  const { alert } = useAppAlert();

  const handleTips = () => {
    alert({
      title: '촬영 팁',
      message: [
        '• 밝은 조명에서 촬영하세요',
        '• 음식은 접시 전체가 나오게 촬영하세요',
        '• 성분표/원재료명은 글자가 선명하게 나오게 가까이 촬영하세요',
        '• 흔들림 없이 선명하게 촬영하세요',
      ].join('\n'),
      actions: [{ text: '확인', variant: 'primary' }],
    });
  };

  const handleScan = async () => {
    try {
      const image = await ImagePicker.openCamera({
        mediaType: 'photo',
        cropping: true,
        freeStyleCropEnabled: true,
      });

      if (image.path) {
        navigation.navigate('Verify', { 
          imageUri: image.path 
        });
      }
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('Camera Error:', error);
        alert({ title: '오류', message: '카메라를 실행하는 중 문제가 발생했습니다.' });
      }
    }
  };

  const handleGallery = async () => {
    try {
      const image = await ImagePicker.openPicker({
        mediaType: 'photo',
        cropping: true,
        freeStyleCropEnabled: true,
      });

      if (image.path) {
        navigation.navigate('Verify', { 
          imageUri: image.path 
        });
      }
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('Gallery Error:', error);
        alert({ title: '오류', message: '갤러리를 여는 중 문제가 발생했습니다.' });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>음식 분석</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topContent}>
          <Card style={styles.scannerCard}>
            <View style={styles.scannerHeader}>
              <View style={styles.iconContainer}>
                <AppIcon name="manage-search" color="#FFFFFF" size={24} />
              </View>
              <View style={styles.scannerTextContainer}>
                <Text style={styles.scannerTitle}>스마트 스캐너</Text>
                <Text style={styles.scannerDesc}>
                  음식 사진이나 포장지의 영양성분표/원재료명을 찍어주시면,
                  AI가 빠르게 읽고 정리해드려요.
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.infoCard}>
            <Text style={styles.cardTitle}>무엇을 찍으면 되나요?</Text>
            <View style={styles.tagRow}>
              <Badge variant="outline" text="밝은 조명" />
              <Badge variant="outline" text="선명한 초점" />
              <Badge variant="outline" text="전체가 보이게" />
            </View>
            <View style={styles.quickList}>
              <Text style={styles.quickItem}>• 음식 사진 (접시 전체가 나오게)</Text>
              <Text style={styles.quickItem}>• 영양성분표 / 원재료명 (글자 선명하게)</Text>
              <Text style={styles.quickItem}>• 결과는 사진 기반 추정이므로 참고용이에요</Text>
            </View>
          </Card>

        </View>

        <View style={styles.bottomActions}>
          <Button
            title="사진 촬영하기"
            onPress={handleScan}
            style={styles.scanButton}
            icon={<AppIcon name="photo-camera" color="#FFFFFF" size={20} />}
          />
          <View style={{ height: 12 }} />
          <Button
            title="사진 선택하기"
            onPress={handleGallery}
            variant="outline"
            style={styles.scanButton}
            icon={<AppIcon name="photo-library" color={COLORS.primary} size={20} />}
          />
          <View style={{ height: 12 }} />
          <Button
            title="촬영 팁"
            onPress={handleTips}
            variant="outline"
            style={styles.scanButton}
            icon={<AppIcon name="lightbulb" color={COLORS.primary} size={20} />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  header: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  topContent: { gap: SPACING.md },
  bottomActions: { marginTop: 'auto' },
  
  // Scanner Card
  scannerCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.blue50,
    borderColor: COLORS.blue200,
  },
  scannerHeader: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTextContainer: { flex: 1 },
  scannerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  scannerDesc: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  scanButton: { width: '100%' },

  // Info Card
  infoCard: { padding: SPACING.lg },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.sm },
  quickList: { gap: 4 },
  quickItem: { fontSize: 14, color: COLORS.textGray, lineHeight: 20 },
});
