import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { getTranslation } from '../i18n/translations';
import { CheckIcon } from '../Icons';
import { useAppSettings } from '../settings/appSettings';
import LibraryArtwork from './LibraryArtwork';

export type PlaylistSelectionTab = 'tracks' | 'artists' | 'albums' | 'folders';

type SongGroup = {
  id: string;
  name: string;
  subtitle: string;
  songs: Song[];
  artwork?: string | null;
};

interface PlaylistSongSelectorModalProps {
  visible: boolean;
  playlistName: string;
  selectedSongIds: string[];
  activeTab: PlaylistSelectionTab;
  songs: Song[];
  artistGroups: SongGroup[];
  albumGroups: SongGroup[];
  folderGroups: SongGroup[];
  isEditing: boolean;
  onClose: () => void;
  onTabChange: (tab: PlaylistSelectionTab) => void;
  onToggleSong: (song: Song) => void;
  onToggleGroup: (group: SongGroup) => void;
  onSave: () => void;
}

const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const cleanValue = value?.trim();

  return cleanValue || fallback;
};

const PlaylistSongSelectorModal = ({
  visible,
  playlistName,
  selectedSongIds,
  activeTab,
  songs,
  artistGroups,
  albumGroups,
  folderGroups,
  isEditing,
  onClose,
  onTabChange,
  onToggleSong,
  onToggleGroup,
  onSave,
}: PlaylistSongSelectorModalProps) => {
  const insets = useSafeAreaInsets();
  const { theme, language } = useAppSettings();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const sortedSongs = useMemo(
    () => [...songs].sort((a, b) => a.title.localeCompare(b.title)),
    [songs]
  );

  const selectorGroups = activeTab === 'artists'
    ? artistGroups
    : activeTab === 'albums'
      ? albumGroups
      : folderGroups;

  const TABS: { label: string; value: PlaylistSelectionTab }[] = [
    { label: t('tab_tracks', 'Tracks'), value: 'tracks' },
    { label: t('tab_artists', 'Artists'), value: 'artists' },
    { label: t('tab_albums', 'Albums'), value: 'albums' },
    { label: t('tab_folders', 'Folders'), value: 'folders' },
  ];

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View
          className="max-h-[88%] rounded-t-[32px] px-5 pt-3"
          style={{
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
        >
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full bg-white/20" />
          </View>

          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xl font-bold" style={{ color: theme.text }} numberOfLines={1}>
                {playlistName.trim() || t('create_playlist_title', 'New playlist')}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                {selectedSongIds.length} {selectedSongIds.length === 1 ? t('selection_selected_one', 'selected') : t('selection_selected_many', 'selected')}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Text className="font-bold" style={{ color: theme.text }}>{t('close', 'Close')}</Text>
            </Pressable>
          </View>

          <View className="mb-4 flex-row rounded-full p-1" style={{ backgroundColor: theme.surface }}>
            {TABS.map(tab => {
              const isSelected = activeTab === tab.value;

              return (
                <Pressable
                  key={tab.value}
                  className="flex-1 rounded-full py-2.5"
                  style={{ backgroundColor: isSelected ? theme.text : 'transparent' }}
                  onPress={() => onTabChange(tab.value)}
                >
                  <Text
                    className="text-center text-xs font-bold"
                    style={{ color: isSelected ? theme.background : theme.mutedText }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView className="max-h-[58%]" showsVerticalScrollIndicator={false}>
            {activeTab === 'tracks' ? sortedSongs.map(song => {
              const isSelected = selectedSongIds.includes(song.id);

              return (
                <Pressable
                  key={song.id}
                  className="mb-2 flex-row items-center rounded-3xl px-3 py-3"
                  style={{
                    backgroundColor: theme.surface,
                    borderWidth: isSelected ? 1 : 0,
                    borderColor: isSelected ? 'rgba(255,255,255,0.18)' : 'transparent',
                  }}
                  onPress={() => onToggleSong(song)}
                >
                  <View
                    className="mr-3 h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      borderColor: isSelected ? 'transparent' : theme.mutedText,
                      borderWidth: isSelected ? 0 : 1,
                      backgroundColor: isSelected ? theme.text : 'transparent',
                    }}
                  >
                    {isSelected ? <CheckIcon size={18} color={theme.background} /> : null}
                  </View>
                  <LibraryArtwork
                    artwork={song.artwork}
                    className="mr-3 h-11 w-11 rounded-xl"
                    fallbackTextClassName="text-xl text-white"
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-bold" style={{ color: theme.text }} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text className="mt-1 text-xs" style={{ color: theme.mutedText }} numberOfLines={1}>
                      {normalizeValue(song.artist, t('unknown_artist', 'Unknown Artist'))}
                    </Text>
                  </View>
                </Pressable>
              );
            }) : selectorGroups.map(group => {
              const groupSongIds = group.songs.map(song => song.id);
              const selectedCount = groupSongIds.filter(songId => selectedSongIds.includes(songId)).length;
              const isSelected = selectedCount === groupSongIds.length && groupSongIds.length > 0;

              return (
                <Pressable
                  key={group.id}
                  className="mb-2 flex-row items-center rounded-3xl px-3 py-3"
                  style={{
                    backgroundColor: theme.surface,
                    borderWidth: isSelected ? 1 : 0,
                    borderColor: isSelected ? 'rgba(255,255,255,0.18)' : 'transparent',
                  }}
                  onPress={() => onToggleGroup(group)}
                >
                  <View
                    className="mr-3 h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      borderColor: isSelected ? 'transparent' : theme.mutedText,
                      borderWidth: isSelected ? 0 : 1,
                      backgroundColor: isSelected ? theme.text : 'transparent',
                    }}
                  >
                    {isSelected ? <CheckIcon size={18} color={theme.background} /> : null}
                  </View>
                  <LibraryArtwork
                    artwork={group.artwork}
                    className="mr-3 h-11 w-11 rounded-xl"
                    fallbackTextClassName="text-xl text-white"
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-bold" style={{ color: theme.text }} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text className="mt-1 text-xs" style={{ color: theme.mutedText }}>
                      {selectedCount}/{groupSongIds.length} {t('selection_selected_many', 'selected')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            className="mt-5 rounded-full py-4"
            style={{ backgroundColor: theme.text }}
            onPress={onSave}
          >
            <Text className="text-center font-bold" style={{ color: theme.background }}>
              {isEditing ? t('save_changes', 'Save changes') : t('create_playlist', 'Create playlist')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default PlaylistSongSelectorModal;
