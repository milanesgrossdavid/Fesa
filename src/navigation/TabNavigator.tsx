import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import PistasScreen from '../screens/PistasScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';

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
        <Tab.Screen name="Inicio" children={() => <PlaceholderScreen name="Inicio" />} />
        <Tab.Screen name="Favoritos" children={() => <PlaceholderScreen name="Favoritos" />} />
        <Tab.Screen name="Playlist" children={() => <PlaceholderScreen name="Playlist" />} />
        <Tab.Screen name="Pistas" component={PistasScreen} />
        <Tab.Screen name="Álbumes" children={() => <PlaceholderScreen name="Álbumes" />} />
        <Tab.Screen name="Artistas" children={() => <PlaceholderScreen name="Artistas" />} />
        <Tab.Screen name="Carpetas" children={() => <PlaceholderScreen name="Carpetas" />} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default TabNavigator;