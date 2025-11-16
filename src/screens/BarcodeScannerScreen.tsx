import React, { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// @ts-ignore CameraKit types may not include named export in this version
import { CameraKitCameraScreen } from 'react-native-camera-kit';

export type BarcodeScannerScreenProps = {
  onCancel: () => void;
  onDetected: (value: string) => void;
};

export default function BarcodeScannerScreen({ onCancel, onDetected }: BarcodeScannerScreenProps) {
  const [hasPermission, setHasPermission] = useState(Platform.OS === 'ios');

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        setHasPermission(res === PermissionsAndroid.RESULTS.GRANTED);
      }
    })();
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text>카메라 권한이 필요합니다.</Text>
        <TouchableOpacity onPress={onCancel} style={[styles.button, styles.ghost]}>
          <Text style={[styles.buttonText, styles.ghostText]}>닫기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraKitCameraScreen
        style={StyleSheet.absoluteFill}
        scanBarcode={true}
        showFrame={true}
        laserColor="red"
        frameColor="white"
        onReadCode={(event: any) => {
          const value = event?.nativeEvent?.codeStringValue;
          if (value) onDetected(value);
        }}
      />
      <View style={styles.overlayBottom}>
        <TouchableOpacity onPress={onCancel} style={[styles.button, styles.ghost]}>
          <Text style={[styles.buttonText, styles.ghostText]}>닫기</Text>
        </TouchableOpacity>
      </View>
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
