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
      className="absolute bottom-5 left-4 right-4 rounded-[24px] border px-3 py-3 shadow-lg"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
      }}
    >
      <View className="mb-2 items-center">
        <View className="h-[5px] w-10 rounded-full" style={{ backgroundColor: `${theme.mutedText}55` }} />
      </View>
      <View className="flex-row items-center justify-around">
        <Pressable
          className="min-w-[64px] items-center gap-1 rounded-[16px] px-2 py-1"
          onPress={onPlay}
          accessibilityRole="button"
          accessibilityLabel={t('play', 'Play')}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${theme.accent}18` }}>
            <PlayIcon size={20} color={theme.accent} />
          </View>
          <Text className="text-xs font-bold" style={{ color: theme.text }}>{t('play', 'Play')}</Text>
        </Pressable>
        <Pressable
          className="min-w-[64px] items-center gap-1 rounded-[16px] px-2 py-1"
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={t('add', 'Add')}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${theme.accent}18` }}>
            <PlusIcon size={21} color={theme.text} />
          </View>
          <Text className="text-xs font-bold" style={{ color: theme.text }}>{t('add', 'Add')}</Text>
        </Pressable>
        <Pressable
          className="min-w-[64px] items-center gap-1 rounded-[16px] px-2 py-1"
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel={t('track_action_share', 'Share')}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${theme.accent}18` }}>
            <ShareIcon size={20} color={theme.text} />
          </View>
          <Text className="text-xs font-bold" style={{ color: theme.text }}>{t('track_action_share', 'Share')}</Text>
        </Pressable>
        <Pressable
          className="min-w-[64px] items-center gap-1 rounded-[16px] px-2 py-1"
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={t('delete', 'Delete')}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${theme.accent}18` }}>
            <DeleteIcon size={21} color={theme.accent} />
          </View>
          <Text className="text-xs font-bold" style={{ color: theme.text }}>{t('delete', 'Delete')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default SelectedSongsActionBar;