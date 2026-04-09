import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from './types';
import { AppIcon } from '../components/ui/AppIcon';
import { MAIN_SHORTCUT_BAR_BOTTOM_PADDING, MAIN_SHORTCUT_BAR_HEIGHT, MAIN_SHORTCUT_BAR_TOP_PADDING } from '../components/ui/MainShortcutBar';
import { useTheme } from '../theme/ThemeProvider';

// Screens
import ScanScreen from '../screens/main/ScanScreen';
import MealScreen from '../screens/main/MealScreen';
import CommunityScreen from '../screens/main/CommunityScreen';
import CalendarScreen from '../screens/main/CalendarScreen.tsx';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textGray,
        sceneStyle: {
          backgroundColor: colors.backgroundGray,
        },
        tabBarStyle: {
          backgroundColor: colors.backgroundGray,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          height: MAIN_SHORTCUT_BAR_HEIGHT + insets.bottom,
          paddingTop: MAIN_SHORTCUT_BAR_TOP_PADDING,
          paddingBottom: MAIN_SHORTCUT_BAR_BOTTOM_PADDING + insets.bottom,
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: '스캔',
          tabBarStyle: {
            backgroundColor: colors.backgroundGray,
            borderTopWidth: 0,
            borderTopColor: 'transparent',
            height: MAIN_SHORTCUT_BAR_HEIGHT + insets.bottom,
            paddingTop: MAIN_SHORTCUT_BAR_TOP_PADDING,
            paddingBottom: MAIN_SHORTCUT_BAR_BOTTOM_PADDING + insets.bottom,
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
          },
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
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarLabel: '피드',
          tabBarIcon: ({ color }) => <AppIcon name="forum" color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: '캘린더',
          tabBarIcon: ({ color }) => <AppIcon name="calendar-today" color={color} size={24} />,
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
