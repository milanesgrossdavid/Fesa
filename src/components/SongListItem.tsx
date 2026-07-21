import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Song } from '../../modules/local-music';
import { formatDuration } from '../utils/time';

interface SongListItemProps {
  item: Song;
  isActive?: boolean;
  isPlaying?: boolean;
  onPress?: () => void;
  onTogglePlayPause?: () => void;
}

const SongListItem = ({ item, isActive = false, isPlaying = false, onPress, onTogglePlayPause }: SongListItemProps) => {
  return (
    <Pressable
      className={`flex-row items-center px-5 py-3 ${isActive ? 'bg-[#252525]' : ''}`}
      onPress={onPress}
    >
      <Pressable
        className={`w-12 h-12 rounded-lg mr-4 justify-center items-center ${isActive ? 'bg-[#b64400]' : 'bg-[#333333]'}`}
        onPress={isActive ? onTogglePlayPause : onPress}
      >
        <Text className={`text-2xl ${isActive ? 'text-white' : 'text-[#707070]'}`}>{isPlaying ? 'Ⅱ' : '♪'}</Text>
      </Pressable>
      <View className="flex-1 pr-3">
        <Text className="text-base font-bold text-white mb-1" numberOfLines={1}>{item.title}</Text>
        <Text className="text-sm text-[#707070]" numberOfLines={1}>
          {item.artist || 'Artista Desconocido'} • {item.album || 'Álbum Desconocido'}
        </Text>
      </View>
      <Text className={`text-sm font-medium ${isActive ? 'text-[#b64400]' : 'text-[#707070]'}`}>{formatDuration(item.duration)}</Text>
    </Pressable>
  );
};

export default SongListItem;