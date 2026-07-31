import React from 'react';
import { GestureResponderEvent, Image, Pressable, View, Text } from 'react-native';
import { Song } from '../../modules/local-music';
import { CheckIcon, DotsIcon } from '../Icons';
import { formatDuration } from '../utils/time';
import AudioWaveBars from './AudioWaveBars';

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
}: SongListItemProps) => (
  <Pressable
    className={`mx-4 mb-2 flex-row items-center rounded-2xl border px-3 py-3 ${isSelected ? 'border-white/40 bg-white/10' : isActive ? 'border-white/20 bg-white/5' : 'border-transparent bg-transparent'}`}
    onPress={onPress}
    onLongPress={onLongPress}
    delayLongPress={350}
  >
    {showSelectionIndicator ? (
      <View
        className="mr-3 h-6 w-6 items-center justify-center rounded-full"
        style={{
          borderColor: isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.3)',
          borderWidth: isSelected ? 0 : 1,
        }}
      >
        {isSelected ? <CheckIcon size={22} color="#f5f5f5" /> : null}
      </View>
    ) : null}
    <Pressable
      className={`mr-4 h-12 w-12 items-center justify-center overflow-hidden rounded-2xl ${isActive ? 'bg-white/20' : 'bg-[#333333]'}`}
      onPress={isActive ? onTogglePlayPause : onPress}
    >
      {item.artwork ? (
        <Image source={{ uri: item.artwork }} className="h-full w-full rounded-lg" resizeMode="cover" />
      ) : (
        <Text className={`text-2xl ${isActive ? 'text-white' : 'text-[#707070]'}`}>♪</Text>
      )}
    </Pressable>
    <View className="flex-1 pr-3">
      <Text className={`mb-1 text-base ${isActive ? 'font-extrabold text-white' : 'font-semibold text-white/90'}`} numberOfLines={1}>
        {item.title}
      </Text>
      <Text className="text-sm text-white/45" numberOfLines={1}>
        {item.artist || 'Artista Desconocido'} • {item.album || 'Álbum Desconocido'}
      </Text>
    </View>
    <View className="flex-row items-center gap-3">
      {showDuration ? (
        <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-white/45'}`}>
          {formatDuration(item.duration)}
        </Text>
      ) : null}
      {isPlaying ? <AudioWaveBars playing color="#ffffff" /> : null}
      {rightAction ?? (onOpenTrackMenu ? (
        <Pressable
          className="h-9 w-9 items-center justify-center rounded-full"
          hitSlop={8}
          onPress={event => {
            event.stopPropagation();
            onOpenTrackMenu(item, event);
          }}
        >
          <DotsIcon size={22} color="#ffffff" />
        </Pressable>
      ) : null)}
    </View>
  </Pressable>
);

export default SongListItem;
