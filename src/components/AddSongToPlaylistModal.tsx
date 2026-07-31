import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlusIcon } from '../Icons';
import { Song } from '../../modules/local-music';
import { useAppSettings } from '../settings/appSettings';

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
  const { theme } = useAppSettings();
  const selectedSongIds = songIdsToAdd.length ? songIdsToAdd : songToAdd ? [songToAdd.id] : [];

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View
          className="max-h-[78%] rounded-t-[32px] px-5 pt-3"
          style={{
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
        >
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full bg-white/20" />
          </View>

          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xl font-bold" style={{ color: theme.text }}>
                Añadir a playlist
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
                {songsToAddCount > 1
                  ? `${songsToAddCount} canciones seleccionadas`
                  : songToAdd?.title}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Text className="font-bold" style={{ color: theme.text }}>Cerrar</Text>
            </Pressable>
          </View>

          <ScrollView className="mb-3" showsVerticalScrollIndicator={false}>
            {playlists.length === 0 ? (
              <View
                className="mb-3 items-center rounded-3xl px-4 py-8"
                style={{ backgroundColor: theme.surface }}
              >
                <Text className="text-base font-bold" style={{ color: theme.text }}>
                  Aún no tienes playlists
                </Text>
                <Text className="mt-2 text-center text-sm" style={{ color: theme.mutedText }}>
                  Crea una lista nueva para guardar estas canciones.
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
                    className="mb-2 rounded-3xl px-4 py-4"
                    style={{
                      backgroundColor: theme.surface,
                      opacity: alreadyAdded ? 0.55 : 1,
                    }}
                    disabled={alreadyAdded}
                    onPress={() => onAddToPlaylist(playlist.id)}
                  >
                    <Text className="text-base font-bold" style={{ color: theme.text }}>
                      {playlist.name}
                    </Text>
                    <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                      {alreadyAdded
                        ? `${songsToAddCount > 1 ? 'Estas canciones ya están' : 'Esta canción ya está'} en la lista`
                        : songsToAddCount > 1
                          ? `${pendingSongCount} ${pendingSongCount === 1 ? 'canción nueva' : 'canciones nuevas'} para añadir`
                          : `${playlist.songIds.length} ${playlist.songIds.length === 1 ? 'canción' : 'canciones'}`}
                    </Text>
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
            <Text className="text-center font-bold" style={{ color: theme.background }}>
              Crear lista nueva
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default AddSongToPlaylistModal;
