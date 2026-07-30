import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';
import { CheckIcon } from '../Icons';
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

const UNKNOWN_ARTIST = 'Artista Desconocido';

const TABS: { label: string; value: PlaylistSelectionTab }[] = [
  { label: 'Pistas', value: 'tracks' },
  { label: 'Artistas', value: 'artists' },
  { label: 'Álbumes', value: 'albums' },
  { label: 'Carpetas', value: 'folders' },
];

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
  const sortedSongs = useMemo(
    () => [...songs].sort((a, b) => a.title.localeCompare(b.title)),
    [songs]
  );

  const selectorGroups = activeTab === 'artists'
    ? artistGroups
    : activeTab === 'albums'
      ? albumGroups
      : folderGroups;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <View className="max-h-[88%] rounded-t-[32px] bg-[#1d1d1f] px-5 pb-6 pt-5">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xl font-bold text-white" numberOfLines={1}>
                {playlistName.trim()}
              </Text>
              <Text className="mt-1 text-sm text-[#707070]">
                {selectedSongIds.length} seleccionadas
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Text className="font-bold text-[#b64400]">Cerrar</Text>
            </Pressable>
          </View>

          <View className="mb-4 flex-row rounded-full bg-[#252525] p-1">
            {TABS.map(tab => {
              const isSelected = activeTab === tab.value;

              return (
                <Pressable
                  key={tab.value}
                  className={`flex-1 rounded-full py-2 ${isSelected ? 'bg-[#b64400]' : ''}`}
                  onPress={() => onTabChange(tab.value)}
                >
                  <Text className={`text-center text-xs font-bold ${isSelected ? 'text-white' : 'text-[#707070]'}`}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView className="max-h-[62%]">
            {activeTab === 'tracks' ? sortedSongs.map(song => {
              const isSelected = selectedSongIds.includes(song.id);

              return (
                <Pressable
                  key={song.id}
                  className="mb-2 flex-row items-center rounded-2xl bg-[#252525] px-3 py-3"
                  onPress={() => onToggleSong(song)}
                >
                  <View
                    className="mr-3 h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      borderColor: isSelected ? 'transparent' : '#707070',
                      borderWidth: isSelected ? 0 : 1,
                    }}
                  >
                    {isSelected ? <CheckIcon size={22} color="#f5f5f5" /> : null}
                  </View>
                  <LibraryArtwork
                    artwork={song.artwork}
                    className="mr-3 h-11 w-11 rounded-xl"
                    fallbackTextClassName="text-xl text-[#b64400]"
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white" numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text className="mt-1 text-xs text-[#707070]" numberOfLines={1}>
                      {normalizeValue(song.artist, UNKNOWN_ARTIST)}
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
                  className="mb-2 flex-row items-center rounded-2xl bg-[#252525] px-3 py-3"
                  onPress={() => onToggleGroup(group)}
                >
                  <View
                    className="mr-3 h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      borderColor: isSelected ? 'transparent' : '#707070',
                      borderWidth: isSelected ? 0 : 1,
                    }}
                  >
                    {isSelected ? <CheckIcon size={22} color="#f5f5f5" /> : null}
                  </View>
                  <LibraryArtwork
                    artwork={group.artwork}
                    className="mr-3 h-11 w-11 rounded-xl"
                    fallbackTextClassName="text-xl text-[#b64400]"
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white" numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text className="mt-1 text-xs text-[#707070]">
                      {selectedCount}/{groupSongIds.length} seleccionadas
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable className="mt-5 rounded-full bg-[#b64400] py-4" onPress={onSave}>
            <Text className="text-center font-bold text-white">
              {isEditing ? 'Guardar cambios' : 'Crear playlist'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default PlaylistSongSelectorModal;