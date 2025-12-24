import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ImagePicker from 'react-native-image-crop-picker';
import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AppIcon } from '../../components/ui/AppIcon';

export default function ScanScreen() {
  const navigation = useNavigation();

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
        Alert.alert('오류', '카메라를 실행하는 중 문제가 발생했습니다.');
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
        Alert.alert('오류', '갤러리를 여는 중 문제가 발생했습니다.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>성분표 스캔</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Smart Scanner Card */}
        <Card style={styles.scannerCard}>
          <View style={styles.scannerHeader}>
            <View style={styles.iconContainer}>
              <AppIcon name="manage-search" color="#FFFFFF" size={24} />
            </View>
            <View style={styles.scannerTextContainer}>
              <Text style={styles.scannerTitle}>🔍 스마트 스캐너</Text>
              <Text style={styles.scannerDesc}>
                바코드가 있으면 자동으로 검증된 성분 정보를 가져오고,
                없으면 OCR로 성분표를 읽습니다.
              </Text>
            </View>
          </View>
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
        </Card>

        {/* How it works */}
        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>📋 작동 방식</Text>
          <View style={styles.stepsContainer}>
            {[
              { 
                step: '1', 
                title: '바코드 우선 감지',
                description: '제품 바코드가 있으면 Open Food Facts 데이터베이스에서 검증된 성분 정보를 가져옵니다.'
              },
              {
                step: '2',
                title: 'OCR 폴백',
                description: '바코드가 없거나 등록되지 않은 제품이면 AI OCR로 성분표를 읽습니다.'
              },
              {
                step: '3',
                title: '사용자 검증 (HITL)',
                description: 'OCR 결과를 사용자가 직접 확인하고 수정할 수 있습니다.'
              },
              {
                step: '4',
                title: 'AI 분석',
                description: '등록된 알레르기 성분과 비교하여 안전/위험 판정을 내립니다.'
              }
            ].map((item, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{item.step}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{item.title}</Text>
                  <Text style={styles.stepDesc}>{item.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Tips */}
        <Card style={styles.tipCard}>
          <View style={styles.tipContainer}>
            <View style={{ marginRight: 12 }}>
              <AppIcon name="lightbulb" color="#CA8A04" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>촬영 팁</Text>
              <View style={styles.tipList}>
                <Text style={styles.tipItem}>• 밝은 조명에서 촬영하세요</Text>
                <Text style={styles.tipItem}>• 성분표가 수평이 되도록 정렬하세요</Text>
                <Text style={styles.tipItem}>• 흔들림 없이 선명하게 촬영하세요</Text>
                <Text style={styles.tipItem}>• 바코드가 보이면 함께 촬영하세요</Text>
              </View>
            </View>
          </View>
        </Card>
      </ScrollView>
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
  content: { padding: SPACING.md, gap: SPACING.lg },
  
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
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },
  stepsContainer: { gap: SPACING.md },
  stepItem: { flexDirection: 'row', gap: SPACING.sm },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.blue100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: { color: COLORS.primary, fontWeight: 'bold' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  stepDesc: { fontSize: 14, color: COLORS.textGray, lineHeight: 20 },

  // Tip Card
  tipCard: { padding: SPACING.md, backgroundColor: COLORS.yellow50, borderColor: COLORS.yellow200 },
  tipContainer: { flexDirection: 'row' },
  tipTitle: { fontSize: 16, fontWeight: 'bold', color: '#854D0E', marginBottom: 4 },
  tipList: { gap: 2 },
  tipItem: { fontSize: 14, color: '#A16207' },
});
