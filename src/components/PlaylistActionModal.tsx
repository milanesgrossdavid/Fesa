import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { getTranslation } from '../i18n/translations';
import { DeleteIcon, EditIcon, PlayIcon, PlusIcon } from '../Icons';
import { useAppSettings } from '../settings/appSettings';

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
  const { language } = useAppSettings();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);

  if (!selectedCount) {
    return null;
  }

  const singleSelection = selectedCount === 1 && Boolean(playlist);

  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      <View className="absolute bottom-5 left-5 right-5 rounded-3xl bg-[#252525] px-4 py-3 shadow-lg" pointerEvents="auto">
        <Text className="mb-3 text-center text-xs font-bold text-white/45">
          {selectedCount} {selectedCount === 1 ? t('playlist_selected_one', 'playlist selected') : t('playlist_selected_many', 'playlists selected')}
        </Text>
        <View className="flex-row items-center justify-between">
          <Pressable className="items-center gap-1" disabled={!singleSelection} onPress={onPlay}>
            <PlayIcon size={24} color={singleSelection ? '#ffffff' : '#707070'} />
            <Text className={`text-xs font-bold ${singleSelection ? 'text-white' : 'text-[#707070]'}`}>{t('play', 'Play')}</Text>
          </Pressable>
          <Pressable className="items-center gap-1" disabled={!singleSelection} onPress={() => { if (playlist) onAdd(playlist.id); }}>
            <PlusIcon size={24} color={singleSelection ? '#ffffff' : '#707070'} />
            <Text className={`text-xs font-bold ${singleSelection ? 'text-white' : 'text-[#707070]'}`}>{t('add', 'Add')}</Text>
          </Pressable>
          <Pressable className="items-center gap-1" disabled={!singleSelection} onPress={onEdit}>
            <EditIcon size={24} color={singleSelection ? '#ffffff' : '#707070'} />
            <Text className={`text-xs font-bold ${singleSelection ? 'text-white' : 'text-[#707070]'}`}>{t('edit', 'Edit')}</Text>
          </Pressable>
          <Pressable className="items-center gap-1" onPress={onDelete}>
            <DeleteIcon size={24} color="#ffffff" />
            <Text className="text-xs font-bold text-white">{t('delete', 'Delete')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default PlaylistActionModal;