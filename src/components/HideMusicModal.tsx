import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Song } from '../../modules/local-music';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import { getTranslation } from '../i18n/translations';
import LibraryArtwork from './LibraryArtwork';

interface HideMusicModalProps {
  visible: boolean;
  songs: Song[];
  hiddenSongIds: string[];
  onClose: () => void;
  onToggleHidden: (songId: string) => void;
}

const HideMusicModal = ({ visible, songs, hiddenSongIds, onClose, onToggleHidden }: HideMusicModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const hiddenSongIdSet = useMemo(() => new Set(hiddenSongIds), [hiddenSongIds]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  const sortedSongs = useMemo(() => [...songs].sort((a, b) => {
    const aHidden = hiddenSongIdSet.has(a.id);
    const bHidden = hiddenSongIdSet.has(b.id);

    if (aHidden !== bHidden) {
      return aHidden ? -1 : 1;
    }

    return a.title.localeCompare(b.title);
  }), [hiddenSongIdSet, songs]);

  const filteredSongs = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) {
      return sortedSongs;
    }

    return sortedSongs.filter(song => [song.title, song.artist, song.album]
      .some(value => value?.toLocaleLowerCase().includes(query)));
  }, [searchQuery, sortedSongs]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/70"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('cancel', 'Cancel')}
        />
        <View
          className="rounded-t-[28px] px-5 pb-6 pt-2"
          style={{
            backgroundColor: theme.background,
            height: '68%',
            paddingBottom: Math.max(insets.bottom, 24),
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: -8 },
            elevation: 18,
          }}
        >
          <View className="mb-4 items-center">
            <View className="h-[5px] w-10 rounded-full" style={{ backgroundColor: `${theme.mutedText}55` }} />
          </View>

          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center pr-4">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-[12px]" style={{ backgroundColor: `${theme.accent}18` }}>
                <Ionicons name="eye-off-outline" size={18} color={theme.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold" style={{ color: theme.text }}>{t('hide_music', 'Hide Music')}</Text>
              <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                {hiddenSongIds.length} {hiddenSongIds.length === 1 ? t('hidden_file_single', 'hidden file') : t('hidden_file_plural', 'hidden files')}
              </Text>
              </View>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.surface }}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('close_hide_music', 'Close hide music')}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </Pressable>
          </View>

          <View
            className="mb-3 flex-row items-center rounded-[16px] border px-3"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          >
            <Ionicons name="search-outline" size={19} color={theme.mutedText} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('hide_music_search', 'Search songs')}
              placeholderTextColor={theme.mutedText}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel={t('hide_music_search', 'Search songs')}
              style={{
                flex: 1,
                color: theme.text,
                fontSize: 16,
                paddingVertical: 12,
                paddingHorizontal: 10,
              }}
            />
          </View>

          <FlatList
            data={filteredSongs}
            keyExtractor={song => song.id}
            showsVerticalScrollIndicator={false}
            initialNumToRender={16}
            maxToRenderPerBatch={12}
            windowSize={5}
            removeClippedSubviews
            ListEmptyComponent={
              searchQuery.trim() ? (
                <View
                  className="items-center rounded-[26px] border px-5 py-8"
                  style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                >
                  <Text className="text-base font-bold" style={{ color: theme.text }}>
                    {t('hide_music_search_empty', 'No songs found')}
                  </Text>
                </View>
              ) : (
                <View
                  className="items-center rounded-[26px] border px-5 py-8"
                  style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                >
                  <Text className="text-base font-bold" style={{ color: theme.text }}>
                    {t('no_music_available', 'No songs available')}
                  </Text>
                  <Text className="mt-2 text-center text-sm leading-5" style={{ color: theme.mutedText }}>
                    {t('no_music_available_description', 'Your local library is empty or files have not loaded yet.')}
                  </Text>
                </View>
              )
            }
            renderItem={({ item: song }) => {
              const isHidden = hiddenSongIdSet.has(song.id);

              return (
                  <Pressable
                    className="mb-2 flex-row items-center rounded-[20px] border px-3 py-3"
                    style={{
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: isHidden ? 0.8 : 1,
                    }}
                    onPress={() => onToggleHidden(song.id)}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: isHidden }}
                    accessibilityLabel={`${song.title}, ${song.artist?.trim() || t('unknown_artist', 'Unknown Artist')}`}
                    accessibilityHint={isHidden ? t('show_song', 'Show song') : t('hide_song', 'Hide song')}
                  >
                    <LibraryArtwork
                      artwork={song.artwork}
                      className="mr-3 h-12 w-12 rounded-xl"
                      fallbackTextClassName="text-xl text-white"
                    />

                    <View className="flex-1 pr-3">
                      <Text className="text-base font-bold" style={{ color: theme.text }} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text className="mt-1 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
                        {song.artist?.trim() || t('unknown_artist', 'Unknown Artist')}
                      </Text>
                    </View>

                    <View
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: isHidden ? `${theme.accent}18` : `${theme.border}` }}
                    >
                      <Ionicons
                        name={isHidden ? 'eye-off' : 'eye'}
                        size={18}
                        color={isHidden ? theme.accent : theme.text}
                      />
                    </View>
                  </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

export default HideMusicModal;
