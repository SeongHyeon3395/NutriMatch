import { BASE_URL, ENDPOINTS, buildSupabaseHeaders } from '../config';
import { Platform } from 'react-native';

export type AnalyzeResponse = {
  ok: boolean;
  // Backend returns { ok: true, data: { ... } }
  data?: {
    dish?: string; // Name of the dish
    brand?: string;
    source?: string;
    reference_standard?: string;
    estimated_macros?: any;
    userAnalysis?: any;
    confidence?: number;
    notes?: string;
    geminiUsed?: boolean;
    [key: string]: any;
  };
  message?: string;
  // Fallback for flat structure
  [key: string]: any;
};

export type SignupDeviceRequest = {
  username: string;
  nickname: string;
  password: string;
  deviceId: string;
};

export type SignupDeviceResponse = {
  ok: boolean;
  message?: string;
  data?: {
    userId: string;
  };
};

export type CheckUsernameResponse = {
  ok: boolean;
  message?: string;
  data?: {
    available: boolean;
  };
};

function normalizeUri(uri: string) {
  // On iOS, ImagePicker returns 'file://', Android may return content or file scheme.
  // For fetch multipart with RN, keep URI as-is.
  return uri;
}

async function uploadImage(endpoint: string, fileUri: string) {
  if (!BASE_URL) {
    throw new Error(
      '환경변수 BASE_URL이 비어있습니다. .env에 BASE_URL(예: https://<project-ref>.functions.supabase.co)과 SUPABASE_ANON_KEY를 설정하고 Metro를 재시작하세요.'
    );
  }
  const form = new FormData();
  const filename = fileUri.split('/').pop() || `capture_${Date.now()}.jpg`;
  const rnFile = {
    uri: normalizeUri(fileUri),
    type: 'image/jpeg',
    name: filename,
  };
  form.append('file', rnFile);

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

export async function analyzeFoodImage(fileUri: string) {
  return uploadImage(ENDPOINTS.analyzeFoodImage, fileUri);
}

export async function pingHealth(): Promise<AnalyzeResponse> {
  if (!BASE_URL) throw new Error('BASE_URL 비어있음');
  const res = await fetch(`${BASE_URL}${ENDPOINTS.health}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Health 실패 HTTP ${res.status}`);
  return json as AnalyzeResponse;
}

export async function signupDevice(payload: SignupDeviceRequest): Promise<SignupDeviceResponse> {
  if (!BASE_URL) {
    throw new Error(
      '환경변수 BASE_URL이 비어있습니다. .env에 BASE_URL(예: https://<project-ref>.functions.supabase.co)과 SUPABASE_ANON_KEY를 설정하고 Metro를 재시작하세요.'
    );
  }

  const res = await fetch(`${BASE_URL}${ENDPOINTS.signupDevice}`, {
    method: 'POST',
    headers: {
      ...buildSupabaseHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    const message = json?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return json as SignupDeviceResponse;
}

export async function checkUsername(username: string): Promise<CheckUsernameResponse> {
  if (!BASE_URL) {
    throw new Error(
      '환경변수 BASE_URL이 비어있습니다. .env에 BASE_URL(예: https://<project-ref>.functions.supabase.co)과 SUPABASE_ANON_KEY를 설정하고 Metro를 재시작하세요.'
    );
  }

  const res = await fetch(`${BASE_URL}${ENDPOINTS.checkUsername}`, {
    method: 'POST',
    headers: {
      ...buildSupabaseHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    const message = json?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return json as CheckUsernameResponse;
}
