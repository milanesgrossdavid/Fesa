import React, { memo, useCallback } from 'react';
import { GestureResponderEvent, Pressable, View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Song } from '../../modules/local-music';
import { getTranslation } from '../i18n/translations';
import { CheckIcon, DotsIcon } from '../Icons';
import { formatDuration } from '../utils/time';
import AudioWaveBars from './AudioWaveBars';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';

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
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const unknownArtistLabel = getTranslation(language.id as any, 'unknown_artist', 'Unknown Artist');
  const unknownAlbumLabel = getTranslation(language.id as any, 'unknown_album', 'Unknown Album');

  const handleArtworkPress = useCallback(() => {
    if (isActive) onTogglePlayPause?.();
    else onPress?.();
  }, [isActive, onPress, onTogglePlayPause]);

  const handleMenuPress = useCallback((event: GestureResponderEvent) => {
    event.stopPropagation();
    onOpenTrackMenu?.(item, event);
  }, [item, onOpenTrackMenu]);

  return (
    <Pressable
      className="mx-4 mb-2 flex-row items-center rounded-2xl border px-2 py-2"
      style={{
        backgroundColor: isSelected ? theme.accent + '1A' : isActive ? theme.surface : 'transparent',
        borderColor: isSelected ? theme.accent : isActive ? theme.border : 'transparent',
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
        className="mr-4 h-12 w-12 items-center justify-center overflow-hidden rounded-2xl"
        style={{ backgroundColor: isActive ? theme.surface : theme.background }}
        onPress={handleArtworkPress}
      >
        {item.artwork ? (
          <ExpoImage
            source={{ uri: item.artwork }}
            style={{ width: '100%', height: '100%', borderRadius: 8 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.artwork}
            transition={80}
          />
        ) : (
          <ExpoImage
            source={DEFAULT_MUSIC_ARTWORK}
            style={{ width: '100%', height: '100%', borderRadius: 8 }}
            contentFit="cover"
          />
        )}
      </Pressable>
      <View className="flex-1 pr-3">
        <Text className={`mb-1 text-base ${isActive ? 'font-extrabold' : 'font-semibold'}`} style={{ color: theme.text }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
          {item.artist || unknownArtistLabel} • {item.album || unknownAlbumLabel}
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
            onPress={handleMenuPress}
          >
            <DotsIcon size={22} color={theme.text} />
          </Pressable>
        ) : null)}
      </View>
    </Pressable>
  );
};

function areEqual(prev: SongListItemProps, next: SongListItemProps) {
  return (
    prev.item === next.item
    && prev.isActive === next.isActive
    && prev.isPlaying === next.isPlaying
    && prev.isSelected === next.isSelected
    && prev.onPress === next.onPress
    && prev.onLongPress === next.onLongPress
    && prev.onTogglePlayPause === next.onTogglePlayPause
    && prev.onOpenTrackMenu === next.onOpenTrackMenu
    && prev.rightAction === next.rightAction
    && prev.showDuration === next.showDuration
    && prev.showSelectionIndicator === next.showSelectionIndicator
  );
}

export default memo(SongListItem, areEqual);
