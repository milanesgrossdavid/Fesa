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
import { getTranslation } from '../i18n/translations';
import { PlaylistIcon, PlusIcon } from '../Icons';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';

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
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
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
                  {t('create_playlist_title', 'New playlist')}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                  {t('create_playlist_subtitle', 'Organize your favorite music')}
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
                {t('playlist_name_label', 'Name')}
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
              placeholder={t('playlist_name_placeholder', 'e.g. Summer trip')}
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
                {t('cancel', 'Cancel')}
              </Text>
            </Pressable>
            <Pressable
              className="flex-[1.4] flex-row items-center justify-center gap-2 rounded-full py-4"
              style={{
                backgroundColor: canContinue ? theme.accent : theme.border,
                opacity: canContinue ? 1 : 0.55,
              }}
              disabled={!canContinue}
              onPress={onNext}
            >
              <PlusIcon size={18} color={canContinue ? theme.background : theme.mutedText} />
              <Text className="font-bold" style={{ color: canContinue ? theme.background : theme.mutedText }}>
                {t('choose_songs', 'Choose songs')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreatePlaylistModal;
