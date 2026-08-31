import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';
import LibraryArtwork from './LibraryArtwork';
import AutoScrollingText from './AutoScrollingText';
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
  <View className="py-4">
    <View className="flex-row flex-wrap justify-between gap-y-6 px-4">
      {artists.map(artist => (
        <Pressable key={artist.id} className="w-[47%]" onPress={() => onOpenArtist(artist)}>
          <LibraryArtwork
            artwork={artist.artwork}
            fallback={artist.name.charAt(0).toUpperCase()}
            className="aspect-square w-full rounded-2xl"
          />
          <View className="w-full px-1">
            <AutoScrollingText key={`${artist.id}-name`} className="mt-2 text-center text-sm font-bold" style={{ color: theme.text }}>
              {artist.name}
            </AutoScrollingText>
          </View>
        </Pressable>
      ))}
    </View>
  </View>
)};

export default HomeRecommendedArtistsSection;