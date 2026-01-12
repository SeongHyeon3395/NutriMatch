import React, { useEffect, useMemo, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { fetchMyAppUser } from '../services/userData';
import { useUserStore } from '../store/userStore';
import { useAppAlert } from '../components/ui/AppAlert';
import { promptEssentialPermissionsOnFirstAuth } from '../services/permissions';
import { SplashOverlay } from '../components/SplashOverlay';

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

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(v => {
      clearTimeout(t);
      resolve(v);
    }).catch(e => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export default function RootNavigator() {
  const setProfile = useUserStore(state => state.setProfile);
  const { alert } = useAppAlert();
  const [booting, setBooting] = useState(true);
  const [pendingReset, setPendingReset] = useState<null | { name: keyof RootStackParamList; params?: any }>(null);
  const navigationRef = useMemo(() => createNavigationContainerRef<RootStackParamList>(), []);
  const [navReady, setNavReady] = useState(false);

  const resetTo = (name: keyof RootStackParamList, params?: any) => {
    if (navigationRef.isReady()) {
      navigationRef.resetRoot({ index: 0, routes: [{ name: name as any, params }] });
      return;
    }
    setPendingReset({ name, params });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!isSupabaseConfigured || !supabase) {
          if (mounted) resetTo('Login');
          return;
        }

        // 세션 복원(필요 시 refresh 시도)
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        let session = data.session;
        if (session) {
          try {
            const refreshed = await withTimeout(supabase.auth.refreshSession(), 1500);
            if (refreshed?.data?.session) session = refreshed.data.session;
          } catch {
            // refresh 실패해도 기존 세션으로 진행
          }
        }
        if (!session) {
          if (mounted) resetTo('Login');
          return;
        }

        // 세션이 있으면(=로그인 상태) 첫 1회 권한 안내
        void promptEssentialPermissionsOnFirstAuth(alert);

        // 세션이 있으면 프로필도 미리 로드
        try {
          const remoteProfile = await withTimeout(fetchMyAppUser(), 1500);
          await setProfile(remoteProfile as any);
          if (mounted) {
            if (remoteProfile?.onboardingCompleted) {
              resetTo('MainTab', { screen: 'Scan' });
            } else {
              resetTo('Onboarding', { initialStep: 1 });
            }
          }
        } catch {
          // 프로필 로드가 실패해도 세션은 살아있으므로 메인으로는 진입
          if (mounted) resetTo('MainTab', { screen: 'Scan' });
        }
      } catch {
        if (mounted) resetTo('Login');
      } finally {
        if (mounted) setBooting(false);
      }
    })();

    const sub = supabase?.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (!session) {
        resetTo('Login');
        return;
      }

      // 로그인 성공 시(세션 생성) 첫 1회 권한 안내
      void promptEssentialPermissionsOnFirstAuth(alert);
      try {
        const remoteProfile = await withTimeout(fetchMyAppUser(), 1500);
        await setProfile(remoteProfile as any);
        if (remoteProfile?.onboardingCompleted) {
          resetTo('MainTab', { screen: 'Scan' });
        } else {
          resetTo('Onboarding', { initialStep: 1 });
        }
      } catch {
        resetTo('MainTab', { screen: 'Scan' });
      }
    });

    return () => {
      mounted = false;
      sub?.data?.subscription?.unsubscribe?.();
    };
  }, [alert, setProfile]);

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          setNavReady(true);
          if (pendingReset) {
            navigationRef.resetRoot({ index: 0, routes: [{ name: pendingReset.name as any, params: pendingReset.params }] });
            setPendingReset(null);
          }
        }}
      >
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

      {(booting || !navReady || pendingReset != null) && <SplashOverlay />}
    </>
  );
}
