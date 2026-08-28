import React from 'react';
import { Pressable, Text } from 'react-native';
import LibraryArtwork from './LibraryArtwork';
import { useAppSettings } from '../settings/appSettings';

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
  const { theme } = useAppSettings();

  return (
    <Pressable className="mb-5 flex-1" onPress={onPress}>
      <LibraryArtwork
        artwork={playlist.songs[0]?.artwork}
        className="aspect-square w-full rounded-2xl"
        fallbackTextClassName="text-4xl"
        fallbackTextStyle={{ color: theme.accent }}
      />
      <Text className="mt-2 text-center text-base font-bold" style={{ color: theme.text }} numberOfLines={1}>
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