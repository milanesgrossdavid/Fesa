import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { enableFreeze, enableScreens } from 'react-native-screens';
import InicioScreen from '../screens/InicioScreen';
import FavoritosScreen from '../screens/FavoritosScreen';
import PlaylistScreen from '../screens/PlaylistScreen';
import PistasScreen from '../screens/PistasScreen';
import AlbumesScreen from '../screens/AlbumesScreen';
import ArtistasScreen from '../screens/ArtistasScreen';
import CarpetasScreen from '../screens/CarpetasScreen';
import MiniPlayer from '../components/MiniPlayer';
import { getTranslation } from '../i18n/translations';
import { DEFAULT_TABS, TabId, useAppSettingsLanguage, useAppSettingsTabs, useAppSettingsTheme } from '../settings/appSettings';

enableScreens(true);
enableFreeze(true);

const Tab = createMaterialTopTabNavigator();
const LAST_LIBRARY_TAB_KEY = '@fesa:lastLibraryTab';
const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  Inicio: InicioScreen,
  Favoritos: FavoritosScreen,
  Playlist: PlaylistScreen,
  Pistas: PistasScreen,
  'Álbumes': AlbumesScreen,
  Artistas: ArtistasScreen,
  Carpetas: CarpetasScreen,
};

const isTabId = (value: string | undefined): value is TabId =>
  Boolean(value && Object.prototype.hasOwnProperty.call(TAB_COMPONENTS, value));

const getTabLabel = (tabId: TabId, languageId: string) => {
  const translationKeyByTab: Record<TabId, string> = {
    Inicio: 'tab_home',
    Favoritos: 'tab_favorites',
    Playlist: 'tab_playlist',
    Pistas: 'tab_tracks',
    'Álbumes': 'tab_albums',
    Artistas: 'tab_artists',
    Carpetas: 'tab_folders',
  };

  return getTranslation(languageId as any, translationKeyByTab[tabId], tabId);
};

const TabNavigator = () => {
  const theme = useAppSettingsTheme();
  const tabs = useAppSettingsTabs();
  const language = useAppSettingsLanguage();
  const [lastTabLoaded, setLastTabLoaded] = useState(false);
  const [lastTab, setLastTab] = useState<TabId | null>(null);
  const visibleTabs = useMemo(() => tabs.filter(tab => tab.enabled), [tabs]);
  const fallbackTabs = useMemo(() => DEFAULT_TABS.filter(tab => tab.enabled), []);
  const renderedTabs = visibleTabs.length ? visibleTabs : fallbackTabs;
  const initialRouteName = useMemo(() => {
    const fallback = renderedTabs[0]?.id ?? 'Inicio';
    return lastTab && renderedTabs.some(tab => tab.id === lastTab) ? lastTab : fallback;
  }, [lastTab, renderedTabs]);
  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(LAST_LIBRARY_TAB_KEY)
      .then(value => {
        if (mounted && isTabId(value ?? undefined)) {
          setLastTab((value ?? null) as TabId | null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLastTabLoaded(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.border,
      primary: theme.accent,
    },
  };

  if (!lastTabLoaded) {
    return <View className="flex-1" style={{ backgroundColor: theme.background }} />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <NavigationContainer
        theme={customDarkTheme}
        onStateChange={state => {
          const routeName = state?.routes[state.index]?.name;
          if (isTabId(routeName)) {
            setLastTab(routeName as TabId | null);
            void AsyncStorage.setItem(LAST_LIBRARY_TAB_KEY, routeName);
          }
        }}
      >
        <Tab.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{
            animationEnabled: true,
            swipeEnabled: true,
            tabBarScrollEnabled: true,
            tabBarPressColor: 'transparent',
            tabBarItemStyle: {
              width: 'auto',
              minHeight: 48,
              paddingHorizontal: 4,
              paddingVertical: 4,
            },
            tabBarContentContainerStyle: {
              paddingHorizontal: 12,
              alignItems: 'center',
            },
            tabBarIndicatorStyle: { height: 0 },
            tabBarLabel: ({ focused, color, children }) => (
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: focused ? theme.surface : 'transparent',
                  borderColor: focused ? theme.border : 'transparent',
                  borderRadius: 12,
                  borderWidth: focused ? 1 : 0,
                  minWidth: 72,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  shadowColor: '#000',
                  shadowOpacity: focused ? 0.08 : 0,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: focused ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    color: color,
                    fontSize: 14,
                    fontWeight: focused ? '700' : '500',
                    letterSpacing: 0.1,
                  }}
                >
                  {children}
                </Text>
              </View>
            ),
            tabBarStyle: {
              backgroundColor: theme.background,
              borderTopColor: 'transparent',
              elevation: 2,
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
            },
            tabBarActiveTintColor: theme.text,
            tabBarInactiveTintColor: theme.mutedText,
            // Avoid forcing a remount when the visible-tabs list reorders:
            // change of order no longer wipes the scroll/state of each tab.
            lazy: true,
            // react-native-screens freezeOnBlur is enabled globally via
            // `enableFreeze(true)`; the per-screen prop isn't accepted on
            // Material Top Tabs options, but the global freeze still
            // suspends off-screen tabs.
          }}
        >
          {renderedTabs.map(tab => (
            <Tab.Screen
              key={tab.id}
              name={tab.id}
              component={TAB_COMPONENTS[tab.id]}
              options={{ title: getTabLabel(tab.id, language.id) }}
            />
          ))}
        </Tab.Navigator>
      </NavigationContainer>
      <MiniPlayer />
    </View>
  );
};

export default TabNavigator;
