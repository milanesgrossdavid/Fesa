import React from 'react';
import { Text, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import InicioScreen from '../screens/InicioScreen';
import FavoritosScreen from '../screens/FavoritosScreen';
import PlaylistScreen from '../screens/PlaylistScreen';
import PistasScreen from '../screens/PistasScreen';
import AlbumesScreen from '../screens/AlbumesScreen';
import ArtistasScreen from '../screens/ArtistasScreen';
import CarpetasScreen from '../screens/CarpetasScreen';
import MiniPlayer from '../components/MiniPlayer';
import { DEFAULT_TABS, TabId, useAppSettings } from '../settings/appSettings';

const Tab = createMaterialTopTabNavigator();
const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  Inicio: InicioScreen,
  Favoritos: FavoritosScreen,
  Playlist: PlaylistScreen,
  Pistas: PistasScreen,
  'Álbumes': AlbumesScreen,
  Artistas: ArtistasScreen,
  Carpetas: CarpetasScreen,
};

const TabNavigator = () => {
  const { theme, tabs } = useAppSettings();
  const visibleTabs = tabs.filter(tab => tab.enabled);
  const fallbackTabs = DEFAULT_TABS.filter(tab => tab.enabled);
  const renderedTabs = visibleTabs.length ? visibleTabs : fallbackTabs;
  const tabsOrderKey = renderedTabs.map(tab => tab.id).join('|');
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

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <NavigationContainer theme={customDarkTheme}>
        <Tab.Navigator
          key={tabsOrderKey}
          screenOptions={{
            animationEnabled: true,
            swipeEnabled: true,
            tabBarScrollEnabled: true,
            tabBarPressColor: 'transparent',
            tabBarItemStyle: { width: 'auto', paddingHorizontal: 4 },
            tabBarContentContainerStyle: { paddingHorizontal: 12 },
            tabBarIndicatorStyle: { height: 0 },
            tabBarLabel: ({ focused, color, children }) => (
              <View
                style={{
                  backgroundColor: 'transparent',
                  borderRadius: 999,
                  paddingHorizontal: focused ? 18 : 12,
                  paddingVertical: 8,
                }}
              >
                <Text
                  style={{
                    color: color,
                    fontSize: focused ? 15 : 13,
                    fontWeight: focused ? '800' : '500',
                    letterSpacing: focused ? 0.6 : 0.2,
                    textTransform: focused ? 'uppercase' : 'capitalize',
                  }}
                >
                  {children}
                </Text>
              </View>
            ),
            tabBarStyle: {
              backgroundColor: theme.background,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
            tabBarActiveTintColor: theme.text,
            tabBarInactiveTintColor: theme.mutedText,
          }}
        >
          {renderedTabs.map(tab => (
            <Tab.Screen key={tab.id} name={tab.id} component={TAB_COMPONENTS[tab.id]} />
          ))}
        </Tab.Navigator>
      </NavigationContainer>
      <MiniPlayer />
    </View>
  );
};

export default TabNavigator;
