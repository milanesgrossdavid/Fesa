import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { DotsIcon } from '../Icons';
import LibraryArtwork from './LibraryArtwork';

type PlaylistListItemData = {
  id: string;
  name: string;
  subtitle: string;
  songs: { artwork?: string | null }[];
};

interface LibraryPlaylistListItemProps {
  playlist: PlaylistListItemData;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onActionsPress: () => void;
}

const LibraryPlaylistListItem = ({
  playlist,
  isSelected,
  onPress,
  onLongPress,
  onActionsPress,
}: LibraryPlaylistListItemProps) => (
  <Pressable
    className={`mx-5 mb-3 overflow-hidden rounded-[26px] border px-4 py-4 ${isSelected ? 'border-[#f5f5f5] bg-white/10' : 'border-[#333333] bg-[#252525]'}`}
    onPress={onPress}
    onLongPress={onLongPress}
  >
    <View className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
    <View className="flex-row items-center">
      <View className="mr-4 rounded-[22px] border border-white/10 bg-[#1d1d1f] p-1">
        <LibraryArtwork
          artwork={playlist.songs[0]?.artwork}
          className="h-14 w-14 rounded-2xl"
          fallbackTextClassName="text-3xl text-[#f5f5f5]"
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-extrabold text-white" numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text className="mt-1 text-sm font-medium text-white/45">{playlist.subtitle}</Text>
      </View>
      <Pressable
        className="ml-3 h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#1d1d1f]"
        hitSlop={8}
        onPress={event => {
          event.stopPropagation();
          onActionsPress();
        }}
      >
        <DotsIcon size={22} color="#ffffff" />
      </Pressable>
    </View>
  </Pressable>
);

export default LibraryPlaylistListItem;