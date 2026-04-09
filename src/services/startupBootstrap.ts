import {
  getMonthlyMealPlanCountRemote,
  getMonthlyScanCountRemote,
  listFoodLogsRemote,
  listMealPlanLogsRemote,
} from './userData';
import type { AppStartupSnapshot } from '../store/appStartupStore';

export async function preloadStartupSnapshot(userId: string): Promise<AppStartupSnapshot> {
  const [scanRes, mealCountRes, foodLogsRes, mealLogsRes] = await Promise.allSettled([
    getMonthlyScanCountRemote(),
    getMonthlyMealPlanCountRemote(),
    listFoodLogsRemote(50),
    listMealPlanLogsRemote(10),
  ]);

  return {
    userId,
    loadedAt: Date.now(),
    communityNoticeAgreed: null,
    monthlyScanUsed: scanRes.status === 'fulfilled' ? scanRes.value : null,
    monthlyMealPlanUsed: mealCountRes.status === 'fulfilled' ? mealCountRes.value : null,
    foodLogs: foodLogsRes.status === 'fulfilled' ? foodLogsRes.value : [],
    mealPlanLogs: mealLogsRes.status === 'fulfilled' ? mealLogsRes.value : [],
  };
}
