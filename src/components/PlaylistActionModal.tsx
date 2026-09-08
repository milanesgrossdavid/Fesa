import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { getTranslation } from '../i18n/translations';
import { DeleteIcon, EditIcon, PlayIcon, PlusIcon } from '../Icons';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';

type PlaylistActionData = {
  id: string;
  name: string;
};

interface PlaylistActionModalProps {
  playlist: PlaylistActionData | null;
  selectedCount: number;
  onClose: () => void;
  onPlay: () => void;
  onAdd: (playlistId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const PlaylistActionModal = ({
  playlist,
  selectedCount,
  onClose,
  onPlay,
  onAdd,
  onEdit,
  onDelete,
}: PlaylistActionModalProps) => {
  const language = useAppSettingsLanguage();
  const theme = useAppSettingsTheme();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);

  if (!selectedCount) {
    return null;
  }

  const singleSelection = selectedCount === 1 && Boolean(playlist);

  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      <View
        className="absolute bottom-5 left-4 right-4 rounded-2xl border px-4 py-4"
        style={{ backgroundColor: theme.surface, borderColor: theme.border, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 }}
        pointerEvents="auto"
      >
        <Text className="mb-3 text-center text-xs font-bold" style={{ color: theme.mutedText }}>
          {selectedCount} {selectedCount === 1 ? t('playlist_selected_one', 'playlist selected') : t('playlist_selected_many', 'playlists selected')}
        </Text>
        <View className="flex-row items-center justify-between">
          <Pressable className="items-center gap-1 rounded-xl px-3 py-2" disabled={!singleSelection} onPress={onPlay} accessibilityRole="button" accessibilityLabel={t('play', 'Play')} style={({ pressed }) => ({ opacity: !singleSelection ? 0.4 : pressed ? 0.65 : 1 })}>
            <PlayIcon size={24} color={singleSelection ? theme.text : theme.mutedText} />
            <Text className="text-xs font-bold" style={{ color: singleSelection ? theme.text : theme.mutedText }}>
              {t('play', 'Play')}
            </Text>
          </Pressable>
          <Pressable
            className="items-center gap-1 rounded-xl px-3 py-2"
            disabled={!singleSelection}
            onPress={() => {
              if (playlist) {
                onAdd(playlist.id);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={t('add', 'Add')}
            style={({ pressed }) => ({ opacity: !singleSelection ? 0.4 : pressed ? 0.65 : 1 })}
          >
            <PlusIcon size={24} color={singleSelection ? theme.text : theme.mutedText} />
            <Text className="text-xs font-bold" style={{ color: singleSelection ? theme.text : theme.mutedText }}>
              {t('add', 'Add')}
            </Text>
          </Pressable>
          <Pressable className="items-center gap-1 rounded-xl px-3 py-2" disabled={!singleSelection} onPress={onEdit} accessibilityRole="button" accessibilityLabel={t('edit', 'Edit')} style={({ pressed }) => ({ opacity: !singleSelection ? 0.4 : pressed ? 0.65 : 1 })}>
            <EditIcon size={24} color={singleSelection ? theme.text : theme.mutedText} />
            <Text className="text-xs font-bold" style={{ color: singleSelection ? theme.text : theme.mutedText }}>
              {t('edit', 'Edit')}
            </Text>
          </Pressable>
          <Pressable className="items-center gap-1 rounded-xl px-3 py-2" onPress={onDelete} accessibilityRole="button" accessibilityLabel={t('delete', 'Delete')} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
            <DeleteIcon size={24} color={theme.text} />
            <Text className="text-xs font-bold" style={{ color: theme.text }}>
              {t('delete', 'Delete')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default PlaylistActionModal;