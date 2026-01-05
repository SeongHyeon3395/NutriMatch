import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import RootNavigator from './src/navigation/RootNavigator';
import { COLORS } from './src/constants/colors';
import { AppAlertProvider } from './src/components/ui/AppAlert';

enableScreens(true);

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <AppAlertProvider>
        <RootNavigator />
      </AppAlertProvider>
    </SafeAreaProvider>
  );
}