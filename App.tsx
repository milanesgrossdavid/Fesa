import React, { useEffect, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  Octicons,
} from '@expo/vector-icons';
import Header from './src/components/Header';
import TabNavigator from './src/navigation/TabNavigator';
import { useAppSettingsTheme } from './src/settings/appSettings';
import "./global.css"

const ICON_FONT_FAMILIES = [
  Ionicons.font,
  MaterialCommunityIcons.font,
  FontAwesome5.font,
  Octicons.font,
].filter(Boolean);

export default function App() {
  const theme = useAppSettingsTheme();
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    // Preload all icon font files so the first time each family is rendered
    // (typically inside a Modal) we don't pay the expo-font decode cost on
    // the JS thread. This eliminates the "icons load late on first open"
    // jank that compounds with modal animations.
    let cancelled = false;
    const fontMap: Record<string, number> = {};
    for (const family of ICON_FONT_FAMILIES) {
      Object.assign(fontMap, family);
    }
    Font.loadAsync({
      ...fontMap,
      'Fesa-LockDate': require('./assets/fonts/SFNSText-Regular.otf'),
    }).then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
        {fontsReady ? (
          <>
            <Header />
            <TabNavigator />
          </>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
