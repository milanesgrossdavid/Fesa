import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { DeleteIcon } from '../Icons';
import { useAppSettings } from '../settings/appSettings';
import LibraryArtwork from './LibraryArtwork';

interface ConfirmDeleteModalProps {
  visible: boolean;
  title?: string;
  message: string;
  itemName?: string;
  artwork?: string | null;
  confirmLabel?: string;
  /** 'white' para playlists; 'danger' para borrado destructivo de archivos */
  accent?: 'white' | 'danger';
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteModal = ({
  visible,
  title = 'Eliminar',
  message,
  itemName,
  artwork,
  confirmLabel = 'Eliminar',
  accent = 'danger',
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) => {
  const { theme } = useAppSettings();
  const isWhiteAccent = accent === 'white';
  const accentColor = isWhiteAccent ? theme.text : '#ff6b6b';
  const accentSoft = isWhiteAccent ? 'rgba(255,255,255,0.12)' : 'rgba(255,80,80,0.15)';
  const confirmTextColor = isWhiteAccent ? theme.background : '#ffffff';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-6">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View
          className="w-full max-w-[400px] rounded-[28px] p-5"
          style={{ backgroundColor: theme.surface }}
        >
          <View className="mb-4 items-center">
            <View
              className="h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: accentSoft }}
            >
              <DeleteIcon size={28} color={accentColor} />
            </View>
          </View>

          <Text className="text-center text-xl font-bold" style={{ color: theme.text }}>
            {title}
          </Text>
          <Text className="mt-2 text-center text-sm leading-5" style={{ color: theme.mutedText }}>
            {message}
          </Text>

          {itemName ? (
            <View
              className="mt-5 flex-row items-center rounded-3xl px-3 py-3"
              style={{ backgroundColor: theme.background }}
            >
              {artwork !== undefined ? (
                <LibraryArtwork
                  artwork={artwork}
                  className="mr-3 h-12 w-12 rounded-xl"
                  fallbackTextClassName="text-xl text-white"
                />
              ) : null}
              <Text className="flex-1 text-sm font-bold" style={{ color: theme.text }} numberOfLines={2}>
                {itemName}
              </Text>
            </View>
          ) : null}

          <View className="mt-5 flex-row gap-3">
            <Pressable
              className="flex-1 rounded-full py-4"
              style={{ backgroundColor: theme.background }}
              onPress={onClose}
            >
              <Text className="text-center font-bold" style={{ color: theme.mutedText }}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-full py-4"
              style={{ backgroundColor: accentColor }}
              onPress={onConfirm}
            >
              <Text className="text-center font-bold" style={{ color: confirmTextColor }}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmDeleteModal;
