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
        className="flex-1 items-center justify-center px-5"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable className="absolute inset-0 bg-black/55" onPress={onClose} />
        <View
          className="w-full max-w-[420px] rounded-[30px] border p-5"
          style={{
            backgroundColor: theme.background,
            borderColor: theme.border,
            shadowColor: '#000000',
            shadowOpacity: 0.14,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <View className="mb-5 flex-row items-start justify-between">
            <View className="flex-1 flex-row items-center pr-3">
              <View
                className="mr-3 h-14 w-14 items-center justify-center rounded-[18px]"
                style={{ backgroundColor: `${theme.accent}18` }}
              >
                <PlaylistIcon size={28} color={theme.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-[28px] font-bold leading-8" style={{ color: theme.text }}>
                  Nueva playlist
                </Text>
                <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                  Organiza tu música favorita
                </Text>
              </View>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.surface }}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={20} color={theme.mutedText} />
            </Pressable>
          </View>

          <View className="rounded-[26px] border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="ml-2 text-base font-bold" style={{ color: theme.text }}>
                Nombre
              </Text>
              <Text className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.mutedText }}>
                {playlistName.trim().length}/60
              </Text>
            </View>
            <TextInput
              autoFocus
              className="rounded-[18px] border px-4 py-4 text-base font-bold"
              style={{
                backgroundColor: theme.background,
                borderColor: canContinue ? theme.accent : theme.border,
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
              className="flex-1 items-center justify-center rounded-full border py-4"
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}
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
