import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SearchIcon, SettingsIcon } from '../Icons';
import { getAudioFiles, Song } from '../../modules/local-music';
import { useMusicPlayer } from '../audio/musicPlayer';

const SETTINGS_SECTIONS = [
  {
    title: 'Reproducción',
    items: ['Temporizador de apagado', 'Velocidad de reproducción', 'Transición gradual entre canciones (crossfade)', 'Omitir silencio entre canciones'],
  },
  {
    title: 'Control y navegación',
    items: ['Controlar música desde bloqueo', 'Administrar pestañas: eliminar y ordenar'],
  },
  {
    title: 'Apariencia',
    items: ['Temas de personalización'],
  },
  {
    title: 'Privacidad y soporte',
    items: ['Permisos', 'Términos y condiciones', 'Contacto'],
  },
];

const Header = () => {
  const [searchVisible, setSearchVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const { playSong } = useMusicPlayer();

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
    <View className="bg-[#1d1d1f] px-5 py-4 justify-between flex-row">
      <Text className="text-[32px] font-bold text-white tracking-[1.5px]">FESA</Text>
      <View className="flex-row items-center gap-2">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full" onPress={() => setSearchVisible(true)}>
          <SearchIcon size={24} color="white" />
        </Pressable>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full" onPress={() => setSettingsVisible(true)}>
          <SettingsIcon size={24} color="white" />
        </Pressable>
      </View>

      <Modal visible={searchVisible} animationType="fade" presentationStyle="fullScreen" onRequestClose={closeSearch}>
        <View className="flex-1 bg-[#1d1d1f] px-5 pt-12">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-white">Buscar</Text>
            <Pressable onPress={closeSearch}>
              <Text className="text-base font-bold text-[#b64400]">Cerrar</Text>
            </Pressable>
          </View>

          <TextInput
            autoFocus
            className="mb-4 rounded-2xl bg-[#252525] px-4 py-3 text-base text-white"
            cursorColor="#b64400"
            placeholder="Canción, artista o álbum"
            placeholderTextColor="#707070"
            value={query}
            onChangeText={setQuery}
          />

          <FlatList
            data={filteredSongs}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={query.trim() ? <Text className="py-8 text-center text-[#707070]">No se encontraron resultados.</Text> : null}
            renderItem={({ item, index }) => (
              <Pressable className="mb-3 flex-row items-center rounded-2xl bg-[#252525] px-3 py-3" onPress={() => playSearchResult(index)}>
                <View className="mr-3 h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[#333333]">
                  {item.artwork ? <Image source={{ uri: item.artwork }} className="h-full w-full" resizeMode="cover" /> : <Text className="text-2xl text-[#b64400]">♪</Text>}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-white" numberOfLines={1}>{item.title}</Text>
                  <Text className="mt-1 text-sm text-[#707070]" numberOfLines={1}>{item.artist || 'Artista Desconocido'} • {item.album || 'Álbum Desconocido'}</Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      <Modal visible={settingsVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSettingsVisible(false)}>
        <View className="flex-1 bg-[#1d1d1f] px-5 pt-12">
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-white">Ajustes</Text>
            <Pressable onPress={() => setSettingsVisible(false)}>
              <Text className="text-base font-bold text-[#b64400]">Cerrar</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            {SETTINGS_SECTIONS.map(section => (
              <View key={section.title} className="mb-6">
                <Text className="mb-3 text-sm font-bold uppercase tracking-[1px] text-[#707070]">{section.title}</Text>
                <View className="overflow-hidden rounded-2xl bg-[#252525]">
                  {section.items.map(item => (
                    <Pressable key={item} className="border-b border-[#333333] px-4 py-4">
                      <Text className="text-base font-bold text-white">{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default Header;