import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { useAppSettings } from '../settings/appSettings';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import LibraryArtwork from './LibraryArtwork';

type TrackMenuState = {
  song: Song;
  x: number;
  y: number;
};

interface TrackActionMenuProps {
  trackMenu: TrackMenuState | null;
  onClose: () => void;
  onAdd: (song: Song) => void;
  onDelete: (song: Song) => void;
  onShare: (song: Song) => void;
  onDetails: (song: Song) => void;
  onOpenGroup: (song: Song, groupMode: 'albums' | 'artists') => void;
  onDefineAs: (song: Song) => void;
}

const TrackActionMenu = ({
  trackMenu,
  onClose,
  onAdd,
  onDelete,
  onShare,
  onDetails,
  onOpenGroup,
  onDefineAs,
}: TrackActionMenuProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  if (!trackMenu) {
    return null;
  }

  const song = trackMenu.song;

  const actions: {
    label: string;
    onPress: () => void;
  }[] = [
    { label: 'Añadir a playlist', onPress: () => onAdd(song) },
    { label: 'Compartir', onPress: () => onShare(song) },
    { label: 'Detalles de la pista', onPress: () => onDetails(song) },
    { label: 'Álbum', onPress: () => onOpenGroup(song, 'albums') },
    { label: 'Artista', onPress: () => onOpenGroup(song, 'artists') },
    { label: 'Definir como', onPress: () => onDefineAs(song) },
    { label: 'Eliminar', onPress: () => setConfirmDeleteVisible(true) },
  ];

  const handleClose = () => {
    setConfirmDeleteVisible(false);
    onClose();
  };

  return (
    <>
      <Modal transparent visible={!confirmDeleteVisible} animationType="slide" onRequestClose={handleClose}>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/70" onPress={handleClose} />
          <View
            className="rounded-t-[32px] px-5 pt-3"
            style={{
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-white/20" />
            </View>

            <View
              className="mb-4 flex-row items-center rounded-3xl px-3 py-3"
              style={{ backgroundColor: theme.surface }}
            >
              <LibraryArtwork
                artwork={song.artwork}
                className="mr-3 h-14 w-14 rounded-2xl"
                fallbackTextClassName="text-2xl text-white"
              />
              <View className="flex-1 pr-2">
                <Text className="text-base font-bold" style={{ color: theme.text }} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
                  {song.artist?.trim() || 'Artista Desconocido'}
                </Text>
              </View>
            </View>

            <View className="overflow-hidden rounded-3xl" style={{ backgroundColor: theme.surface }}>
              {actions.map((action, index) => (
                <Pressable
                  key={action.label}
                  className="px-4 py-4"
                  style={{
                    borderBottomWidth: index === actions.length - 1 ? 0 : 1,
                    borderBottomColor: theme.border,
                  }}
                  onPress={action.onPress}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDeleteModal
        visible={confirmDeleteVisible}
        title="Eliminar canción"
        message="Esta acción quitará la pista de tu dispositivo. No se puede deshacer."
        itemName={song.title}
        artwork={song.artwork}
        accent="white"
        onClose={() => setConfirmDeleteVisible(false)}
        onConfirm={() => {
          setConfirmDeleteVisible(false);
          onDelete(song);
        }}
      />
    </>
  );
};

export default TrackActionMenu;
