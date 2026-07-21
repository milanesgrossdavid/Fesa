import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Header from './src/components/Header';
import TabNavigator from './src/navigation/TabNavigator';
import "./global.css"

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1d1d1f' }} edges={['top']}>
        <Header />
        <TabNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}