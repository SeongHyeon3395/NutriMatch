import { BASE_URL, ENDPOINTS, buildSupabaseHeaders } from '../config';
import { Platform } from 'react-native';

export type AnalyzeResponse = {
  ok: boolean;
  // Free-form fields; backend defines exact structure
  data?: any;
  message?: string;
};

function normalizeUri(uri: string) {
  // On iOS, ImagePicker returns 'file://', Android may return content or file scheme.
  // For fetch multipart with RN, keep URI as-is.
  return uri;
}

async function uploadImage(endpoint: string, fileUri: string) {
  const form = new FormData();
  const filename = fileUri.split('/').pop() || `capture_${Date.now()}.jpg`;

  form.append('file', {
    // @ts-ignore RN FormData type mismatch
    uri: normalizeUri(fileUri),
    type: 'image/jpeg',
    name: filename,
  });

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...buildSupabaseHeaders(),
      // Do NOT set 'Content-Type' manually for RN FormData; boundary is auto-set
    },
    body: form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return json as AnalyzeResponse;
}

export async function analyzeBarcodeImage(fileUri: string) {
  return uploadImage(ENDPOINTS.analyzeBarcodeImage, fileUri);
}

export async function analyzeFoodImage(fileUri: string) {
  return uploadImage(ENDPOINTS.analyzeFoodImage, fileUri);
}
