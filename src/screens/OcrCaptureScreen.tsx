import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { launchCamera, CameraOptions, ImageLibraryOptions, Asset } from 'react-native-image-picker';

export type OcrCaptureScreenProps = {
  onCancel: () => void;
  onCaptured: (photoUri: string) => void;
};

export default function OcrCaptureScreen({ onCancel, onCaptured }: OcrCaptureScreenProps) {
  const [asset, setAsset] = useState<Asset | null>(null);

  const take = async () => {
    const options: CameraOptions = {
      mediaType: 'photo',
      cameraType: 'back',
      includeBase64: false,
      saveToPhotos: false,
      quality: 0.8,
    };
    const res = await launchCamera(options);
    if (res.didCancel) return;
    if (res.errorCode) return;
    const a = res.assets?.[0];
    if (a?.uri) {
      setAsset(a);
      onCaptured(a.uri);
    }
  };

  return (
    <View style={styles.container}>
      {!asset ? (
        <View style={styles.centered}>
          <Text style={{ color: 'white', marginBottom: 12 }}>성분표/음식 사진을 촬영하세요</Text>
          <TouchableOpacity onPress={take} style={styles.button}>
            <Text style={styles.buttonText}>촬영</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={[styles.button, styles.ghost]}>
            <Text style={[styles.buttonText, styles.ghostText]}>닫기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1, alignSelf: 'stretch' }}>
          <Image source={{ uri: asset.uri }} style={{ flex: 1 }} resizeMode="contain" />
          <View style={styles.overlayBottom}>
            <TouchableOpacity onPress={onCancel} style={[styles.button, styles.ghost]}>
              <Text style={[styles.buttonText, styles.ghostText]}>완료</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlayBottom: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  button: { backgroundColor: '#2E7D32', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginTop: 12 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#bbb' },
  ghostText: { color: '#444' },
});
