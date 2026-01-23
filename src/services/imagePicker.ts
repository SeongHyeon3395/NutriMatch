import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

type PickedImage = {
  uri: string;
  fileName?: string;
  type?: string;
  base64?: string;
};

function pickFirstAsset(result: any): PickedImage | null {
  if (!result) return null;
  if (result.didCancel) return null;
  if (result.errorCode) {
    throw new Error(result.errorMessage || result.errorCode);
  }
  const asset = Array.isArray(result.assets) ? result.assets[0] : null;
  const uri = typeof asset?.uri === 'string' ? asset.uri.trim() : '';
  if (!uri) return null;

  return {
    uri,
    fileName: typeof asset?.fileName === 'string' ? asset.fileName : undefined,
    type: typeof asset?.type === 'string' ? asset.type : undefined,
    base64: typeof asset?.base64 === 'string' ? asset.base64 : undefined,
  };
}

export async function pickPhotoFromCamera(params?: {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}): Promise<PickedImage | null> {
  const result = await launchCamera({
    mediaType: 'photo',
    saveToPhotos: false,
    maxWidth: params?.maxWidth ?? 1200,
    maxHeight: params?.maxHeight ?? 1200,
    quality: (params?.quality ?? 0.85) as any,
    includeBase64: false,
  });
  return pickFirstAsset(result);
}

export async function pickPhotoFromLibrary(params?: {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}): Promise<PickedImage | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    maxWidth: params?.maxWidth ?? 1200,
    maxHeight: params?.maxHeight ?? 1200,
    quality: (params?.quality ?? 0.85) as any,
    includeBase64: false,
  });
  return pickFirstAsset(result);
}

export async function pickAvatarFromLibrary(): Promise<PickedImage | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.9,
    includeBase64: true,
  });
  return pickFirstAsset(result);
}
