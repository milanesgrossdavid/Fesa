import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PlaylistIcon, PlusIcon } from '../Icons';
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
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 items-center justify-center px-6"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View
          className="w-full max-w-[400px] rounded-[28px] p-5"
          style={{ backgroundColor: theme.background }}
        >
          <View className="mb-6 flex-row items-start justify-between">
            <View className="flex-1 flex-row items-center pr-4">
              <View
                className="mr-3 h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: theme.text }}
              >
                <PlaylistIcon size={28} color={theme.background} />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold" style={{ color: theme.text }}>
                  Nueva playlist
                </Text>
                <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                  Tu música, a tu manera
                </Text>
              </View>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={20} color={theme.mutedText} />
            </Pressable>
          </View>

          <View className="rounded-3xl p-4" style={{ backgroundColor: theme.surface }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-bold ml-2" style={{ color: theme.text }}>
                Nombre
              </Text>
              <Text className="text-xs font-bold" style={{ color: theme.mutedText }}>
                {playlistName.trim().length}/60
              </Text>
            </View>
            <TextInput
              autoFocus
              className="rounded-2xl px-4 py-4 text-base font-bold"
              style={{
                backgroundColor: theme.background,
                borderColor: canContinue ? theme.text : theme.border,
                borderWidth: 1,
                color: theme.text,
              }}
              placeholder="Ej. Viaje de verano"
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
          </View>

          <View className="mt-5 flex-row gap-3">
            <Pressable
              className="flex-1 items-center justify-center rounded-full py-4"
              style={{ backgroundColor: theme.surface }}
              onPress={onClose}
            >
              <Text className="font-bold" style={{ color: theme.text }}>
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
              <Text className="font-bold" style={{ color: canContinue ? theme.background : theme.mutedText }}>
                Elegir canciones
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreatePlaylistModal;
