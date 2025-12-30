import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { COLORS } from './src/constants/colors';
import { AppAlertProvider } from './src/components/ui/AppAlert';

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