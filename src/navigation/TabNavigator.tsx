import React from 'react';
import { View } from 'react-native';
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

const Tab = createMaterialTopTabNavigator();

const TabNavigator = () => {
  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#1d1d1f',
      card: '#1d1d1f',
      text: '#ffffff',
      border: '#333333',
    },
  };

  return (
    <View className="flex-1 bg-[#1d1d1f]">
      <NavigationContainer theme={customDarkTheme}>
        <Tab.Navigator
          screenOptions={{
          tabBarScrollEnabled: true,
          tabBarItemStyle: { width: 'auto', paddingHorizontal: 18 },
          tabBarIndicatorStyle: { backgroundColor: '#FFFFFF', height: 3, borderRadius: 3 },
          tabBarLabelStyle: { 
            fontWeight: 'bold', 
            textTransform: 'capitalize', 
            fontSize: 14
          },
          tabBarStyle: { 
            backgroundColor: '#1d1d1f',
            elevation: 0, 
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#333333'
          },
            tabBarActiveTintColor: '#FFFFFF',
            tabBarInactiveTintColor: '#707070',
          }}
        >
          <Tab.Screen name="Inicio" component={InicioScreen} />
          <Tab.Screen name="Favoritos" component={FavoritosScreen} />
          <Tab.Screen name="Playlist" component={PlaylistScreen} />
          <Tab.Screen name="Pistas" component={PistasScreen} />
          <Tab.Screen name="Álbumes" component={AlbumesScreen} />
          <Tab.Screen name="Artistas" component={ArtistasScreen} />
          <Tab.Screen name="Carpetas" component={CarpetasScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      <MiniPlayer />
    </View>
  );
};

export default TabNavigator;