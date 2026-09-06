import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { DotsIcon } from '../Icons';
import LibraryArtwork from './LibraryArtwork';
import { useAppSettingsTheme } from '../settings/appSettings';


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
}: LibraryPlaylistListItemProps) => {
   const theme = useAppSettingsTheme();
  
  return (
  <Pressable
    className="mx-5 mb-3 overflow-hidden rounded-[26px] border-4 px-4 py-4"
    style={{ backgroundColor: isSelected ? theme.accent : theme.surface, borderColor: isSelected ? theme.accent : theme.border }}
    onPress={onPress}
    onLongPress={onLongPress}
  >
    <View className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
    <View className="flex-row items-center">
      <View className="mr-4 rounded-[22px]  p-1">
        <LibraryArtwork
          artwork={playlist.songs[0]?.artwork}
          className="h-14 w-14 rounded-2xl"
          fallbackTextClassName="text-3xl text-[#f5f5f5]"
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-extrabold " 
        style={{ color: isSelected ? theme.surface : theme.text }}
         numberOfLines={1}>
          {playlist.name}
        </Text>
        {playlist.subtitle ? (
          <Text className="mt-1 text-sm font-medium"
          style={{ color: isSelected ? theme.surface : theme.text }} >{playlist.subtitle}</Text>
        ) : null}
      </View>
      <Pressable
        className="ml-3 h-10 w-10 items-center justify-center rounded-full  "
        hitSlop={8}
        onPress={event => {
          event.stopPropagation();
          onActionsPress();
        }}
      >
        <DotsIcon size={22} color= {isSelected ? theme.surface : theme.text } />
      </Pressable>
    </View>
  </Pressable>
)};

export default LibraryPlaylistListItem;