import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, FoodLog, BodyLog } from '../types/user';
import { getSessionUserId, updateMyAppUser } from '../services/userData';

interface UserState {
  profile: UserProfile | null;
  foodLogs: FoodLog[];
  bodyLogs: BodyLog[];
  
  // Actions
  setProfile: (profile: UserProfile) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  loadProfile: () => Promise<void>;
  clearProfile: () => Promise<void>;
  clearAllData: () => Promise<void>;
  
  addFoodLog: (log: FoodLog) => Promise<void>;
  loadFoodLogs: () => Promise<void>;
  setFoodLogs: (logs: FoodLog[]) => Promise<void>;
  
  addBodyLog: (log: BodyLog) => Promise<void>;
  loadBodyLogs: () => Promise<void>;
  setBodyLogs: (logs: BodyLog[]) => Promise<void>;
}

const PROFILE_KEY = '@nutrimatch_profile';
const FOOD_LOGS_KEY = '@nutrimatch_food_logs';
const BODY_LOGS_KEY = '@nutrimatch_body_logs';

function scopedKey(base: string, userId?: string | null) {
  return userId ? `${base}:${userId}` : base;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  foodLogs: [],
  bodyLogs: [],
  
  setProfile: async (profile: UserProfile) => {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    set({ profile });
  },
  
  updateProfile: async (updates: Partial<UserProfile>) => {
    const current = get().profile;
    if (!current) return;
    
    const updated: UserProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    set({ profile: updated });

    // 로그인 상태면 서버에도 반영 (실패해도 로컬은 유지)
    try {
      const userId = await getSessionUserId().catch(() => null);
      if (!userId) return;
      const remoteProfile = await updateMyAppUser(updates);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(remoteProfile));
      set({ profile: remoteProfile });
    } catch {
      // ignore
    }
  },
  
  loadProfile: async () => {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      if (stored) {
        set({ profile: JSON.parse(stored) });
      }
    } catch (e) {
      console.error('Failed to load profile', e);
    }
  },
  
  clearProfile: async () => {
    await AsyncStorage.removeItem(PROFILE_KEY);
    set({ profile: null });
  },

  clearAllData: async () => {
    const userId = get().profile?.id;
    const keys = [
      PROFILE_KEY,
      FOOD_LOGS_KEY,
      BODY_LOGS_KEY,
      scopedKey(FOOD_LOGS_KEY, userId),
      scopedKey(BODY_LOGS_KEY, userId),
    ];
    await AsyncStorage.multiRemove(keys);
    set({ profile: null, foodLogs: [], bodyLogs: [] });
  },
  
  addFoodLog: async (log: FoodLog) => {
    const logs = [...get().foodLogs, log];
    const userId = get().profile?.id;
    await AsyncStorage.setItem(scopedKey(FOOD_LOGS_KEY, userId), JSON.stringify(logs));
    set({ foodLogs: logs });
  },
  
  loadFoodLogs: async () => {
    try {
      const userId = get().profile?.id;
      const stored = await AsyncStorage.getItem(scopedKey(FOOD_LOGS_KEY, userId));
      if (stored) {
        set({ foodLogs: JSON.parse(stored) });
        return;
      }
      // legacy fallback
      const legacy = await AsyncStorage.getItem(FOOD_LOGS_KEY);
      if (legacy) set({ foodLogs: JSON.parse(legacy) });
    } catch (e) {
      console.error('Failed to load food logs', e);
    }
  },

  setFoodLogs: async (logs: FoodLog[]) => {
    const userId = get().profile?.id;
    await AsyncStorage.setItem(scopedKey(FOOD_LOGS_KEY, userId), JSON.stringify(logs));
    set({ foodLogs: logs });
  },
  
  addBodyLog: async (log: BodyLog) => {
    const logs = [...get().bodyLogs, log];
    const userId = get().profile?.id;
    await AsyncStorage.setItem(scopedKey(BODY_LOGS_KEY, userId), JSON.stringify(logs));
    set({ bodyLogs: logs });
  },
  
  loadBodyLogs: async () => {
    try {
      const userId = get().profile?.id;
      const stored = await AsyncStorage.getItem(scopedKey(BODY_LOGS_KEY, userId));
      if (stored) {
        set({ bodyLogs: JSON.parse(stored) });
        return;
      }
      // legacy fallback
      const legacy = await AsyncStorage.getItem(BODY_LOGS_KEY);
      if (legacy) set({ bodyLogs: JSON.parse(legacy) });
    } catch (e) {
      console.error('Failed to load body logs', e);
    }
  },

  setBodyLogs: async (logs: BodyLog[]) => {
    const userId = get().profile?.id;
    await AsyncStorage.setItem(scopedKey(BODY_LOGS_KEY, userId), JSON.stringify(logs));
    set({ bodyLogs: logs });
  },
}));
