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

interface HomeFavoriteArtistsSectionProps {
  artists: SongGroup[];
  onOpenArtist: (artist: SongGroup) => void;
}

const HomeFavoriteArtistsSection = ({
  artists,
  onOpenArtist,
}: HomeFavoriteArtistsSectionProps) => {
  const { theme } = useAppSettings();

  return (
  <View className="px-4 py-4">
    <Text className="mb-2 text-2xl text-center font-bold" style={{ color: theme.text }}>Artistas favoritos</Text>
    {artists.length ? (
      <View className="flex-row flex-wrap justify-between gap-y-5">
        {artists.slice(0, 6).map(artist => (
          <Pressable key={artist.id} className="w-[47%] items-center" onPress={() => onOpenArtist(artist)}>
            <LibraryArtwork
              artwork={artist.artwork}
              fallback={artist.name.charAt(0).toUpperCase()}
              className="h-24 w-24 rounded-full"
              fallbackTextClassName="text-4xl font-bold text-[#b64400]"
            />
            <AutoScrollingText className="mt-2 text-center text-sm font-bold" style={{ color: theme.text }}>
              {artist.name}
            </AutoScrollingText>
            <AutoScrollingText className="mt-1 text-center text-xs" style={{ color: theme.mutedText }}>
              {artist.subtitle}
            </AutoScrollingText>
          </Pressable>
        ))}
      </View>
    ) : (
      <Text className="rounded-3xl px-5 py-6 text-center text-sm" style={{ backgroundColor: theme.background, color: theme.mutedText }}>
        Cuando escuches canciones, aquí aparecerán tus artistas favoritos.
      </Text>
    )}
  </View>
)};

export default HomeFavoriteArtistsSection;