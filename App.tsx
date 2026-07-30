import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Header from './src/components/Header';
import TabNavigator from './src/navigation/TabNavigator';
import { useAppSettings } from './src/settings/appSettings';
import "./global.css"

export default function App() {
  const { theme } = useAppSettings();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
        <Header />
        <TabNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
