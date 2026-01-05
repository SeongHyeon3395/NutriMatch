import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import MainTabNavigator from './MainTabNavigator';
import VerifyScreen from '../screens/scan/VerifyScreen';
import ResultScreen from '../screens/scan/ResultScreen';
import HomeScreen from '../screens/home/HomeScreen'; // Keep for legacy if needed, or remove
import FoodResultScreen from '../screens/home/FoodResultScreen';
import PrivacySecurityScreen from '../screens/main/PrivacySecurityScreen';
import TermsScreen from '../screens/main/TermsScreen';
import PrivacyPolicyScreen from '../screens/main/PrivacyPolicyScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import PersonalInfoScreen from '../screens/main/PersonalInfoScreen';
import EditPersonalInfoScreen from '../screens/main/EditPersonalInfoScreen.tsx';
import EditAllergensScreen from '../screens/main/EditAllergensScreen.tsx';
import MealDetailScreen from '../screens/main/MealDetailScreen';
import NotificationSettingsScreen from '../screens/main/NotificationSettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="MainTab" component={MainTabNavigator} />
        
        {/* Scan Flow */}
        <Stack.Screen name="Verify" component={VerifyScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />

        {/* Meal */}
        <Stack.Screen name="MealDetail" component={MealDetailScreen} />

        {/* Settings */}
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
        <Stack.Screen name="EditPersonalInfo" component={EditPersonalInfoScreen} />
        <Stack.Screen name="EditAllergens" component={EditAllergensScreen} />
        <Stack.Screen name="Privacy" component={PrivacySecurityScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />

        {/* Legacy / Fallback */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="FoodResult"
          component={FoodResultScreen}
          options={{
            headerShown: true,
            title: '분석 결과',
            headerBackTitle: '돌아가기',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
