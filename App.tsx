import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  useColorScheme,
  PermissionsAndroid,
  View,
  Image,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ImagePicker from 'react-native-image-crop-picker';
import { analyzeFoodImage, AnalyzeResponse } from './src/services/api';

type Mode = 'food';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Home />
    </SafeAreaProvider>
  );
}

function Home() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState<number | undefined>(undefined);
  const [imageHeight, setImageHeight] = useState<number | undefined>(undefined);

  const reset = useCallback(() => {
    setMode(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setImageUri(null);
    setImageWidth(undefined);
    setImageHeight(undefined);
  }, []);

  const handleCapture = useCallback(
    async () => {
      setMode('food');
      setError(null);
      setResult(null);
      setImageUri(null);

      // 1. Android 카메라 권한 선요청
      if (Platform.OS === 'android') {
        try {
          const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
          if (!has) {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              setError('카메라 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
              setMode(null);
              return;
            }
          }
        } catch (e) {
          if (__DEV__) console.warn('Camera permission error', e);
        }
      }

      // 2. ImagePicker.openCamera 호출 (크롭 옵션 추가)
      try {
        const image = await ImagePicker.openCamera({
          width: 800,
          height: 800,
          cropping: true,
          freeStyleCropEnabled: true, // Android: 자유 비율 크롭
          mediaType: 'photo',
          includeBase64: false,
        });

        if (!image.path) {
          setError('이미지를 가져오지 못했습니다.');
          return;
        }

        setLoading(true);
        setImageUri(image.path);
        setImageWidth(image.width);
        setImageHeight(image.height);
        const data = await analyzeFoodImage(image.path);
        setResult(data);

      } catch (e: any) {
        if (e?.code !== 'E_PICKER_CANCELLED') {
          setError('카메라 실행 예외: ' + (e?.message || String(e)));
        } else {
          reset();
        }
      } finally {
        setLoading(false);
      }
    },
    [reset]
  );

  const handlePickFromGallery = useCallback(
    async () => {
      setMode('food');
      setError(null);
      setResult(null);
      setImageUri(null);

      // Android 권한 검사 (SDK 33 이상 READ_MEDIA_IMAGES, 이하 READ_EXTERNAL_STORAGE)
      if (Platform.OS === 'android') {
        try {
          const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
          const useReadMediaImages = apiLevel >= 33;
          const perm = useReadMediaImages
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
          const has = await PermissionsAndroid.check(perm);
          if (!has) {
            const granted = await PermissionsAndroid.request(perm);
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              setError('갤러리 접근 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
              return;
            }
          }
        } catch (e) {
          if (__DEV__) console.warn('Gallery permission check failed', e);
        }
      }

      try {
        const image = await ImagePicker.openPicker({
          width: 800,
          height: 800,
          cropping: true,
          freeStyleCropEnabled: true, // Android: 자유 비율 크롭
          mediaType: 'photo',
          includeBase64: false,
        });

        if (!image.path) {
          setError('이미지를 가져오지 못했습니다.');
          return;
        }

        setLoading(true);
        setImageUri(image.path);
        setImageWidth(image.width);
        setImageHeight(image.height);
        const data = await analyzeFoodImage(image.path);
        setResult(data);

      } catch (e: any) {
        if (e?.code !== 'E_PICKER_CANCELLED') {
          setError('갤러리 실행 예외: ' + (e?.message || String(e)));
        } else {
          reset();
        }
      } finally {
        setLoading(false);
      }
    },
    [reset]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.sub}>AI가 이미지를 분석 중입니다…</Text>
        <TouchableOpacity onPress={reset} style={[styles.button, styles.ghost]}>
          <Text style={[styles.buttonText, styles.ghostText]}>취소</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (result || error) {
    const geminiUsed = result?.data?.geminiUsed;
    const geminiNotice = result?.data?.geminiNotice;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>음식 사진 분석 결과</Text>
        {!error && geminiUsed === false && (
          <Text style={styles.warning}>Gemini API Key 설정되지 않아 dish 추론이 비활성화되었습니다.</Text>
        )}
        {!error && geminiNotice && (
          <Text style={styles.info}>{geminiNotice}</Text>
        )}
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <ScrollView style={styles.resultBox} contentContainerStyle={{ padding: 16 }}>
            <FoodResultView uri={imageUri} width={imageWidth} height={imageHeight} data={result?.data} />
          </ScrollView>
        )}
        <View style={styles.row}>
          <TouchableOpacity onPress={reset} style={[styles.button, styles.secondary]}>
            <Text style={styles.buttonText}>다시 촬영</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>NutriMatch</Text>
      <Text style={styles.sub}>간단 촬영으로 AI 영양 분석</Text>
      <View style={styles.spacer} />
      <TouchableOpacity onPress={handleCapture} style={styles.button}>
        <Text style={styles.buttonText}>음식 사진 촬영</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handlePickFromGallery} style={[styles.button, styles.secondary]}>
        <Text style={styles.buttonText}>음식 사진 선택</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  centered: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  brand: { fontSize: 28, fontWeight: '700', color: '#000000' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: '#000000' },
  sub: { fontSize: 14, color: '#666', marginTop: 8 },
  spacer: { height: 24 },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: { width: '100%', maxWidth: 320, backgroundColor: '#2E7D32', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  secondary: { backgroundColor: '#1565C0' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#bbb' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  ghostText: { color: '#444' },
  resultBox: { alignSelf: 'stretch', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: 8 },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
  error: { color: '#C62828', marginBottom: 8 },
  warning: { color: '#EF6C00', marginBottom: 8, fontSize: 12 },
  info: { color: '#1976D2', marginBottom: 4, fontSize: 12 },
  footer: { position: 'absolute', bottom: 16, left: 16, right: 16, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#888' },
  previewImage: { width: '100%', height: 220, borderRadius: 8, backgroundColor: '#eee' },

  // New Styles for FoodResultView
  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginBottom: 20 },
  cardImageContainer: { marginBottom: 20, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eee' },
  cardImage: { width: '100%' },
  cardHeader: { alignItems: 'center', marginBottom: 20 },
  cardBrand: { fontSize: 14, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: '600' },
  cardTitle: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', letterSpacing: -0.5 },
  divider: { height: 1, backgroundColor: '#eee', width: '60%', marginTop: 16 },
  
  nutritionSection: { marginBottom: 24 },
  nutritionHeader: { fontSize: 24, fontWeight: '900', color: '#000', marginBottom: 2 },
  nutritionSubHeader: { fontSize: 12, color: '#666', marginBottom: 8 },
  thickDivider: { height: 8, backgroundColor: '#000', marginVertical: 4 },
  thinDivider: { height: 1, backgroundColor: '#ddd', marginVertical: 4 },
  nutriRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  nutriRowSub: { paddingLeft: 16 },
  nutriLabel: { fontSize: 15, color: '#333' },
  nutriLabelBold: { fontWeight: '700', fontSize: 16 },
  nutriValue: { fontSize: 15, color: '#333' },
  nutriValueBold: { fontWeight: '700', fontSize: 16 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#F1F8E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#DCEDC8' },
  chipText: { fontSize: 14, color: '#33691E', fontWeight: '600' },
  chipAlert: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' },
  chipAlertText: { color: '#C62828' },
  emptyText: { color: '#999', fontSize: 14, fontStyle: 'italic' },
  safeText: { color: '#2E7D32', fontSize: 14, fontStyle: 'italic' },

  noteContainer: { backgroundColor: '#F5F5F5', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#2E7D32' },
  noteTitle: { fontSize: 14, fontWeight: '700', color: '#2E7D32', marginBottom: 6 },
  noteText: { fontSize: 14, color: '#444', lineHeight: 20 },
});

export default App;



function FoodResultView({ uri, width, height, data }: { uri: string | null; width?: number; height?: number; data?: any }) {
  if (!data) return <Text style={styles.mono}>결과가 비어있습니다.</Text>;
  const macros = data.estimated_macros || {};
  const aspectRatio = (width && height) ? width / height : undefined;
  
  return (
    <View style={{ paddingBottom: 40 }}>
      {/* Image Section */}
      {uri && (
        <View style={styles.cardImageContainer}>
          <Image 
            source={{ uri }} 
            style={[
              styles.cardImage, 
              aspectRatio ? { aspectRatio } : { height: 250 }
            ]} 
            resizeMode="contain" 
          />
        </View>
      )}
      
      {/* Main Info Card */}
      <View style={styles.card}>
        {/* Header: Brand & Name */}
        <View style={styles.cardHeader}>
          {data.brand && (
            <Text style={styles.cardBrand}>{data.brand}</Text>
          )}
          <Text style={styles.cardTitle}>{data.dish || '알 수 없음'}</Text>
          <View style={styles.divider} />
        </View>

        {/* Nutrition Facts Table Style */}
        <View style={styles.nutritionSection}>
          <Text style={styles.nutritionHeader}>Nutrition Facts</Text>
          <Text style={styles.nutritionSubHeader}>
            기준: {data.reference_standard || '1인분 추정'}
          </Text>
          <View style={styles.thickDivider} />
          
          <NutritionRow label="열량 (Calories)" value={macros.calories ? `${macros.calories} kcal` : '-'} isBold />
          <View style={styles.thinDivider} />
          
          <NutritionRow label="탄수화물 (Carb)" value={macros.carbs_g ? `${macros.carbs_g}g` : '-'} isBold />
          <NutritionRow label="  당류 (Sugars)" value={macros.sugar_g ? `${macros.sugar_g}g` : '-'} isSub />
          <View style={styles.thinDivider} />

          <NutritionRow label="단백질 (Protein)" value={macros.protein_g ? `${macros.protein_g}g` : '-'} isBold />
          <View style={styles.thinDivider} />

          <NutritionRow label="지방 (Fat)" value={macros.fat_g ? `${macros.fat_g}g` : '-'} isBold />
          <NutritionRow label="  포화지방 (Saturated)" value={macros.saturated_fat_g ? `${macros.saturated_fat_g}g` : '-'} isSub />
          <NutritionRow label="  트랜스지방 (Trans)" value={macros.trans_fat_g ? `${macros.trans_fat_g}g` : '-'} isSub />
          <View style={styles.thinDivider} />

          <NutritionRow label="나트륨 (Sodium)" value={macros.sodium_mg ? `${macros.sodium_mg}mg` : '-'} isBold />
          <View style={styles.thinDivider} />

          <NutritionRow label="콜레스테롤 (Cholesterol)" value={macros.cholesterol_mg ? `${macros.cholesterol_mg}mg` : '-'} isBold />
          <View style={styles.thickDivider} />
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>원재료 (Ingredients)</Text>
          <View style={styles.chipContainer}>
            {data.ingredients?.map((ing: string, i: number) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{ing}</Text>
              </View>
            ))}
            {(!data.ingredients || data.ingredients.length === 0) && <Text style={styles.emptyText}>정보 없음</Text>}
          </View>
        </View>

        {/* Allergens */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#D32F2F' }]}>알레르기 정보 (Allergens)</Text>
          <View style={styles.chipContainer}>
            {data.allergens?.length > 0 ? (
              data.allergens.map((alg: string, i: number) => (
                <View key={i} style={[styles.chip, styles.chipAlert]}>
                  <Text style={[styles.chipText, styles.chipAlertText]}>{alg}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.safeText}>발견된 알레르기 성분 없음</Text>
            )}
          </View>
        </View>

        {/* AI Notes */}
        {data.notes && (
           <View style={styles.noteContainer}>
             <Text style={styles.noteTitle}>💡 AI 분석 코멘트</Text>
             <Text style={styles.noteText}>{data.notes}</Text>
           </View>
        )}
      </View>
    </View>
  );
}

function NutritionRow({ label, value, isBold, isSub }: { label: string, value: string, isBold?: boolean, isSub?: boolean }) {
  return (
    <View style={[styles.nutriRow, isSub && styles.nutriRowSub]}>
      <Text style={[styles.nutriLabel, isBold && styles.nutriLabelBold]}>{label}</Text>
      <Text style={[styles.nutriValue, isBold && styles.nutriValueBold]}>{value}</Text>
    </View>
  );
}
