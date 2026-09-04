import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { getTranslation } from '../i18n/translations';
import { DeleteIcon, PlayIcon, PlusIcon, ShareIcon } from '../Icons';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';

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
  const language = useAppSettingsLanguage();
  const theme = useAppSettingsTheme();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);

  if (!visible) {
    return null;
  }

  return (
    <View
      className="absolute bottom-5 left-5 right-5 rounded-3xl px-4 py-3 shadow-lg"
      style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}
    >
      <View className="flex-row items-center justify-between">
        <Pressable className="items-center gap-1" onPress={onPlay}>
          <PlayIcon size={24} color={theme.text} />
          <Text className="text-xs font-bold" style={{ color: theme.text }}>{t('play', 'Play')}</Text>
        </Pressable>
        <Pressable className="items-center gap-1" onPress={onAdd}>
          <PlusIcon size={25} color={theme.text} />
          <Text className="text-xs font-bold" style={{ color: theme.text }}>{t('add', 'Add')}</Text>
        </Pressable>
        <Pressable className="items-center gap-1" onPress={onShare}>
          <ShareIcon size={24} color={theme.text} />
          <Text className="text-xs font-bold" style={{ color: theme.text }}>{t('track_action_share', 'Share')}</Text>
        </Pressable>
        <Pressable className="items-center gap-1" onPress={onDelete}>
          <DeleteIcon size={25} color={theme.text} />
          <Text className="text-xs font-bold" style={{ color: theme.text }}>{t('delete', 'Delete')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default SelectedSongsActionBar;