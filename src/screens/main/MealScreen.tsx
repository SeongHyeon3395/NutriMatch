import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ImagePicker from 'react-native-image-crop-picker';
import { COLORS } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';
import { useAppAlert } from '../../components/ui/AppAlert';
import { useUserStore } from '../../store/userStore';
import { FoodGrade } from '../../types/user';
import { getSessionUserId, listFoodLogsRemote } from '../../services/userData';

export default function MealScreen() {
  const navigation = useNavigation<any>();
  const { alert } = useAppAlert();

  const profile = useUserStore(state => state.profile);
  const isMaster =
    (profile as any)?.plan_id === 'master' ||
    profile?.id === 'local-master' ||
    profile?.username === 'master';

  const foodLogs = useUserStore(state => state.foodLogs);
  const loadFoodLogs = useUserStore(state => state.loadFoodLogs);
  const setFoodLogs = useUserStore(state => state.setFoodLogs);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const userId = await getSessionUserId().catch(() => null);
      if (!mounted) return;

      if (userId) {
        try {
          const remote = await listFoodLogsRemote(100);
          if (!mounted) return;
          if (typeof setFoodLogs === 'function') setFoodLogs(remote);
          return;
        } catch {
          // 서버 실패 시 로컬 폴백
        }
      }

      await loadFoodLogs();
    })();

    return () => {
      mounted = false;
    };
  }, [loadFoodLogs, setFoodLogs]);

  const gradeToLetter = (grade?: FoodGrade) => {
    switch (grade) {
      case 'very_good':
        return 'A';
      case 'good':
        return 'B';
      case 'neutral':
        return 'C';
      case 'bad':
        return 'D';
      case 'very_bad':
        return 'F';
      default:
        return 'C';
    }
  };

  const letterToVariant = (letter: string) => {
    switch (letter) {
      case 'A':
      case 'B':
        return 'success' as const;
      case 'C':
        return 'warning' as const;
      case 'D':
      case 'F':
        return 'danger' as const;
      default:
        return 'default' as const;
    }
  };

  const recentMeals = useMemo(() => {
    if (isMaster) {
      return [
        { id: 'recent-1', title: '닭가슴살 샐러드', date: '오늘, 오후 12:30', calories: 450, grade: 'A' as const },
        { id: 'recent-2', title: '아보카도 토스트', date: '오늘, 오전 08:10', calories: 320, grade: 'A' as const },
      ];
    }

    return (foodLogs || [])
      .slice()
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 2)
      .map(log => {
        const calories = log.analysis?.macros?.calories;
        const gradeLetter = gradeToLetter(log.analysis?.userAnalysis?.grade);
        const displayDate = (() => {
          try {
            return new Date(log.timestamp).toLocaleString('ko-KR');
          } catch {
            return log.timestamp;
          }
        })();

        return {
          id: log.id,
          title: log.analysis?.dishName ?? '기록',
          date: displayDate,
          calories: typeof calories === 'number' ? calories : 0,
          grade: gradeLetter as 'A' | 'B' | 'C' | 'D' | 'F',
          __kind: 'real' as const,
          imageUri: log.imageUri,
          analysis: log.analysis,
        };
      });
  }, [foodLogs, isMaster]);

  const handlePressItem = (item: any) => {
    if (item?.__kind === 'real' && item?.imageUri && item?.analysis) {
      navigation.navigate('Result', { imageUri: item.imageUri, analysis: item.analysis });
      return;
    }

    navigation.navigate('MealDetail', {
      title: item.title,
      date: item.date,
      calories: item.calories,
      grade: item.grade,
    });
  };

  const handleCamera = async () => {
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>식단 분석</Text>
          <Text style={styles.subtitle}>식사의 영양 성분을 즉시 분석해보세요</Text>
        </View>

        {/* Main Action Card */}
        <Card style={styles.actionCard}>
          <View style={styles.iconCircle}>
            <AppIcon name="restaurant" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>무엇을 드시고 계신가요?</Text>
          <Text style={styles.cardDescription}>
            음식 사진을 찍으면 상세한 영양 정보와 건강 점수를 알려드립니다.
          </Text>
          
          <View style={styles.buttonGroup}>
            <Button 
              title="사진 촬영" 
              onPress={handleCamera} 
              icon={<AppIcon name="photo-camera" size={20} color="white" />}
              style={styles.mainButton}
            />
            <Button 
              title="앨범에서 선택" 
              variant="outline"
              onPress={handleGallery} 
              icon={<AppIcon name="photo-library" size={20} color={COLORS.primary} />}
              style={styles.secondaryButton}
            />
          </View>
        </Card>

        {/* Recent Analysis Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 식사</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>전체 보기</Text>
            </TouchableOpacity>
          </View>

          {recentMeals.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
              <Text style={styles.emptyDesc}>음식을 스캔해 기록을 남겨보세요.</Text>
            </Card>
          ) : (
            recentMeals.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyItem}
                onPress={() => handlePressItem(item)}
              >
                <View style={styles.historyIcon}>
                  <AppIcon name="restaurant" size={20} color={COLORS.textSecondary} />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <View style={styles.historyMeta}>
                    <AppIcon name="access-time" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.historyTime}>{item.date}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.calories}>{item.calories} kcal</Text>
                  </View>
                </View>
                <Badge variant={letterToVariant(item.grade)} text={item.grade} />
                <View style={{ marginLeft: 8, alignItems: 'flex-end' }}>
                  <Text style={styles.detailHint}>자세히 보기</Text>
                  <AppIcon name="chevron-right" size={22} color={COLORS.textSecondary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  actionCard: {
    alignItems: 'center',
    padding: 16,
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '15', // 15% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  mainButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  historyTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  dot: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginHorizontal: 6,
  },
  calories: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  detailHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
});
