import { NavigatorScreenParams } from '@react-navigation/native';
import { FoodAnalysis } from '../types/user';

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  MainTab: NavigatorScreenParams<MainTabParamList> | undefined;
  Verify: { imageUri: string; ocrText?: string };
  Result: { analysis: FoodAnalysis; imageUri: string };
  Privacy: undefined;
  // Legacy
  Home: undefined;
  FoodResult: { analysis: FoodAnalysis; imageUri: string };
};

export type MainTabParamList = {
  Scan: undefined;
  Meal: undefined;
  History: undefined;
  Profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
