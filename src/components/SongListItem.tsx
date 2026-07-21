import React from 'react';
import { View, Text } from 'react-native';
import { Song } from '../../modules/local-music';
import { formatDuration } from '../utils/time';

interface SongListItemProps {
  item: Song;
}

const SongListItem = ({ item }: SongListItemProps) => {
  return (
    <View className="flex-row items-center px-5 py-3">
      <View className="w-12 h-12 bg-[#333333] rounded-lg mr-4 justify-center items-center">
        <Text className="text-2xl text-[#707070]">♪</Text>
      </View>
      <View className="flex-1 pr-3">
        <Text className="text-base font-bold text-white mb-1" numberOfLines={1}>{item.title}</Text>
        <Text className="text-sm text-[#707070]" numberOfLines={1}>
          {item.artist || 'Artista Desconocido'} • {item.album || 'Álbum Desconocido'}
        </Text>
      </View>
      <Text className="text-sm text-[#707070] font-medium">{formatDuration(item.duration)}</Text>
    </View>
  );
};

export default SongListItem;