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
import { launchCamera, launchImageLibrary, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import { analyzeFoodImage, AnalyzeResponse } from './src/services/api';

type Mode = 'food';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
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

  const cameraOptions: CameraOptions = useMemo(
    () => ({
      mediaType: 'photo',
      cameraType: 'back',
      includeBase64: false,
      saveToPhotos: false,
      quality: 0.8,
    }),
    []
  );

  const reset = useCallback(() => {
    setMode(null);
    setResult(null);
    setError(null);
    setLoading(false);
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

      // 2. launchCamera 호출 (권한 후)
      let res;
      try {
        res = await launchCamera(cameraOptions);
      } catch (e: any) {
        setError('카메라 실행 예외: ' + (e?.message || String(e)));
        return;
      }

      if (!res) {
        setError('카메라 결과를 받지 못했습니다.');
        return;
      }
      if (res.didCancel) {
        reset();
        return;
      }
      if (res.errorCode) {
        const map: Record<string,string> = {
          camera_unavailable: '카메라 사용 불가 (다른 앱이 사용 중일 수 있음).',
          permission: '카메라 권한이 거부되었습니다. 설정에서 허용해주세요.',
          no_camera: '기기에 카메라가 없습니다.',
          others: '알 수 없는 카메라 오류가 발생했습니다.',
          activity_error: '카메라 Activity 실행 실패. 앱 재설치 또는 재부팅을 시도하세요.',
        };
        if (__DEV__) console.log('Camera picker response:', res);
        setError(res.errorMessage || map[res.errorCode] || res.errorCode);
        return;
      }

      const uri = res.assets?.[0]?.uri;
      if (!uri) {
        setError('이미지를 가져오지 못했습니다.');
        return;
      }

      try {
        setLoading(true);
        setImageUri(uri);
        const data = await analyzeFoodImage(uri);
        setResult(data);
      } catch (e: any) {
        setError(e?.message || '분석 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [cameraOptions, reset]
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

      const options: ImageLibraryOptions = {
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
      };
      let res;
      try {
        res = await launchImageLibrary(options);
      } catch (e: any) {
        setError('갤러리 실행 예외: ' + (e?.message || String(e)));
        return;
      }
      if (res.didCancel) {
        reset();
        return;
      }
      if (res.errorCode) {
        const map: Record<string,string> = {
          permission: '권한이 거부되었습니다. 설정에서 사진 접근을 허용해주세요.',
          others: '갤러리 접근 중 오류가 발생했습니다.',
          camera_unavailable: '카메라/갤러리를 사용할 수 없습니다.',
          no_camera: '카메라를 찾을 수 없습니다.',
          activity_error: '갤러리 Activity 실행 실패. 앱 재설치 또는 재부팅을 시도하세요.',
        };
        if (__DEV__) console.log('Gallery picker response:', res);
        setError(res.errorMessage || map[res.errorCode] || res.errorCode);
        return;
      }
      const uri = res.assets?.[0]?.uri;
      if (!uri) {
        setError('이미지를 가져오지 못했습니다.');
        return;
      }
      try {
        setLoading(true);
        setImageUri(uri);
        const data = await analyzeFoodImage(uri);
        setResult(data);
      } catch (e: any) {
        setError(e?.message || '분석 중 오류가 발생했습니다.');
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
            <FoodResultView uri={imageUri} data={result?.data} />
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
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Gemini 기반 음식 인식: 사진을 또 선택하거나 촬영해 보세요.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 28, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
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
});

export default App;

function Field({ label, value }: { label: string; value?: any }) {
  if (value === undefined || value === null || value === '') return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontWeight: '700', marginBottom: 4 }}>{label}</Text>
      <Text selectable style={styles.mono}>{text}</Text>
    </View>
  );
}

function FoodResultView({ uri, data }: { uri: string | null; data?: any }) {
  if (!data) return <Text style={styles.mono}>결과가 비어있습니다.</Text>;
  const macros = data.estimated_macros || {};
  return (
    <View>
      {uri && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: '700', marginBottom: 4 }}>촬영/선택한 이미지</Text>
          <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
        </View>
      )}
      <Field label="요리명" value={data.dish} />
      <Field label="추정 재료" value={data.ingredients} />
      <Field label="알레르기" value={data.allergens} />
      <Field label="열량(kcal)" value={macros.calories} />
      <Field label="단백질(g)" value={macros.protein_g} />
      <Field label="탄수화물(g)" value={macros.carbs_g} />
      <Field label="지방(g)" value={macros.fat_g} />
      <Field label="신뢰도" value={data.confidence} />
      <Field label="요약" value={data.notes} />
      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>원본 응답(JSON)</Text>
        <Text selectable style={styles.mono}>{JSON.stringify({ ok: true, data }, null, 2)}</Text>
      </View>
    </View>
  );
}
