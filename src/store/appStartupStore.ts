import { create } from 'zustand';
import type { FoodLog } from '../types/user';
import type { MealPlanLog } from '../services/userData';

export type AppStartupSnapshot = {
  userId: string;
  loadedAt: number;
  communityNoticeAgreed: boolean | null;
  monthlyScanUsed: number | null;
  monthlyMealPlanUsed: number | null;
  foodLogs: FoodLog[];
  mealPlanLogs: MealPlanLog[];
};

type AppStartupState = {
  initialized: boolean;
  userId: string | null;
  loadedAt: number;
  communityNoticeAgreed: boolean | null;
  monthlyScanUsed: number | null;
  monthlyMealPlanUsed: number | null;
  foodLogs: FoodLog[];
  mealPlanLogs: MealPlanLog[];
  setSnapshot: (snapshot: AppStartupSnapshot) => void;
  setCommunityNoticeAgreed: (userId: string, agreed: boolean) => void;
  clear: () => void;
};

const EMPTY: Omit<AppStartupState, 'setSnapshot' | 'setCommunityNoticeAgreed' | 'clear'> = {
  initialized: false,
  userId: null,
  loadedAt: 0,
  communityNoticeAgreed: null,
  monthlyScanUsed: null,
  monthlyMealPlanUsed: null,
  foodLogs: [],
  mealPlanLogs: [],
};

export const useAppStartupStore = create<AppStartupState>((set, get) => ({
  ...EMPTY,

  setSnapshot: (snapshot) => {
    set({
      initialized: true,
      userId: snapshot.userId,
      loadedAt: snapshot.loadedAt,
      communityNoticeAgreed: snapshot.communityNoticeAgreed,
      monthlyScanUsed: snapshot.monthlyScanUsed,
      monthlyMealPlanUsed: snapshot.monthlyMealPlanUsed,
      foodLogs: Array.isArray(snapshot.foodLogs) ? snapshot.foodLogs : [],
      mealPlanLogs: Array.isArray(snapshot.mealPlanLogs) ? snapshot.mealPlanLogs : [],
    });
  },

  setCommunityNoticeAgreed: (userId, agreed) => {
    const current = get();
    if (!current.initialized || current.userId !== userId) return;
    set({ communityNoticeAgreed: agreed });
  },

  clear: () => {
    set({ ...EMPTY });
  },
}));
