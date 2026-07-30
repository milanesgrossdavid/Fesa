import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';
import LibraryArtwork from './LibraryArtwork';

type SongGroup = {
  id: string;
  name: string;
  subtitle: string;
  songs: Song[];
  artwork?: string | null;
};

interface HomeRecommendedArtistsSectionProps {
  artists: SongGroup[];
  onOpenArtist: (artist: SongGroup) => void;
}

const HomeRecommendedArtistsSection = ({
  artists,
  onOpenArtist,
}: HomeRecommendedArtistsSectionProps) => (
  <View className="px-5 pt-7">
    <Text className="mb-3 text-lg font-bold text-white">Artistas recomendados</Text>
    <View className="flex-row flex-wrap gap-4">
      {artists.map(artist => (
        <Pressable key={artist.id} className="w-[47%]" onPress={() => onOpenArtist(artist)}>
          <LibraryArtwork
            artwork={artist.artwork}
            fallback={artist.name.charAt(0).toUpperCase()}
            className="aspect-[1.15] w-full rounded-3xl"
          />
          <Text className="mt-2 text-sm font-bold text-white" numberOfLines={1}>
            {artist.name}
          </Text>
        </Pressable>
      ))}
    </View>
  </View>
);

export default HomeRecommendedArtistsSection;