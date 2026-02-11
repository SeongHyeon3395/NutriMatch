import { NavigatorScreenParams } from '@react-navigation/native';
import { FoodAnalysis } from '../types/user';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Onboarding: { initialStep?: number } | undefined;
  MainTab: NavigatorScreenParams<MainTabParamList> | undefined;
  History: undefined;
  Camera: undefined;
  Edit: { imageUri: string };
  Verify: { imageUri: string; ocrText?: string; autoAnalyze?: boolean };
  Result: { analysis: FoodAnalysis; imageUri: string; readOnly?: boolean };
  EditAllergens: undefined;
  MonthlyDietScores: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  PersonalInfo: undefined;
  EditPersonalInfo: undefined;
  Privacy: undefined;
  Terms: undefined;
  PrivacyPolicy: undefined;
  // Legacy
  Home: undefined;
  FoodResult: { analysis: FoodAnalysis; imageUri: string };
  MealDetail: { title: string; date: string; calories: number; grade: 'A' | 'B' | 'C' | 'D' | 'E' };
  MealPlanDetail: { id: number };
};

export type MainTabParamList = {
  Scan: undefined;
  Meal: undefined;
  Chat: undefined;
  Calendar: undefined;
  Profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
