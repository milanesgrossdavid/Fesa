import React from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { PlusIcon } from '../Icons';
import { useAppSettings } from '../settings/appSettings';

interface CreatePlaylistModalProps {
  visible: boolean;
  playlistName: string;
  onChangePlaylistName: (name: string) => void;
  onClose: () => void;
  onNext: () => void;
}

const CreatePlaylistModal = ({
  visible,
  playlistName,
  onChangePlaylistName,
  onClose,
  onNext,
}: CreatePlaylistModalProps) => {
  const { theme } = useAppSettings();
  const canContinue = Boolean(playlistName.trim());

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-6">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View
          className="w-full max-w-[400px] rounded-[28px] p-5"
          style={{ backgroundColor: theme.surface }}
        >
          <Text className="text-xl font-bold" style={{ color: theme.text }}>
            Crear playlist
          </Text>
          <Text className="mt-2 text-sm" style={{ color: theme.mutedText }}>
            Ponle un nombre para continuar y elegir canciones.
          </Text>

          <View
            className="mt-5 overflow-hidden rounded-3xl px-4 py-4"
            style={{ backgroundColor: theme.background }}
          >
            <Text className="mb-2 text-xs font-bold uppercase tracking-[1.2px]" style={{ color: theme.mutedText }}>
              Nombre
            </Text>
            <TextInput
              autoFocus
              className="rounded-2xl px-4 py-3.5 text-base font-bold"
              style={{ backgroundColor: theme.surface, color: theme.text }}
              placeholder="Mi playlist"
              placeholderTextColor={theme.mutedText}
              cursorColor={theme.text}
              value={playlistName}
              onChangeText={onChangePlaylistName}
              maxLength={60}
              returnKeyType="next"
              onSubmitEditing={() => {
                if (canContinue) {
                  onNext();
                }
              }}
            />
            <Text className="mt-2 text-right text-xs" style={{ color: theme.mutedText }}>
              {playlistName.trim().length}/60
            </Text>
          </View>

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
              className="flex-[1.4] flex-row items-center justify-center gap-2 rounded-full py-4"
              style={{
                backgroundColor: canContinue ? theme.text : theme.border,
                opacity: canContinue ? 1 : 0.55,
              }}
              disabled={!canContinue}
              onPress={onNext}
            >
              <PlusIcon size={18} color={canContinue ? theme.background : theme.mutedText} />
              <Text
                className="text-center font-bold"
                style={{ color: canContinue ? theme.background : theme.mutedText }}
              >
                Siguiente
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreatePlaylistModal;
