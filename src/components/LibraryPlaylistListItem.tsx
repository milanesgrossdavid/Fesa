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
    className="mx-4 mb-3 overflow-hidden rounded-2xl border px-4 py-4"
    style={{
      backgroundColor: isSelected ? theme.accent : theme.surface,
      borderColor: isSelected ? theme.accent : theme.border,
      shadowColor: '#000',
      shadowOpacity: isSelected ? 0.14 : 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    }}
    onPress={onPress}
    onLongPress={onLongPress}
    accessibilityRole="button"
    accessibilityLabel={playlist.name}
    accessibilityState={{ selected: isSelected }}
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
        className="ml-3 h-10 w-10 items-center justify-center rounded-xl"
        hitSlop={8}
        style={({ pressed }) => ({ backgroundColor: pressed ? `${theme.text}14` : 'transparent', opacity: pressed ? 0.7 : 1 })}
        onPress={event => {
          event.stopPropagation();
          onActionsPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Actions: ${playlist.name}`}
      >
        <DotsIcon size={22} color= {isSelected ? theme.surface : theme.text } />
      </Pressable>
    </View>
  </Pressable>
)};

export default LibraryPlaylistListItem;