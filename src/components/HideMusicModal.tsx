import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
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

  const sortedSongs = useMemo(() => [...songs].sort((a, b) => {
    const aHidden = hiddenSongIds.includes(a.id);
    const bHidden = hiddenSongIds.includes(b.id);

    if (aHidden !== bHidden) {
      return aHidden ? -1 : 1;
    }

    return a.title.localeCompare(b.title);
  }), [hiddenSongIds, songs]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View
          className="max-h-[82%] rounded-t-[32px] px-5 pb-6 pt-3"
          style={{ backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: `${theme.text}40` }} />
          </View>

          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xl font-bold" style={{ color: theme.text }}>{t('hide_music', 'Hide Music')}</Text>
              <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                {hiddenSongIds.length} {hiddenSongIds.length === 1 ? t('hidden_file_single', 'hidden file') : t('hidden_file_plural', 'hidden files')}
              </Text>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full"
              onPress={onClose}
              accessibilityLabel={t('close_hide_music', 'Close hide music')}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {sortedSongs.length === 0 ? (
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
            ) : (
              sortedSongs.map(song => {
                const isHidden = hiddenSongIds.includes(song.id);

                return (
                  <Pressable
                    key={song.id}
                    className="mb-2 flex-row items-center rounded-[22px] px-3 py-3"
                    style={{
                      backgroundColor: theme.surface,
                      opacity: isHidden ? 0.8 : 1,
                    }}
                    onPress={() => onToggleHidden(song.id)}
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
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default HideMusicModal;
