import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from './types';
import { COLORS } from '../constants/colors';
import { AppIcon } from '../components/ui/AppIcon';

// Screens
import ScanScreen from '../screens/main/ScanScreen';
import MealScreen from '../screens/main/MealScreen';
import HistoryScreen from '../screens/main/HistoryScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createMaterialTopTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textGray,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarIndicatorStyle: { height: 0 },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarShowIcon: true,
      }}
    >
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: '스캔',
          tabBarIcon: ({ color }) => <AppIcon name="document-scanner" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Meal"
        component={MealScreen}
        options={{
          tabBarLabel: '식단',
          tabBarIcon: ({ color }) => <AppIcon name="restaurant" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: '히스토리',
          tabBarIcon: ({ color }) => <AppIcon name="history" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '프로필',
          tabBarIcon: ({ color }) => <AppIcon name="person" color={color} size={24} />,
        }}
      />
    </Tab.Navigator>
  );
}
