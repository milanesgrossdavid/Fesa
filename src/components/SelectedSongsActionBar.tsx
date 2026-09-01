import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { getTranslation } from '../i18n/translations';
import { DeleteIcon, PlayIcon, PlusIcon, ShareIcon } from '../Icons';
import { useAppSettings } from '../settings/appSettings';

interface SelectedSongsActionBarProps {
  visible: boolean;
  onPlay: () => void;
  onAdd: () => void;
  onShare: () => void;
  onDelete: () => void;
}

const SelectedSongsActionBar = ({
  visible,
  onPlay,
  onAdd,
  onShare,
  onDelete,
}: SelectedSongsActionBarProps) => {
  const { language } = useAppSettings();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);

  if (!visible) {
    return null;
  }

  return (
    <View className="absolute bottom-5 left-5 right-5 rounded-3xl bg-[#252525] px-4 py-3 shadow-lg">
      <View className="flex-row items-center justify-between">
        <Pressable className="items-center gap-1" onPress={onPlay}>
          <PlayIcon size={24} color="#ffffff" />
          <Text className="text-xs font-bold text-white">{t('play', 'Play')}</Text>
        </Pressable>
        <Pressable className="items-center gap-1" onPress={onAdd}>
          <PlusIcon size={25} color="#ffffff" />
          <Text className="text-xs font-bold text-white">{t('add', 'Add')}</Text>
        </Pressable>
        <Pressable className="items-center gap-1" onPress={onShare}>
          <ShareIcon size={24} color="#ffffff" />
          <Text className="text-xs font-bold text-white">{t('track_action_share', 'Share')}</Text>
        </Pressable>
        <Pressable className="items-center gap-1" onPress={onDelete}>
          <DeleteIcon size={25} color="#ffffff" />
          <Text className="text-xs font-bold text-white">{t('delete', 'Delete')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default SelectedSongsActionBar;