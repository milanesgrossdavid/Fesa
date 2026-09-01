import React from 'react';
import { GestureResponderEvent, Image, Pressable, View, Text } from 'react-native';
import { Song } from '../../modules/local-music';
import { getTranslation } from '../i18n/translations';
import { CheckIcon, DotsIcon } from '../Icons';
import { formatDuration } from '../utils/time';
import AudioWaveBars from './AudioWaveBars';
import { useAppSettings } from '../settings/appSettings';

const DEFAULT_MUSIC_ARTWORK = require('../../assets/musicNotFound.jpg');

interface SongListItemProps {
  item: Song;
  isActive?: boolean;
  isPlaying?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onTogglePlayPause?: () => void;
  onOpenTrackMenu?: (song: Song, event: GestureResponderEvent) => void;
  rightAction?: React.ReactNode;
  showDuration?: boolean;
  showSelectionIndicator?: boolean;
}

const SongListItem = ({
  item,
  isActive = false,
  isPlaying = false,
  isSelected = false,
  onPress,
  onLongPress,
  onTogglePlayPause,
  onOpenTrackMenu,
  rightAction,
  showDuration = true,
  showSelectionIndicator = false,
}: SongListItemProps) => {
  const { theme, language } = useAppSettings();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);

  return (
    <Pressable
      className={`mx-4 mb-2 flex-row items-center rounded-2xl border px-2 py-2`}
      style={{
        backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : isActive ? 'rgba(255,255,255,0.045)' : 'transparent',
        borderColor: isSelected ? 'rgba(255,255,255,0.4)' : isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
    >
      {showSelectionIndicator ? (
        <View
          className="mr-3 h-6 w-6 items-center justify-center rounded-full"
          style={{
            borderColor: isSelected ? 'transparent' : theme.mutedText,
            borderWidth: isSelected ? 0 : 0.5,
            backgroundColor: isSelected ? theme.accent : 'transparent',
          }}
        >
          {isSelected ? <CheckIcon size={22} color={theme.background} /> : null}
        </View>
      ) : null}
      <Pressable
        className={`mr-4 h-12 w-12 items-center justify-center overflow-hidden rounded-2xl`}
        style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : theme.surface }}
        onPress={isActive ? onTogglePlayPause : onPress}
      >
        {item.artwork ? (
          <Image source={{ uri: item.artwork }} className="h-full w-full rounded-lg" resizeMode="cover" />
        ) : (
          <Image source={DEFAULT_MUSIC_ARTWORK} className="h-full w-full rounded-lg" resizeMode="cover" />
        )}
      </Pressable>
      <View className="flex-1 pr-3">
        <Text className={`mb-1 text-base ${isActive ? 'font-extrabold' : 'font-semibold'}`} style={{ color: theme.text }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
          {item.artist || t('unknown_artist', 'Unknown Artist')} • {item.album || t('unknown_album', 'Unknown Album')}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        {showDuration ? (
          <Text className="text-sm font-medium" style={{ color: isActive ? theme.text : theme.mutedText }}>
            {formatDuration(item.duration)}
          </Text>
        ) : null}
        {isPlaying ? <AudioWaveBars playing color={theme.text} /> : null}
        {rightAction ?? (onOpenTrackMenu ? (
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={8}
            onPress={event => {
              event.stopPropagation();
              onOpenTrackMenu(item, event);
            }}
          >
            <DotsIcon size={22} color={theme.text} />
          </Pressable>
        ) : null)}
      </View>
    </Pressable>
  );
};

export default SongListItem;
