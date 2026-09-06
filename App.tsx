import React, { useEffect, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Text as RNText } from 'react-native';
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

export const SF_PRO_FONT_FAMILY = 'SF Pro Text';
export const FESA_LOCK_DATE_FONT_FAMILY = 'Fesa-LockDate';

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
      [SF_PRO_FONT_FAMILY]: require('./assets/fonts/SFNSText-Regular.otf'),
      [FESA_LOCK_DATE_FONT_FAMILY]: require('./assets/fonts/SFNSText-Regular.otf'),
    }).then(() => {
      if (cancelled) return;
      const textComponent = RNText as unknown as {
        defaultProps?: { style?: unknown };
      };
      textComponent.defaultProps = textComponent.defaultProps || {};
      textComponent.defaultProps.style = [
        textComponent.defaultProps.style,
        { fontFamily: SF_PRO_FONT_FAMILY },
      ];
      setFontsReady(true);
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
