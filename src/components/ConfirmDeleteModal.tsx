import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  const accentColor = isWhiteAccent ? theme.text : '#ff5252';
  const confirmTextColor = isWhiteAccent ? '#ffffff' : '#ffffff';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-6">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View
          className="w-full max-w-[380px] overflow-hidden rounded-[34px] p-6"
          style={{
            backgroundColor: isWhiteAccent ? theme.background : 'rgba(40,20,20,0.55)',
            borderColor: isWhiteAccent ? 'rgba(255,255,255,0.10)' : 'rgba(255,82,82,0.18)',
            borderWidth: 1,
            shadowColor: '#000',
            shadowOpacity: 0.5,
            shadowOffset: { width: 0, height: 14 },
            shadowRadius: 28,
            elevation: 16,
          }}
        >
          {!isWhiteAccent && (
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,82,82,0.12)', 'rgba(255,82,82,0)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140, borderTopLeftRadius: 34, borderTopRightRadius: 34 }}
            />
          )}

          <View className="mb-5 items-center">
            <View
              className="h-20 w-20 items-center justify-center rounded-full"
              style={{
                backgroundColor: isWhiteAccent ? 'rgba(255,255,255,0.12)' : 'rgba(255,82,82,0.18)',
                borderWidth: 1,
                borderColor: isWhiteAccent ? 'rgba(255,255,255,0.18)' : 'rgba(255,82,82,0.30)',
              }}
            >
              {isWhiteAccent ? (
                <DeleteIcon size={36} color={accentColor} />
              ) : (
                <Ionicons name="trash-outline" size={40} color={accentColor} />
              )}
            </View>
          </View>

          <Text
            className="text-center text-2xl font-extrabold tracking-tight"
            style={{ color: theme.text }}
          >
            {title}
          </Text>
          <Text
            className="mt-3 text-center text-base leading-6"
            style={{ color: theme.mutedText }}
          >
            {message}
          </Text>

          {itemName ? (
            <View
              className="mt-6 flex-row items-center rounded-2xl px-4 py-3"
              style={{
                backgroundColor: isWhiteAccent ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.28)',
                borderWidth: 1,
                borderColor: isWhiteAccent ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
              }}
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

          <View className="mt-6 flex-col gap-3">
            <Pressable
              className="w-full items-center rounded-full py-4"
              style={{
                backgroundColor: isWhiteAccent ? 'rgba(255,255,255,0.10)' : 'rgba(255,82,82,0.85)',
                borderWidth: 1,
                borderColor: isWhiteAccent ? 'rgba(255,255,255,0.14)' : 'rgba(255,82,82,0.50)',
              }}
              onPress={onConfirm}
            >
              <Text className="text-center text-base font-extrabold tracking-wide" style={{ color: confirmTextColor }}>
                {confirmLabel}
              </Text>
            </Pressable>
            <Pressable
              className="w-full items-center rounded-full py-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
              }}
              onPress={onClose}
            >
              <Text className="text-center text-base font-bold" style={{ color: theme.mutedText }}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmDeleteModal;
