import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, FoodLog, BodyLog } from '../types/user';

interface UserState {
  profile: UserProfile | null;
  foodLogs: FoodLog[];
  bodyLogs: BodyLog[];
  
  // Actions
  setProfile: (profile: UserProfile) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  loadProfile: () => Promise<void>;
  clearProfile: () => Promise<void>;
  
  addFoodLog: (log: FoodLog) => Promise<void>;
  loadFoodLogs: () => Promise<void>;
  
  addBodyLog: (log: BodyLog) => Promise<void>;
  loadBodyLogs: () => Promise<void>;
}

const PROFILE_KEY = '@nutrimatch_profile';
const FOOD_LOGS_KEY = '@nutrimatch_food_logs';
const BODY_LOGS_KEY = '@nutrimatch_body_logs';

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
    set({ profile: null, foodLogs: [], bodyLogs: [] });
  },
  
  addFoodLog: async (log: FoodLog) => {
    const logs = [...get().foodLogs, log];
    await AsyncStorage.setItem(FOOD_LOGS_KEY, JSON.stringify(logs));
    set({ foodLogs: logs });
  },
  
  loadFoodLogs: async () => {
    try {
      const stored = await AsyncStorage.getItem(FOOD_LOGS_KEY);
      if (stored) {
        set({ foodLogs: JSON.parse(stored) });
      }
    } catch (e) {
      console.error('Failed to load food logs', e);
    }
  },
  
  addBodyLog: async (log: BodyLog) => {
    const logs = [...get().bodyLogs, log];
    await AsyncStorage.setItem(BODY_LOGS_KEY, JSON.stringify(logs));
    set({ bodyLogs: logs });
  },
  
  loadBodyLogs: async () => {
    try {
      const stored = await AsyncStorage.getItem(BODY_LOGS_KEY);
      if (stored) {
        set({ bodyLogs: JSON.parse(stored) });
      }
    } catch (e) {
      console.error('Failed to load body logs', e);
    }
  },
}));
