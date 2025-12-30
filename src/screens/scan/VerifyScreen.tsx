import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { AppIcon } from '../../components/ui/AppIcon';
import { analyzeFoodImage } from '../../services/api';
import { FoodAnalysis } from '../../types/user';
import { useAppAlert } from '../../components/ui/AppAlert';

export default function VerifyScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { imageUri } = route.params as { imageUri: string };
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { alert } = useAppAlert();

  const handleRetake = () => {
    navigation.goBack();
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await analyzeFoodImage(imageUri);
      
      if (!response.ok || !response.data) {
        throw new Error(response.message || '분석에 실패했습니다.');
      }

      const data = response.data;
      
      // Map API response to FoodAnalysis type
      const analysis: FoodAnalysis = {
        dishName: data.dish || '알 수 없는 음식',
        description: data.notes || '분석된 정보가 없습니다.',
        categories: [], 
        confidence: data.confidence || 0,
        macros: {
          calories: data.estimated_macros?.calories,
          protein_g: data.estimated_macros?.protein_g,
          carbs_g: data.estimated_macros?.carbs_g,
          fat_g: data.estimated_macros?.fat_g,
        },
        userAnalysis: data.userAnalysis,
        source: data.source,
        referenceStandard: data.reference_standard,
        geminiUsed: data.geminiUsed || false,
      };

      navigation.navigate('Result', {
        imageUri,
        analysis,
      });
    } catch (error: any) {
      console.error(error);
      alert({
        title: '분석 실패',
        message: error.message || '음식 분석 중 오류가 발생했습니다.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <AppIcon name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>사진 확인</Text>
        <Text style={styles.subtitle}>글자/음식이 선명하게 보이면 더 정확해요</Text>
        
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        </View>

        <View style={styles.buttonGroup}>
          <Button 
            title="다시 찍기" 
            variant="outline" 
            onPress={handleRetake} 
            icon={<AppIcon name="refresh" size={20} color={COLORS.primary} />}
            style={styles.button}
            disabled={isAnalyzing}
          />
          <Button 
            title={isAnalyzing ? "분석 중..." : "분석 시작"} 
            onPress={handleAnalyze} 
            icon={isAnalyzing ? <ActivityIndicator color="white" /> : <AppIcon name="check" size={20} color="white" />}
            style={styles.button}
            disabled={isAnalyzing}
          />
        </View>
      </View>
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
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  button: {
    flex: 1,
  },
});
