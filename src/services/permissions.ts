import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';

import type { AppAlertOptions } from '../components/ui/AppAlert';

const ESSENTIAL_PERMISSIONS_PROMPTED_KEY = '@newfit_permissions_prompted:v1';

type AlertFn = (options: AppAlertOptions) => void;

async function requestAndroidEssentialPermissions() {
  if (Platform.OS !== 'android') return;

  const permissions: any[] = [PermissionsAndroid.PERMISSIONS.CAMERA];

  // Android 13+ uses READ_MEDIA_IMAGES; below uses READ_EXTERNAL_STORAGE
  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

  if (apiLevel >= 33) {
    const readMediaImages =
      // RN may not expose the constant in older typings/runtimes
      (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES ?? 'android.permission.READ_MEDIA_IMAGES';
    permissions.push(readMediaImages);
  } else {
    permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
  }

  try {
    await PermissionsAndroid.requestMultiple(permissions);
  } catch {
    // Ignore: user can still grant later in system settings.
  }
}

/**
 * 첫 로그인(=인증 세션이 생긴 시점)에 1회만, 카메라/사진 권한 요청을 안내합니다.
 * - 사용자가 "나중에"를 눌러도 재노출하지 않습니다.
 */
export async function promptEssentialPermissionsOnFirstAuth(alert: AlertFn) {
  if (Platform.OS !== 'android') return;

  const alreadyPrompted = await AsyncStorage.getItem(ESSENTIAL_PERMISSIONS_PROMPTED_KEY);
  if (alreadyPrompted === '1') return;

  // Set early so dismiss/close/backdrop에도 재노출되지 않음
  await AsyncStorage.setItem(ESSENTIAL_PERMISSIONS_PROMPTED_KEY, '1');

  alert({
    title: '권한 허용 안내',
    message: '사진 분석을 위해 카메라 및 사진(갤러리) 접근 권한이 필요해요.\n지금 권한 요청을 진행할까요?',
    actions: [
      { text: '나중에', variant: 'outline' },
      {
        text: '허용 요청',
        variant: 'primary',
        onPress: () => {
          void requestAndroidEssentialPermissions();
        },
      },
    ],
  });
}
