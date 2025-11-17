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
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { launchCamera, CameraOptions } from 'react-native-image-picker';
import { analyzeBarcodeImage, analyzeFoodImage, AnalyzeResponse } from './src/services/api';

type Mode = 'barcode' | 'food';

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
    async (selected: Mode) => {
      setMode(selected);
      setError(null);
      setResult(null);
      

      const res = await launchCamera(cameraOptions);

        // Android: ensure CAMERA permission before opening the camera
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setError('카메라 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
            setMode(null);
            return;
          }
        }
      if (res.didCancel) {
        reset();
        return;
      }
      if (res.errorCode) {
        setError(res.errorMessage || res.errorCode);
        return;
      }

      const uri = res.assets?.[0]?.uri;
      if (!uri) {
        setError('이미지를 가져오지 못했습니다.');
        return;
      }

      try {
        setLoading(true);
        const data =
          selected === 'barcode'
            ? await analyzeBarcodeImage(uri)
            : await analyzeFoodImage(uri);
        setResult(data);
      } catch (e: any) {
        setError(e?.message || '분석 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [cameraOptions, reset]
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
    return (
      <View style={styles.container}>
        <Text style={styles.title}>분석 결과</Text>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <ScrollView style={styles.resultBox} contentContainerStyle={{ padding: 16 }}>
            <Text selectable style={styles.mono}>
              {JSON.stringify(result, null, 2)}
            </Text>
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
      <TouchableOpacity onPress={() => handleCapture('barcode')} style={styles.button}>
        <Text style={styles.buttonText}>바코드 촬영</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleCapture('food')}
        style={[styles.button, styles.secondary]}
      >
        <Text style={styles.buttonText}>음식/성분표 촬영</Text>
      </TouchableOpacity>
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          백엔드 API 주소는 src/config.ts의 BASE_URL을 수정하세요.
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
  footer: { position: 'absolute', bottom: 16, left: 16, right: 16, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#888' },
});

export default App;
