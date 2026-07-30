import React from 'react';
import { Dimensions, Modal, Pressable, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';

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

const SCREEN_WIDTH = Dimensions.get('window').width;

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
  if (!trackMenu) {
    return null;
  }

  const actions: { label: string; onPress: () => void }[] = [
    { label: 'Añadir', onPress: () => onAdd(trackMenu.song) },
    { label: 'Eliminar', onPress: () => onDelete(trackMenu.song) },
    { label: 'Compartir', onPress: () => onShare(trackMenu.song) },
    { label: 'Detalles de la Pista', onPress: () => onDetails(trackMenu.song) },
    { label: 'Álbum', onPress: () => onOpenGroup(trackMenu.song, 'albums') },
    { label: 'Artista', onPress: () => onOpenGroup(trackMenu.song, 'artists') },
    { label: 'Definir como', onPress: () => onDefineAs(trackMenu.song) },
  ];

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable className="absolute inset-0" onPress={onClose} />
      <View
        className="absolute w-56 overflow-hidden rounded-2xl bg-[#252525] shadow-lg"
        style={{
          left: Math.min(Math.max(trackMenu.x - 210, 12), SCREEN_WIDTH - 236),
          top: Math.max(trackMenu.y - 306, 48),
        }}
      >
        {actions.map(action => (
          <Pressable key={action.label} className="border-b border-white/5 px-4 py-3" onPress={action.onPress}>
            <Text className="text-sm font-bold text-white">{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
};

export default TrackActionMenu;