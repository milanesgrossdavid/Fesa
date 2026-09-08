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
        className="absolute bottom-5 left-4 right-4 rounded-[24px] border px-3 py-3"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }}
        pointerEvents="auto"
      >
        <View className="mb-3 items-center">
          <View className="h-[5px] w-10 rounded-full" style={{ backgroundColor: `${theme.mutedText}55` }} />
        </View>
        <View className="mb-3 flex-row items-center justify-between px-1">
          <Text className="text-sm font-bold" style={{ color: theme.text }}>
            {selectedCount} {selectedCount === 1 ? t('playlist_selected_one', 'playlist selected') : t('playlist_selected_many', 'playlists selected')}
          </Text>
        </View>
        <View className="flex-row items-center justify-around">
          <Pressable className="min-w-[64px] items-center gap-1 rounded-[16px] px-2 py-1" disabled={!singleSelection} onPress={onPlay} accessibilityRole="button" accessibilityLabel={t('play', 'Play')} style={({ pressed }) => ({ opacity: !singleSelection ? 0.4 : pressed ? 0.65 : 1 })}>
            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent + 18}}>
              <PlayIcon size={20} color={singleSelection ? theme.accent : theme.mutedText} />
            </View>
            <Text className="text-xs font-bold" style={{ color: singleSelection ? theme.text : theme.mutedText }}>
              {t('play', 'Play')}
            </Text>
          </Pressable>
          <Pressable
            className="min-w-[64px] items-center gap-1 rounded-[16px] px-2 py-1"
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
            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent + 18}}>
              <PlusIcon size={21} color={singleSelection ? theme.text : theme.mutedText} />
            </View>
            <Text className="text-xs font-bold" style={{ color: singleSelection ? theme.text : theme.mutedText }}>
              {t('add', 'Add')}
            </Text>
          </Pressable>
          <Pressable className="min-w-[64px] items-center gap-1 rounded-[16px] px-2 py-1" disabled={!singleSelection} onPress={onEdit} accessibilityRole="button" accessibilityLabel={t('edit', 'Edit')} style={({ pressed }) => ({ opacity: !singleSelection ? 0.4 : pressed ? 0.65 : 1 })}>
            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent + 18}}>
              <EditIcon size={20} color={singleSelection ? theme.text : theme.mutedText} />
            </View>
            <Text className="text-xs font-bold" style={{ color: singleSelection ? theme.text : theme.mutedText }}>
              {t('edit', 'Edit')}
            </Text>
          </Pressable>
          <Pressable className="min-w-[64px] items-center gap-1 rounded-[16px] px-2 py-1" onPress={onDelete} accessibilityRole="button" accessibilityLabel={t('delete', 'Delete')} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent + 18}}>
              <DeleteIcon size={20} color={theme.accent} />
            </View>
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