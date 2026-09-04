import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { getTranslation } from '../i18n/translations';
import { PlusIcon } from '../Icons';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';

type PlaylistOption = {
  id: string;
  name: string;
  songIds: string[];
};

interface AddSongToPlaylistModalProps {
  visible: boolean;
  songToAdd: Song | null;
  songIdsToAdd?: string[];
  songsToAddCount: number;
  playlists: PlaylistOption[];
  onClose: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
}

const AddSongToPlaylistModal = ({
  visible,
  songToAdd,
  songIdsToAdd = [],
  songsToAddCount,
  playlists,
  onClose,
  onAddToPlaylist,
  onCreatePlaylist,
}: AddSongToPlaylistModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const selectedSongIds = songIdsToAdd.length ? songIdsToAdd : songToAdd ? [songToAdd.id] : [];

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/55" onPress={onClose} />
        <View
          className="max-h-[80%] rounded-t-[30px] border px-4 pt-3"
          style={{
            backgroundColor: theme.background,
            borderColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 18),
            shadowColor: '#000000',
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: -6 },
            elevation: 8,
          }}
        >
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full" style={{ backgroundColor: `${theme.text}40` }} />
          </View>

          <View className="mb-5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3" style={{ flex: 1, paddingRight: 12 }}>
              <View
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: `${theme.accent}18` }}
              >
                <PlusIcon size={20} color={theme.accent} />
              </View>

              <View className="flex-1 pr-3">
                <Text className="text-xl font-bold" style={{ color: theme.text }}>
                  {t('track_action_add_to_playlist', 'Add to playlist')}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
                  {songsToAddCount > 1
                    ? `${songsToAddCount} ${songsToAddCount === 1 ? t('selection_selected_one', 'selected') : t('selection_selected_many', 'selected')}`
                    : songToAdd?.title ?? t('song_details', 'Song')}
                </Text>
              </View>
            </View>

            <Pressable
              className="h-9 items-center justify-center rounded-full px-3"
              style={{ backgroundColor: theme.surface }}
              onPress={onClose}
              hitSlop={8}
            >
              <Text className="text-sm font-bold" style={{ color: theme.text }}>{t('close', 'Close')}</Text>
            </Pressable>
          </View>

          <ScrollView className="mb-4" showsVerticalScrollIndicator={false}>
            {playlists.length === 0 ? (
              <View
                className="items-center rounded-[26px] border px-5 py-8"
                style={{ backgroundColor: theme.surface, borderColor: theme.border }}
              >
                <Text className="text-base font-bold" style={{ color: theme.text }}>
                  {t('no_playlists_title', 'You do not have playlists yet')}
                </Text>
                <Text className="mt-2 text-center text-sm leading-5" style={{ color: theme.mutedText }}>
                  {t('no_playlists_message', 'Create a new list to save these songs.')}
                </Text>
              </View>
            ) : (
              playlists.map(playlist => {
                const pendingSongCount = selectedSongIds.filter(
                  songId => !playlist.songIds.includes(songId)
                ).length;
                const alreadyAdded = selectedSongIds.length > 0 && pendingSongCount === 0;

                return (
                  <Pressable
                    key={playlist.id}
                    className="mb-2 rounded-[24px] border px-4 py-3"
                    style={{
                      backgroundColor: alreadyAdded ? `${theme.surface}80` : theme.surface,
                      borderColor: alreadyAdded ? theme.border : theme.border,
                      opacity: alreadyAdded ? 0.7 : 1,
                    }}
                    disabled={alreadyAdded}
                    onPress={() => onAddToPlaylist(playlist.id)}
                  >
                    <View className="flex-row items-center justify-between gap-2">
                      <View className="flex-1 pr-2">
                        <Text className="text-base font-bold" style={{ color: theme.text }}>
                          {playlist.name}
                        </Text>
                        <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                          {alreadyAdded
                            ? `${songsToAddCount > 1 ? t('songs_already_added', 'These songs are already in the list') : t('song_already_added', 'This song is already in the list')}`
                            : songsToAddCount > 1
                              ? `${pendingSongCount} ${pendingSongCount === 1 ? t('new_song_one', 'new song') : t('new_song_many', 'new songs')} ${t('to_add', 'to add')}`
                              : `${playlist.songIds.length} ${playlist.songIds.length === 1 ? t('song_count_one', 'song') : t('song_count_many', 'songs')}`}
                        </Text>
                      </View>

                      {alreadyAdded ? (
                        <View
                          className="h-7 w-7 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${theme.accent}20` }}
                        >
                          <Text className="text-xs font-bold" style={{ color: theme.accent }}>
                            ✓
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-full py-4"
            style={{ backgroundColor: theme.text }}
            onPress={onCreatePlaylist}
          >
            <PlusIcon size={18} color={theme.background} />
            <Text className="text-center text-base font-bold" style={{ color: theme.background }}>
              {t('create_new_playlist', 'Create new list')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default AddSongToPlaylistModal;
