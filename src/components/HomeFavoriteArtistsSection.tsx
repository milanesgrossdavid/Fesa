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
  <View className="px-5 pt-6">
    <Text className="mb-3 text-lg font-bold" style={{ color: theme.text }}>Artistas favoritos</Text>
    {artists.length ? (
      <View className="flex-row flex-wrap justify-between gap-y-5">
        {artists.slice(0, 6).map(artist => (
          <Pressable key={artist.id} className="w-[31%] items-center" onPress={() => onOpenArtist(artist)}>
            <LibraryArtwork
              artwork={artist.artwork}
              fallback={artist.name.charAt(0).toUpperCase()}
              className="h-24 w-24 rounded-full"
              fallbackTextClassName="text-4xl font-bold text-[#b64400]"
            />
            <Text className="mt-2 text-center text-sm font-bold" style={{ color: theme.text }} numberOfLines={1}>
              {artist.name}
            </Text>
            <Text className="mt-1 text-center text-xs" style={{ color: theme.mutedText }} numberOfLines={1}>
              {artist.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>
    ) : (
      <Text className="rounded-3xl bg-[#252525] px-5 py-6 text-center text-sm text-[#707070]">
        Cuando escuches canciones, aquí aparecerán tus artistas favoritos.
      </Text>
    )}
  </View>
)};

export default HomeFavoriteArtistsSection;