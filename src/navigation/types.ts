import { NavigatorScreenParams } from '@react-navigation/native';
import { FoodAnalysis } from '../types/user';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
  MainTab: NavigatorScreenParams<MainTabParamList> | undefined;
  Verify: { imageUri: string; ocrText?: string };
  Result: { analysis: FoodAnalysis; imageUri: string };
  Settings: undefined;
  PersonalInfo: undefined;
  Privacy: undefined;
  Terms: undefined;
  PrivacyPolicy: undefined;
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
