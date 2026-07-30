import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, Text, TextInput, View } from 'react-native';
import AppSettingsModal from './AppSettingsModal';
import { SearchIcon, SettingsIcon } from '../Icons';
import { getAudioFiles, Song } from '../../modules/local-music';
import { useMusicPlayer } from '../audio/musicPlayer';
import { useAppSettings } from '../settings/appSettings';

const Header = () => {
  const [searchVisible, setSearchVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const { playSong } = useMusicPlayer();
  const { theme } = useAppSettings();

  useEffect(() => {
    if (!searchVisible || songs.length) {
      return;
    }

    getAudioFiles()
      .then(setSongs)
      .catch(error => console.error('Error al cargar música para búsqueda:', error));
  }, [searchVisible, songs.length]);

  const filteredSongs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return songs.filter(song => (
      song.title.toLowerCase().includes(normalizedQuery) ||
      song.artist.toLowerCase().includes(normalizedQuery) ||
      song.album.toLowerCase().includes(normalizedQuery)
    ));
  }, [query, songs]);

  const closeSearch = () => {
    setSearchVisible(false);
    setQuery('');
  };

  const playSearchResult = (index: number) => {
    void playSong(filteredSongs, index);
    closeSearch();
  };

  return (
    <View className="justify-between px-5 py-4 flex-row" style={{ backgroundColor: theme.background }}>
      <Text className="text-[32px] font-bold tracking-[1.5px]" style={{ color: theme.text }}>FESA</Text>
      <View className="flex-row items-center gap-2">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full" onPress={() => setSearchVisible(true)}>
          <SearchIcon size={24} color={theme.text} />
        </Pressable>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full" onPress={() => setSettingsVisible(true)}>
          <SettingsIcon size={24} color={theme.text} />
        </Pressable>
      </View>

      <Modal visible={searchVisible} animationType="fade" presentationStyle="fullScreen" onRequestClose={closeSearch}>
        <View className="flex-1 px-5 pt-12" style={{ backgroundColor: theme.background }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-2xl font-bold" style={{ color: theme.text }}>Buscar</Text>
            <Pressable onPress={closeSearch}>
              <Text className="text-base font-bold" style={{ color: theme.accent }}>Cerrar</Text>
            </Pressable>
          </View>

          <TextInput
            autoFocus
            className="mb-4 rounded-2xl px-4 py-3 text-base"
            style={{ backgroundColor: theme.surface, color: theme.text }}
            cursorColor={theme.accent}
            placeholder="Canción, artista o álbum"
            placeholderTextColor={theme.mutedText}
            value={query}
            onChangeText={setQuery}
          />

          <FlatList
            data={filteredSongs}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={query.trim() ? <Text className="py-8 text-center" style={{ color: theme.mutedText }}>No se encontraron resultados.</Text> : null}
            renderItem={({ item, index }) => (
              <Pressable className="mb-3 flex-row items-center rounded-2xl px-3 py-3" style={{ backgroundColor: theme.surface }} onPress={() => playSearchResult(index)}>
                <View className="mr-3 h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[#333333]">
                  {item.artwork ? <Image source={{ uri: item.artwork }} className="h-full w-full" resizeMode="cover" /> : <Text className="text-2xl" style={{ color: theme.accent }}>♪</Text>}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold" style={{ color: theme.text }} numberOfLines={1}>{item.title}</Text>
                  <Text className="mt-1 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>{item.artist || 'Artista Desconocido'} • {item.album || 'Álbum Desconocido'}</Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      <AppSettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </View>
  );
};

export default Header;
