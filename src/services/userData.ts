import { supabase } from './supabaseClient';
import type { BodyLog, FoodLog, UserProfile } from '../types/user';

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase 설정이 없습니다. (로컬 모드)');
  }
  return supabase;
}

export async function getSessionUserId(): Promise<string | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session?.user?.id ?? null;
}

export async function fetchMyAppUser() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const client = requireSupabase();
  const { data, error } = await client
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateMyAppUser(updates: Partial<UserProfile>) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const client = requireSupabase();
  const { data, error } = await client
    .from('app_users')
    .update(updates as any)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function insertFoodLogRemote(log: Omit<FoodLog, 'id'>) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const row = {
    user_id: userId,
    image_uri: log.imageUri,
    analysis: log.analysis,
    meal_type: log.mealType,
    occurred_at: log.timestamp,
    notes: log.notes ?? null,
  };

  const client = requireSupabase();
  const { data, error } = await client.from('food_logs').insert(row).select('*').single();
  if (error) throw error;
  return data;
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
  return data;
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
  return data;
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
  return data;
}
