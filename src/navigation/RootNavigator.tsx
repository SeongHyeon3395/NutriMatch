import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import MainTabNavigator from './MainTabNavigator';
import VerifyScreen from '../screens/scan/VerifyScreen';
import ResultScreen from '../screens/scan/ResultScreen';
import HomeScreen from '../screens/home/HomeScreen'; // Keep for legacy if needed, or remove
import FoodResultScreen from '../screens/home/FoodResultScreen';
import PrivacySecurityScreen from '../screens/main/PrivacySecurityScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="MainTab" component={MainTabNavigator} />
        
        {/* Scan Flow */}
        <Stack.Screen name="Verify" component={VerifyScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />

        {/* Settings */}
        <Stack.Screen name="Privacy" component={PrivacySecurityScreen} />

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
