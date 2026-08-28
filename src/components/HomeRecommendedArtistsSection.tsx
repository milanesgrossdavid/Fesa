import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';
import LibraryArtwork from './LibraryArtwork';
import { useAppSettings } from '../settings/appSettings';

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
}: HomeRecommendedArtistsSectionProps) => {
  const { theme } = useAppSettings();

  return (
  <View className="mx-4 px-4 py-4">
    <Text className="mb-2 text-2xl text-center font-bold" style={{ color: theme.text }}>Artistas recomendados</Text>
    <View className="flex-row flex-wrap gap-4">
      {artists.map(artist => (
        <Pressable key={artist.id} className="w-[47%]" onPress={() => onOpenArtist(artist)}>
          <LibraryArtwork
            artwork={artist.artwork}
            fallback={artist.name.charAt(0).toUpperCase()}
            className="aspect-[1.15] w-full rounded-3xl"
          />
          <Text className="mt-2 text-sm font-bold text-center" style={{ color: theme.text }} numberOfLines={1}>
            {artist.name}
          </Text>
        </Pressable>
      ))}
    </View>
  </View>
)};

export default HomeRecommendedArtistsSection;