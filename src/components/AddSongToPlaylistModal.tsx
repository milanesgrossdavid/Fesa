import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';

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
  const selectedSongIds = songIdsToAdd.length ? songIdsToAdd : songToAdd ? [songToAdd.id] : [];

  return (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View className="flex-1 justify-center px-6">
      <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
      <View className="max-h-[70%] rounded-3xl bg-[#252525] p-5">
        <Text className="text-xl font-bold text-white">Añadir a playlist</Text>
        <Text className="mt-2 text-sm text-[#707070]" numberOfLines={1}>
          {songsToAddCount > 1 ? `${songsToAddCount} canciones seleccionadas` : songToAdd?.title}
        </Text>
        <ScrollView className="mt-4">
          {playlists.map(playlist => {
            const pendingSongCount = selectedSongIds.filter(songId => !playlist.songIds.includes(songId)).length;
            const alreadyAdded = selectedSongIds.length > 0 && pendingSongCount === 0;

            return (
              <Pressable
                key={playlist.id}
                className="mb-3 rounded-2xl bg-[#1d1d1f] px-4 py-4"
                disabled={alreadyAdded}
                onPress={() => onAddToPlaylist(playlist.id)}
              >
                <Text className="text-base font-bold text-white">{playlist.name}</Text>
                <Text className="mt-1 text-sm text-[#707070]">
                  {alreadyAdded
                    ? `${songsToAddCount > 1 ? 'Estas canciones ya están' : 'Esta canción ya está'} en la lista`
                    : songsToAddCount > 1
                      ? `${pendingSongCount} ${pendingSongCount === 1 ? 'canción nueva' : 'canciones nuevas'} para añadir`
                      : `${playlist.songIds.length} ${playlist.songIds.length === 1 ? 'canción' : 'canciones'}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable className="mt-2 rounded-full border border-[#b64400] px-4 py-3" onPress={onCreatePlaylist}>
          <Text className="text-center font-bold text-[#b64400]">Crear lista nueva</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
  );
};

export default AddSongToPlaylistModal;