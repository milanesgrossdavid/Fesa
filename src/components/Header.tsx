import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppSettingsModal from './AppSettingsModal';
import LibraryArtwork from './LibraryArtwork';
import { SearchIcon, SettingsIcon } from '../Icons';
import { getAudioFilesWithPermission, Song } from '../../modules/local-music';
import { useMusicPlayerUi } from '../audio/musicPlayer';
import { getTranslation } from '../i18n/translations';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import { Ionicons } from '@expo/vector-icons';

const Header = () => {
  const insets = useSafeAreaInsets();
  const [searchVisible, setSearchVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [query, setQuery] = useState('');
  // Debounced query prevents running O(n*m) Levenshtein over the whole
  // library on every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const { playSong, requestShowPlayer } = useMusicPlayerUi();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();

  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!searchVisible || songs.length) {
      return;
    }

    getAudioFilesWithPermission()
      .then(setSongs)
      .catch(error => console.error('Error al cargar música para búsqueda:', error));
  }, [searchVisible, songs.length]);

  // Precompute a lowercase haystack per song once when the library loads.
  // Scoring then uses cheap prefix / substring matches — orders of magnitude
  // faster than per-keystroke Levenshtein over the whole library.
  const searchIndex = useMemo(() => {
    const termsBySong = new Map<string, { titlePrefix: string; titleContains: string; titleWords: string[]; artistPrefix: string; artistContains: string; albumPrefix: string; albumContains: string; }>();
    for (const song of songs) {
      const title = (song.title || '').toLowerCase();
      const artist = (song.artist || '').toLowerCase();
      const album = (song.album || '').toLowerCase();
      const titleWords = title.split(/[^a-z0-9]+/).filter(Boolean);
      termsBySong.set(song.id, {
        titlePrefix: title,
        titleContains: title,
        titleWords,
        artistPrefix: artist,
        artistContains: artist,
        albumPrefix: album,
        albumContains: album,
      });
    }
    return termsBySong;
  }, [songs]);

  const scoreSong = (song: Song, term: string) => {
    const entry = searchIndex.get(song.id);
    if (!entry) return Number.MAX_SAFE_INTEGER;

    // Best score = lowest number. Order: exact prefix < contains < word match.
    if (entry.titlePrefix.startsWith(term) || entry.artistPrefix.startsWith(term) || entry.albumPrefix.startsWith(term)) {
      return 0;
    }
    if (entry.titleContains.includes(term) || entry.artistContains.includes(term) || entry.albumContains.includes(term)) {
      return 1;
    }
    if (entry.titleWords.some(w => w.startsWith(term))) return 2;
    return Number.MAX_SAFE_INTEGER;
  };

  const filteredSongs = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();

    if (!term) {
      return [];
    }

    return songs
      .map(song => ({ song, score: scoreSong(song, term) }))
      .filter(({ score }) => score !== Number.MAX_SAFE_INTEGER)
      .sort((a, b) => a.score - b.score || a.song.title.localeCompare(b.song.title))
      .map(({ song }) => song)
      .slice(0, 200);
  }, [debouncedQuery, searchIndex, songs]);

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
      style={{
        backgroundColor: theme.background,
        paddingTop: Math.max(insets.top, 8),
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ height: 48, justifyContent: 'center' }}>
        <Text style={{ color: theme.text, fontSize: 30, fontWeight: '700', letterSpacing: 0.2 }}>FESA</Text>
      </View>
      <View className="flex-row items-center">
        <Pressable
          className="mr-1 h-11 w-11 items-center justify-center rounded-xl"
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.surface : 'transparent',
            opacity: pressed ? 0.7 : 1,
          })}
          onPress={() => setSearchVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('search_open_label', 'Search')}
        >
          <SearchIcon size={22} color={theme.text} />
        </Pressable>
        <Pressable
          className="h-11 w-11 items-center justify-center rounded-xl"
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.surface : 'transparent',
            opacity: pressed ? 0.7 : 1,
          })}
          onPress={() => setSettingsVisible(true)}
          accessibilityRole="button"
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
          <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
            <View className="flex-row items-center" style={{ height: 48 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('close', 'Close')}
                style={({ pressed }) => ({
                  height: 40,
                  minWidth: 40,
                  paddingHorizontal: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.5 : 1,
                  borderRadius: 10,
                  backgroundColor: pressed ? theme.surface : 'transparent',
                })}
                onPress={closeSearch}
              >
                <Ionicons name="chevron-back" size={26} color={theme.accent} />
              </Pressable>
              <View className="flex-1 flex-row items-center rounded-[14px] px-3" style={{ height: 44 }}>
                <View className="mr-2 h-7 w-7 items-center justify-center rounded-[9px]" style={{ backgroundColor: `${theme.accent}18` }}>
                  <SearchIcon size={16} color={theme.accent} />
                </View>
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.text }}
                >
                  {t('search_modal_title', 'Search')}
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-4 px-4">
            <View
              className="flex-row items-center rounded-[16px] border px-3"
              style={{ backgroundColor: theme.surface, borderColor: theme.border, height: 50 }}
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
                className="mx-1 flex-row items-center px-3 py-2"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? theme.background : theme.surface,
                  borderColor: theme.border,
                  marginBottom: 4,
                  opacity: pressed ? 0.72 : 1,
                })}
                onPress={() => playSearchResult(index)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.artist || t('unknown_artist', 'Unknown Artist')}`}
              >
                <LibraryArtwork
                  artwork={item.artwork}
                  className="mr-3 h-12 w-12 rounded-lg"
                  fallbackTextClassName="text-xl text-white"
                />
                <View className="flex-1 py-2" style={{ minHeight: 52, justifyContent: 'center' }}>
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
