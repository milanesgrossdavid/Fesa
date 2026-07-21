import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, PermissionsAndroid, Platform, ActivityIndicator } from 'react-native';
import { getAudioFiles, Song } from '../../modules/local-music';
import SongListItem from '../components/SongListItem';
import { useMusicPlayer } from '../audio/musicPlayer';

const PistasScreen = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { currentSong, playing, playSong, togglePlayPause } = useMusicPlayer();

  useEffect(() => {
    const requestPermissionsAndLoadMusic = async () => {
      try {
        let granted = false;
        if (Platform.OS === 'android') {
          const permission = Platform.Version >= 33 
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO 
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

          const result = await PermissionsAndroid.request(permission);
          granted = result === PermissionsAndroid.RESULTS.GRANTED;
        } else {
            granted = true; // Para otras plataformas como iOS
        }

        if (granted) {
          setPermissionGranted(true);
          const music = await getAudioFiles();
          setSongs(music);
        }
      } catch (err) {
        console.error("Error al obtener música:", err);
      } finally {
        setLoading(false);
      }
    };

    requestPermissionsAndLoadMusic();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#1d1d1f]">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View className="flex-1 justify-center items-center bg-[#1d1d1f]">
        <Text className="text-[#b64400] text-center p-5 text-base">Se requieren permisos para leer tu música.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#1d1d1f]">
      <FlatList
        data={songs}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item, index }) => {
          const isActive = currentSong?.id === item.id;

          return (
            <SongListItem
              item={item}
              isActive={isActive}
              isPlaying={isActive && playing}
              onPress={() => playSong(songs, index)}
              onTogglePlayPause={togglePlayPause}
            />
          );
        }}
      />
    </View>
  );
};

export default PistasScreen;