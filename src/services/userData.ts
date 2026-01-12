import { supabase } from './supabaseClient';
import type { BodyLog, FoodGrade, FoodLog, UserProfile } from '../types/user';

export type NotificationSettingsRemote = {
  enabled: boolean;
  meal_reminder: boolean;
  weekly_summary: boolean;
  tips: boolean;
};

type AppUserRow = {
  id: string;
  username: string;
  nickname: string;
  device_id?: string | null;
  avatar_path?: string | null;
  body_goal: string | null;
  health_diet: string | null;
  lifestyle_diet: string | null;
  allergens: string[];
  onboarding_completed: boolean;
  current_weight: number | null;
  target_weight: number | null;
  height: number | null;
  age: number | string | null;
  gender: string | null;
  created_at: string;
  updated_at: string;
};

type FoodLogRow = {
  id: string;
  user_id: string;
  image_uri: string | null;
  image_path?: string | null;
  analysis: any;
  meal_type: string | null;
  occurred_at: string;
  notes: string | null;
};

type BodyLogRow = {
  id: string;
  user_id: string;
  weight: number | string | null;
  muscle_mass: number | string | null;
  body_fat: number | string | null;
  occurred_at: string;
};

function parseNumeric(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function mapAppUserRowToProfile(row: AppUserRow, email: string): UserProfile {
  return {
    id: row.id,
    email,
    name: row.nickname || row.username || '사용자',
    username: row.username,
    nickname: row.nickname,

    avatarPath: row.avatar_path ?? undefined,

    bodyGoal: (row.body_goal as any) || 'maintenance',
    healthDiet: (row.health_diet as any) || 'none_health',
    lifestyleDiet: (row.lifestyle_diet as any) || 'none_lifestyle',
    allergens: Array.isArray(row.allergens) ? row.allergens : [],

    currentWeight: parseNumeric(row.current_weight),
    targetWeight: parseNumeric(row.target_weight),
    height: parseNumeric(row.height),
    age: parseNumeric(row.age),
    gender: (row.gender as any) || undefined,

    onboardingCompleted: Boolean(row.onboarding_completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProfileUpdatesToAppUserUpdates(updates: Partial<UserProfile>) {
  const out: Record<string, unknown> = {};

  if (updates.username !== undefined) out.username = updates.username;
  if (updates.nickname !== undefined) out.nickname = updates.nickname;
  if (updates.avatarPath !== undefined) out.avatar_path = updates.avatarPath;

  if (updates.bodyGoal !== undefined) out.body_goal = updates.bodyGoal;
  if (updates.healthDiet !== undefined) out.health_diet = updates.healthDiet;
  if (updates.lifestyleDiet !== undefined) out.lifestyle_diet = updates.lifestyleDiet;
  if (updates.allergens !== undefined) out.allergens = updates.allergens;
  if (updates.onboardingCompleted !== undefined) out.onboarding_completed = updates.onboardingCompleted;

  if (updates.currentWeight !== undefined) out.current_weight = updates.currentWeight;
  if (updates.targetWeight !== undefined) out.target_weight = updates.targetWeight;
  if (updates.height !== undefined) out.height = updates.height;
  if (updates.age !== undefined) out.age = updates.age;
  if (updates.gender !== undefined) out.gender = updates.gender;

  return out;
}

function mapFoodLogRow(row: FoodLogRow): FoodLog {
  return {
    id: row.id,
    userId: row.user_id,
    imageUri: row.image_uri || '',
    analysis: row.analysis,
    mealType: (row.meal_type as any) || 'snack',
    timestamp: row.occurred_at,
    notes: row.notes ?? undefined,
  };
}

const FOOD_IMAGES_BUCKET = 'food-images';
const PROFILE_AVATARS_BUCKET = 'profile-avatars';

function toUploadableUri(uri: string) {
  const u = String(uri || '').trim();
  if (!u) return '';
  if (/^(file|content):\/\//i.test(u)) return u;
  return `file://${u}`;
}

function blobFromUri(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        resolve(xhr.response as unknown as Blob);
      };
      xhr.onerror = () => reject(new Error('Network request failed'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    } catch (e: any) {
      reject(e);
    }
  });
}

function ensurePlainBase64(b64: string) {
  const s = String(b64 || '').trim();
  const idx = s.indexOf('base64,');
  const plain = idx >= 0 ? s.slice(idx + 'base64,'.length) : s;
  return plain.replace(/[\r\n\s]/g, '');
}

function base64ToUint8Array(b64: string): Uint8Array {
  const input = ensurePlainBase64(b64);
  if (!input) return new Uint8Array(0);

  // Support standard and URL-safe base64
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Int16Array(256);
  lookup.fill(-1);
  for (let i = 0; i < alphabet.length; i++) lookup[alphabet.charCodeAt(i)] = i;
  lookup['='.charCodeAt(0)] = 0;

  const len = normalized.length;
  if (len % 4 !== 0) {
    throw new Error('base64 문자열 형식이 올바르지 않습니다.');
  }

  let padding = 0;
  if (len >= 2 && normalized[len - 1] === '=') padding++;
  if (len >= 2 && normalized[len - 2] === '=') padding++;

  const outLen = (len / 4) * 3 - padding;
  const out = new Uint8Array(outLen);

  let o = 0;
  for (let i = 0; i < len; i += 4) {
    const c0 = lookup[normalized.charCodeAt(i)];
    const c1 = lookup[normalized.charCodeAt(i + 1)];
    const c2 = lookup[normalized.charCodeAt(i + 2)];
    const c3 = lookup[normalized.charCodeAt(i + 3)];
    if (c0 < 0 || c1 < 0 || c2 < 0 || c3 < 0) {
      throw new Error('base64 문자열에 허용되지 않는 문자가 있습니다.');
    }

    const triple = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;

    if (o < outLen) out[o++] = (triple >> 16) & 0xff;
    if (o < outLen) out[o++] = (triple >> 8) & 0xff;
    if (o < outLen) out[o++] = triple & 0xff;
  }

  return out;
}

async function uploadFoodImage(fileUri: string, userId: string) {
  const client = requireSupabase();
  const uploadUri = toUploadableUri(fileUri);
  if (!uploadUri) throw new Error('이미지 URI가 비어있습니다.');

  const resp = await fetch(uploadUri);
  const blob = await resp.blob();

  const name = `${Date.now()}_${Math.random().toString(16).slice(2)}.jpg`;
  const path = `${userId}/${name}`;

  const { error } = await client.storage.from(FOOD_IMAGES_BUCKET).upload(path, blob as any, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

async function trySignedUrl(path: string) {
  const client = requireSupabase();
  const { data, error } = await client.storage.from(FOOD_IMAGES_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) throw error;
  return data.signedUrl;
}

async function signedUrlFromBucket(bucket: string, path: string, expiresInSeconds = 60 * 60 * 24 * 7) {
  const client = requireSupabase();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

async function uploadProfileAvatar(fileUri: string, userId: string, mime?: string | null, base64?: string | null) {
  const client = requireSupabase();
  const isPng = typeof mime === 'string' && /png/i.test(mime);
  const ext = isPng ? 'png' : 'jpg';
  const contentType = isPng ? 'image/png' : 'image/jpeg';

  // Prefer base64 to avoid Android local-uri (file://, content://) blob read issues.
  let body: any = null;
  if (typeof base64 === 'string' && base64.trim()) {
    try {
      body = base64ToUint8Array(base64);
    } catch {
      body = null;
    }
  }

  if (!body) {
    const uploadUri = toUploadableUri(fileUri);
    if (!uploadUri) throw new Error('이미지 URI가 비어있습니다.');
    body = await blobFromUri(uploadUri);
  }

  const name = `avatar_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  const path = `${userId}/${name}`;

  const { error } = await client.storage.from(PROFILE_AVATARS_BUCKET).upload(path, body as any, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

async function tryRemoveFromBucket(bucket: string, path: string) {
  try {
    const client = requireSupabase();
    await client.storage.from(bucket).remove([path]);
  } catch {
    // ignore
  }
}

function mapBodyLogRow(row: BodyLogRow): BodyLog {
  return {
    id: row.id,
    userId: row.user_id,
    weight: parseNumeric(row.weight) ?? 0,
    muscleMass: parseNumeric(row.muscle_mass),
    bodyFat: parseNumeric(row.body_fat),
    timestamp: row.occurred_at,
  };
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase 설정이 없습니다. (로컬 모드)');
  }
  return supabase;
}

function uuidv4(): string {
  try {
    const c = (globalThis as any)?.crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // ignore
  }

  // RFC4122-ish fallback (good enough for client-generated ids)
  const hex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  hex[6] = (hex[6] & 0x0f) | 0x40;
  hex[8] = (hex[8] & 0x3f) | 0x80;
  const b = hex.map(n => n.toString(16).padStart(2, '0')).join('');
  return `${b.slice(0, 8)}-${b.slice(8, 12)}-${b.slice(12, 16)}-${b.slice(16, 20)}-${b.slice(20)}`;
}

function extractMissingColumnFromPgrst204(err: any): string | null {
  const msg = String(err?.message || '');
  const details = String(err?.details || '');
  const text = `${msg} ${details}`;

  // Typical PostgREST message:
  // "Could not find the 'image_path' column of 'food_logs' in the schema cache"
  const m1 = text.match(/find the '([^']+)' column/i);
  if (m1?.[1]) return m1[1];

  // Fallback patterns
  const m2 = text.match(/column\s+"([^"]+)"/i);
  if (m2?.[1]) return m2[1];

  return null;
}

async function insertFoodLogRowWithFallback(client: ReturnType<typeof requireSupabase>, row: Record<string, any>) {
  const attempted = new Set<string>();
  let current = { ...row };

  for (let i = 0; i < 5; i++) {
    const { error } = await client.from('food_logs').insert(current);
    if (!error) return;

    const code = (error as any)?.code;
    if (code !== 'PGRST204') throw error;

    const missing = extractMissingColumnFromPgrst204(error);
    if (!missing || attempted.has(missing) || !(missing in current)) {
      const hint =
        '서버 DB 스키마(food_logs)가 앱과 달라 저장에 실패했어요.\n' +
        'Supabase에서 마이그레이션을 적용하고(Postgres), PostgREST schema cache를 리로드해 주세요.';
      const enriched = new Error(`${error.message || '저장 실패'}\n\n${hint}`);
      (enriched as any).cause = error;
      throw enriched;
    }

    attempted.add(missing);
    delete current[missing];
  }

  throw new Error('저장 실패: 서버 스키마 불일치가 지속됩니다.');
}

export async function deleteMyAccountRemote() {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  return data as any;
}

export async function resetMyAccountDataRemote() {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('reset-account-data', { method: 'POST' });
  if (error) throw error;
  return data as any;
}

export async function getSessionUserId(): Promise<string | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session?.user?.id ?? null;
}

export async function getSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export async function fetchMyAppUser() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('로그인이 필요합니다.');

  const client = requireSupabase();
  const { data, error } = await client
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  const email = session?.user?.email || '';
  return mapAppUserRowToProfile(data as AppUserRow, email);
}

export async function updateMyAppUser(updates: Partial<UserProfile>) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const mapped = mapProfileUpdatesToAppUserUpdates(updates);
  if (Object.keys(mapped).length === 0) {
    return fetchMyAppUser();
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('app_users')
    .update(mapped as any)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  const session = await getSession();
  return mapAppUserRowToProfile(data as AppUserRow, session?.user?.email || '');
}

export async function getMyAvatarSignedUrl() {
  const profile = await fetchMyAppUser();
  if (!profile.avatarPath) return null;
  return signedUrlFromBucket(PROFILE_AVATARS_BUCKET, profile.avatarPath).catch(() => null);
}

export async function updateMyProfileAvatarRemote(params: {
  localUri: string;
  base64?: string | null;
  mime?: string | null;
  previousAvatarPath?: string | null;
}) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const nextPath = await uploadProfileAvatar(params.localUri, userId, params.mime ?? null, params.base64 ?? null);

  const client = requireSupabase();
  const { data, error } = await client
    .from('app_users')
    .update({ avatar_path: nextPath } as any)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;

  // best-effort: delete previous avatar object if it exists and differs
  if (params.previousAvatarPath && params.previousAvatarPath !== nextPath) {
    await tryRemoveFromBucket(PROFILE_AVATARS_BUCKET, params.previousAvatarPath);
  }

  const session = await getSession();
  const mapped = mapAppUserRowToProfile(data as AppUserRow, session?.user?.email || '');

  // Attach a signed URL for immediate display (optional convenience)
  const signedUrl = mapped.avatarPath
    ? await signedUrlFromBucket(PROFILE_AVATARS_BUCKET, mapped.avatarPath).catch(() => null)
    : null;

  return { profile: mapped, signedUrl };
}

export async function insertFoodLogRemote(log: Omit<FoodLog, 'id'>) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  let imagePath: string | null = null;
  let imageUriFallback: string | null = null;
  try {
    imagePath = await uploadFoodImage(log.imageUri, userId);
  } catch {
    // Storage 설정/권한 문제 등으로 업로드 실패 시에도 기록 자체는 남김(기기간 사진 유지는 불가)
    imagePath = null;
    imageUriFallback = log.imageUri;
  }

  const id = uuidv4();
  const row: Record<string, any> = {
    id,
    user_id: userId,
    analysis: log.analysis,
    meal_type: log.mealType,
    occurred_at: log.timestamp,
  };

  // Optional columns: older DBs might not have these yet.
  if (imageUriFallback) row.image_uri = imageUriFallback;
  if (imagePath) row.image_path = imagePath;
  if (log.notes != null) row.notes = log.notes;

  const client = requireSupabase();
  // PGRST204(스키마 캐시/컬럼 불일치) 발생 시, 문제 컬럼을 제거하고 재시도하여 저장이 막히지 않게 함.
  await insertFoodLogRowWithFallback(client, row);

  const mapped: FoodLog = {
    id,
    userId,
    imageUri: imageUriFallback || '',
    analysis: log.analysis,
    mealType: log.mealType,
    timestamp: log.timestamp,
    notes: log.notes,
  };

  if (imagePath) {
    try {
      mapped.imageUri = await trySignedUrl(imagePath);
    } catch {
      // ignore
    }
  }
  return mapped;
}

export async function listFoodLogsRemote(limit = 50) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const client = requireSupabase();
  const { data, error } = await client
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = data as FoodLogRow[];
  const logs = rows.map(mapFoodLogRow);
  await Promise.all(
    rows.map(async (row, idx) => {
      const p = row.image_path;
      if (!p) return;
      try {
        logs[idx].imageUri = await trySignedUrl(p);
      } catch {
        // ignore
      }
    })
  );
  return logs;
}

type MonthlyGradeLetter = 'A' | 'B' | 'C' | 'D' | 'F';

function foodGradeToScore(grade: FoodGrade): number {
  switch (grade) {
    case 'very_good':
      return 5;
    case 'good':
      return 4;
    case 'neutral':
      return 3;
    case 'bad':
      return 2;
    case 'very_bad':
      return 1;
    default:
      return 3;
  }
}

function scoreToMonthlyLetter(score: number): MonthlyGradeLetter {
  const s = Math.min(5, Math.max(1, Math.round(score)));
  switch (s) {
    case 5:
      return 'A';
    case 4:
      return 'B';
    case 3:
      return 'C';
    case 2:
      return 'D';
    default:
      return 'F';
  }
}

/**
 * 이번 달 food_logs의 userAnalysis.grade를 A~F로 평균 계산합니다.
 * 스캔 기록이 없으면 null을 반환합니다.
 */
export async function getMonthlyAverageGradeLetterRemote(pMonth?: Date) {
  const userId = await getSessionUserId().catch(() => null);
  if (!userId) return null;

  const base = pMonth instanceof Date ? pMonth : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1, 0, 0, 0, 0);

  const client = requireSupabase();
  const { data, error } = await client
    .from('food_logs')
    .select('analysis, occurred_at')
    .eq('user_id', userId)
    .gte('occurred_at', start.toISOString())
    .lt('occurred_at', end.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(500);

  if (error) throw error;
  const rows = (data as Array<{ analysis: any }> | null) ?? [];
  if (rows.length === 0) return null;

  const scores = rows
    .map(r => r?.analysis?.userAnalysis?.grade as FoodGrade | undefined)
    .filter((g): g is FoodGrade => typeof g === 'string')
    .map(foodGradeToScore);

  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return scoreToMonthlyLetter(avg);
}

export async function insertBodyLogRemote(log: Omit<BodyLog, 'id'>) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const row = {
    user_id: userId,
    weight: log.weight,
    muscle_mass: log.muscleMass ?? null,
    body_fat: log.bodyFat ?? null,
    occurred_at: log.timestamp,
  };

  const client = requireSupabase();
  const { data, error } = await client.from('body_logs').insert(row).select('*').single();
  if (error) throw error;
  return mapBodyLogRow(data as BodyLogRow);
}

export async function listBodyLogsRemote(limit = 50) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const client = requireSupabase();
  const { data, error } = await client
    .from('body_logs')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as BodyLogRow[]).map(mapBodyLogRow);
}

export async function fetchMyNotificationSettingsRemote() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const client = requireSupabase();
  const { data, error } = await client
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data as any;
}

export async function upsertMyNotificationSettingsRemote(settings: Partial<NotificationSettingsRemote>) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const client = requireSupabase();
  const { data, error } = await client
    .from('notification_settings')
    .upsert({ user_id: userId, ...settings } as any, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data as any;
}

export async function getMonthlyScanCountRemote(pMonth?: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_monthly_scan_count', pMonth ? { p_month: pMonth } : {});
  if (error) throw error;
  return (data ?? 0) as number;
}
