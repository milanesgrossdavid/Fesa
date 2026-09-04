import React from 'react';
import { Pressable, Text, View } from 'react-native';
import LibraryArtwork from './LibraryArtwork';
import { useAppSettingsTheme } from '../settings/appSettings';

type PlaylistCardData = {
  id: string;
  name: string;
  subtitle: string;
  songs: { artwork?: string | null }[];
};

interface LibraryPlaylistCardProps {
  playlist: PlaylistCardData;
  onPress: () => void;
}

const LibraryPlaylistCard = ({ playlist, onPress }: LibraryPlaylistCardProps) => {
  const theme = useAppSettingsTheme();

  return (
    <Pressable className="mb-5 flex-1 rounded-[26px] p-3" onPress={onPress}>
      <View className="overflow-hidden rounded-[22px]">
        <LibraryArtwork
          artwork={playlist.songs[0]?.artwork}
          className="aspect-square w-full rounded-[20px]"
          fallbackTextClassName="text-4xl font-bold text-white"
          fallbackTextStyle={{ color: theme.text }}
        />
      </View>

      <Text className="mt-3 text-center text-base font-bold" style={{ color: theme.text }} numberOfLines={1}>
        {playlist.name}
      </Text>
      {playlist.subtitle ? (
        <Text className="mt-1 text-center text-xs" style={{ color: theme.mutedText }} numberOfLines={1}>
          {playlist.subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
};

export default LibraryPlaylistCard;