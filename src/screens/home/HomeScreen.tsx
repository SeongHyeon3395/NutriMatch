import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ImagePicker from 'react-native-image-crop-picker';
import { RootStackParamList } from '../../navigation/types';
import { analyzeFoodImage } from '../../services/api';
import { useUserStore } from '../../store/userStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const userProfile = useUserStore(state => state.profile);
  const [loading, setLoading] = useState(false);

  const handleCamera = async () => {
    if (Platform.OS === 'android') {
      try {
        const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (!has) {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('카메라 권한이 필요합니다.');
            return;
          }
        }
      } catch (e) {
        console.error('Camera permission error', e);
      }
    }

    try {
      const image = await ImagePicker.openCamera({
        width: 800,
        height: 800,
        cropping: true,
        freeStyleCropEnabled: true,
        mediaType: 'photo',
        includeBase64: false,
      });

      if (image.path) {
        analyzeImage(image.path);
      }
    } catch (e: any) {
      if (e?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('카메라 오류', e?.message || String(e));
      }
    }
  };

  const handleGallery = async () => {
    if (Platform.OS === 'android') {
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
        if (!has) {
          const granted = await PermissionsAndroid.request(perm);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('갤러리 권한이 필요합니다.');
            return;
          }
        }
      } catch (e) {
        console.error('Gallery permission error', e);
      }
    }

    try {
      const image = await ImagePicker.openPicker({
        width: 800,
        height: 800,
        cropping: true,
        freeStyleCropEnabled: true,
        mediaType: 'photo',
        includeBase64: false,
      });

      if (image.path) {
        analyzeImage(image.path);
      }
    } catch (e: any) {
      if (e?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('갤러리 오류', e?.message || String(e));
      }
    }
  };

  const analyzeImage = async (imageUri: string) => {
    setLoading(true);
    try {
      const response = await analyzeFoodImage(imageUri);
      
      if (__DEV__) {
        console.log('[HomeScreen] 전체 API 응답:');
        console.log(JSON.stringify(response, null, 2));
      }
      
      let analysisData;
      const rawData = response.data || response;
      
      analysisData = {
        dishName: typeof rawData.dish === 'string' ? rawData.dish : (rawData.dish?.name || '알 수 없는 음식'),
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

      if (analysisData.description && (
          analysisData.description.includes('Quota exceeded') || 
          analysisData.description.includes('429') ||
          analysisData.description.includes('RESOURCE_EXHAUSTED')
      )) {
        Alert.alert(
          '잠시만요',
          '지금은 AI 분석 요청이 많아 잠깐 쉬고 있어요.\n약 1분 뒤 다시 시도해주세요.',
          [{ text: '확인' }]
        );
        return;
      }
      
      navigation.navigate('FoodResult', {
        analysis: analysisData as any,
        imageUri,
      });
    } catch (e: any) {
      if (__DEV__) console.error('[HomeScreen] 분석 실패:', e);
      Alert.alert('분석 실패', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>AI가 음식을 분석하고 있어요...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>안녕하세요,</Text>
            <Text style={styles.userName}>{userProfile?.name || '사용자'}님 👋</Text>
          </View>
          <View style={styles.profileIcon}>
            <Text style={styles.profileIconText}>
              {userProfile?.name ? userProfile.name[0] : 'U'}
            </Text>
          </View>
        </View>

        {/* Main Actions */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#E0F2FE' }]} 
            onPress={handleCamera}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>📷</Text> 
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.actionTitle}>Smart Scan</Text>
              <Text style={styles.actionDesc}>음식/성분표 촬영하기</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#DCFCE7' }]} 
            onPress={handleCamera}
          >
             <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🍽️</Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.actionTitle}>Food Image</Text>
              <Text style={styles.actionDesc}>사진으로 분석하기</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 기록</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>아직 기록된 식단이 없습니다.</Text>
            <TouchableOpacity style={styles.recordButton} onPress={handleGallery}>
              <Text style={styles.recordButtonText}>갤러리에서 불러오기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { padding: 24 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  actionCard: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    height: 180,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: { fontSize: 28 },
  textContainer: {},
  actionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  recordButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  recordButtonText: {
    color: '#4B5563',
    fontWeight: '600',
  },
});
