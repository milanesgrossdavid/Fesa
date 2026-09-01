import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppSettingsModal from './AppSettingsModal';
import LibraryArtwork from './LibraryArtwork';
import { SearchIcon, SettingsIcon } from '../Icons';
import { getAudioFilesWithPermission, Song } from '../../modules/local-music';
import { useMusicPlayer } from '../audio/musicPlayer';
import { getTranslation } from '../i18n/translations';
import { useAppSettings } from '../settings/appSettings';
import { Ionicons } from '@expo/vector-icons';

const Header = () => {
  const insets = useSafeAreaInsets();
  const [searchVisible, setSearchVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const { playSong, requestShowPlayer } = useMusicPlayer();
  const { theme, language } = useAppSettings();

  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);

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
    <View
      className="flex-row items-center justify-between px-4 py-2"
      style={{ backgroundColor: theme.background }}
    >
      <View style={{ height: 52, justifyContent: 'center' }}>
        <Text style={{ color: theme.text, fontSize: 34, fontWeight: '700' }}>FESA</Text>
      </View>
      <View className="flex-row items-center">
        <Pressable
          className="h-11 w-11 items-center justify-center rounded-full"
          style={({ pressed }) => ({ backgroundColor: pressed ? theme.surface : 'transparent' })}
          onPress={() => setSearchVisible(true)}
          accessibilityLabel={t('search_open_label', 'Search')}
        >
          <SearchIcon size={22} color={theme.text} />
        </Pressable>
        <Pressable
          className="h-11 w-11 items-center justify-center rounded-full"
          style={({ pressed }) => ({ backgroundColor: pressed ? theme.surface : 'transparent' })}
          onPress={() => setSettingsVisible(true)}
          accessibilityLabel={t('settings', 'Settings')}
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
          <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
                    <View className="flex-row items-center" style={{ height: 44 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('close', 'Close')}
              style={({ pressed }) => ({
                height: 32,
                minWidth: 32,
                paddingHorizontal: 4,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.5 : 1,
              })}
              onPress={closeSearch}
            >
              <Ionicons name="chevron-back" size={26} color={theme.accent} />
              
            </Pressable>
            <Text
              style={{
              color: theme.text,
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: 0.37,
              paddingHorizontal: 4,
            }}
            >
              {t('search_modal_title', 'Search')}
            </Text>
          </View>
                    
                  </View>

          <View className="mb-4 px-4">
            <View
              className="flex-row items-center rounded-xl px-3"
              style={{ backgroundColor: theme.surface, height: 44 }}
            >
              <SearchIcon size={20} color={theme.mutedText} />
              <TextInput
                autoFocus
                className="ml-2 flex-1 text-base"
                style={{ color: theme.text, height: '100%' }}
                cursorColor={theme.accent}
                placeholder={t('search_placeholder', 'Song, artist or album')}
                placeholderTextColor={theme.mutedText}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            {query.trim() ? (
              <Text className="mt-3 text-xs font-bold uppercase tracking-[1.2px]" style={{ color: theme.mutedText }}>
                {filteredSongs.length}{' '}
                {filteredSongs.length === 1
                  ? t('search_result_single', 'result')
                  : t('search_result_plural', 'results')}
              </Text>
            ) : null}
          </View>

          <FlatList
            data={filteredSongs}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            ListEmptyComponent={
              <View className="items-center justify-center pt-4 text-center">
                {query.trim() ? (
                  <>
                    <SearchIcon size={48} color={theme.mutedText} style={{ opacity: 0.5, marginBottom: 16 }} />
                    <Text className="text-xl font-bold" style={{ color: theme.text }}>
                      {t('search_no_results_title', 'No results')}
                    </Text>
                    <Text className="mt-2 max-w-[80%] text-center" style={{ color: theme.mutedText, fontSize: 15, lineHeight: 22 }}>
                      {t('search_no_results_description', 'No matches found for')} “{query.trim()}”.
                    </Text>
                  </>
                ) : (
                  <>
                    <SearchIcon size={48} color={theme.mutedText} style={{ opacity: 0.5, marginBottom: 16 }} />
                    <Text className="text-xl font-bold" style={{ color: theme.text }}>
                      {t('search_empty_title', 'Search your music')}
                    </Text>
                    <Text className="mt-2 max-w-[80%] text-center" style={{ color: theme.mutedText, fontSize: 15, lineHeight: 22 }}>
                      {t('search_empty_description', 'Find songs, artists and albums from your local library.')}
                    </Text>
                  </>
                )}
              </View>
            }
            renderItem={({ item, index }) => (
              <Pressable
                className="flex-row items-center"
                style={{ paddingVertical: 6 }}
                onPress={() => playSearchResult(index)}
              >
                <LibraryArtwork
                  artwork={item.artwork}
                  className="mr-3 h-12 w-12 rounded-lg"
                  fallbackTextClassName="text-xl text-white"
                />
                <View className="flex-1 border-b-[0.5px] py-2" style={{ borderBottomColor: theme.border, minHeight: 52, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 17, color: theme.text }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.mutedText, marginTop: 2 }} numberOfLines={1}>
                    {item.artist || t('unknown_artist', 'Unknown Artist')} • {item.album || t('unknown_album', 'Unknown Album')}
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
