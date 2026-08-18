import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppSettingsModal from './AppSettingsModal';
import LibraryArtwork from './LibraryArtwork';
import { BackIcon, SearchIcon, SettingsIcon } from '../Icons';
import { getAudioFilesWithPermission, Song } from '../../modules/local-music';
import { useMusicPlayer } from '../audio/musicPlayer';
import { useAppSettings } from '../settings/appSettings';

const Header = () => {
  const insets = useSafeAreaInsets();
  const [searchVisible, setSearchVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const { playSong, requestShowPlayer } = useMusicPlayer();
  const { theme } = useAppSettings();

  useEffect(() => {
    if (!searchVisible || songs.length) {
      return;
    }

    getAudioFilesWithPermission()
      .then(setSongs)
      .catch(error => console.error('Error al cargar música para búsqueda:', error));
  }, [searchVisible, songs.length]);

  const levenshteinDistance = (a: string, b: string) => {
    const aLength = a.length;
    const bLength = b.length;

    if (aLength === 0) return bLength;
    if (bLength === 0) return aLength;

    const matrix: number[][] = Array.from({ length: aLength + 1 }, (_, row) =>
      Array.from({ length: bLength + 1 }, (_, col) => (row === 0 ? col : col === 0 ? row : 0))
    );

    for (let i = 1; i <= aLength; i += 1) {
      for (let j = 1; j <= bLength; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[aLength][bLength];
  };

  const computeFieldScore = (queryText: string, fieldText: string) => {
    if (!fieldText) {
      return Number.MAX_SAFE_INTEGER;
    }

    if (fieldText.includes(queryText)) {
      return 0;
    }

    const words = fieldText.split(/[^a-z0-9]+/).filter(Boolean);
    const candidates = [fieldText, ...words];

    return Math.min(...candidates.map(candidate => levenshteinDistance(queryText, candidate)));
  };

  const filteredSongs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    const maxDistance = Math.max(2, Math.round(normalizedQuery.length * 0.5));

    return songs
      .map(song => {
        const title = song.title.toLowerCase();
        const artist = song.artist.toLowerCase();
        const album = song.album.toLowerCase();

        const score = Math.min(
          computeFieldScore(normalizedQuery, title),
          computeFieldScore(normalizedQuery, artist),
          computeFieldScore(normalizedQuery, album),
        );

        return { song, score };
      })
      .filter(({ score }) => score <= maxDistance)
      .sort((a, b) => a.score - b.score || a.song.title.localeCompare(b.song.title))
      .map(({ song }) => song);
  }, [query, songs]);

  const closeSearch = () => {
    setSearchVisible(false);
    setQuery('');
  };

  const playSearchResult = async (index: number) => {
    await playSong(filteredSongs, index);
    requestShowPlayer();
    closeSearch();
  };

  return (
    <View className="flex-row items-center justify-between px-5 py-4" style={{ backgroundColor: theme.background }}>
      <Text className="text-[32px] font-bold tracking-[1.5px]" style={{ color: theme.text }}>FESA</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.surface }}
          onPress={() => setSearchVisible(true)}
        >
          <SearchIcon size={22} color={theme.text} />
        </Pressable>
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.surface }}
          onPress={() => setSettingsVisible(true)}
        >
          <SettingsIcon size={22} color={theme.text} />
        </Pressable>
      </View>

      <Modal visible={searchVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeSearch}>
        <View
          className="flex-1"
          style={{
            backgroundColor: theme.background,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: insets.bottom,
          }}
        >
          <View className="mb-3 flex-row items-center px-4 py-2">
            <Pressable
              className="mr-2 h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.surface }}
              onPress={closeSearch}
            >
              <BackIcon size={22} color={theme.text} />
            </Pressable>
            <Text className="text-2xl font-bold" style={{ color: theme.text }}>Buscar</Text>
          </View>

          <View className="mb-4 px-5">
            <View
              className="flex-row items-center rounded-3xl px-4"
              style={{ backgroundColor: theme.surface }}
            >
              <SearchIcon size={18} color={theme.mutedText} />
              <TextInput
                autoFocus
                className="ml-3 flex-1 py-3.5 text-base font-bold"
                style={{ color: theme.text }}
                cursorColor={theme.text}
                placeholder="Canción, artista o álbum"
                placeholderTextColor={theme.mutedText}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            {query.trim() ? (
              <Text className="mt-3 text-xs font-bold uppercase tracking-[1.2px]" style={{ color: theme.mutedText }}>
                {filteredSongs.length} {filteredSongs.length === 1 ? 'resultado' : 'resultados'}
              </Text>
            ) : (
              <Text className="mt-3 text-sm" style={{ color: theme.mutedText }}>
                Escribe para buscar en tu biblioteca local.
              </Text>
            )}
          </View>

          <FlatList
            data={filteredSongs}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            ListEmptyComponent={
              query.trim() ? (
                <View
                  className="mt-6 items-center rounded-3xl px-5 py-10"
                  style={{ backgroundColor: theme.surface }}
                >
                  <Text className="text-base font-bold" style={{ color: theme.text }}>
                    Sin resultados
                  </Text>
                  <Text className="mt-2 text-center text-sm" style={{ color: theme.mutedText }}>
                    No encontramos coincidencias para “{query.trim()}”.
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item, index }) => (
              <Pressable
                className="mb-2 flex-row items-center rounded-3xl px-3 py-3"
                style={{ backgroundColor: theme.surface }}
                onPress={() => playSearchResult(index)}
              >
                <LibraryArtwork
                  artwork={item.artwork}
                  className="mr-3 h-12 w-12 rounded-xl"
                  fallbackTextClassName="text-xl text-white"
                />
                <View className="flex-1">
                  <Text className="text-base font-bold" style={{ color: theme.text }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="mt-1 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
                    {item.artist || 'Artista Desconocido'} • {item.album || 'Álbum Desconocido'}
                  </Text>
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
