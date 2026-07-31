import React from 'react';
import { Pressable, Text } from 'react-native';
import LibraryArtwork from './LibraryArtwork';

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

const LibraryPlaylistCard = ({ playlist, onPress }: LibraryPlaylistCardProps) => (
  <Pressable className="mb-5 flex-1" onPress={onPress}>
    <LibraryArtwork
      artwork={playlist.songs[0]?.artwork}
      className="aspect-square w-full rounded-2xl"
      fallbackTextClassName="text-4xl text-[#b64400]"
    />
    <Text className="mt-2 text-center text-base font-bold text-white" numberOfLines={1}>
      {playlist.name}
    </Text>
    {playlist.subtitle ? (
      <Text className="mt-1 text-center text-xs text-[#707070]" numberOfLines={1}>
        {playlist.subtitle}
      </Text>
    ) : null}
  </Pressable>
);

export default LibraryPlaylistCard;