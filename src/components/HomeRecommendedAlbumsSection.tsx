import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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

interface HomeRecommendedAlbumsSectionProps {
  albums: SongGroup[];
  onOpenAlbum: (album: SongGroup) => void;
}

const HomeRecommendedAlbumsSection = ({
  albums,
  onOpenAlbum,
}: HomeRecommendedAlbumsSectionProps) => {
  const { theme } = useAppSettings();

  return (
  <View className="pt-7">
    <Text className="mb-3 px-5 text-lg font-bold" style={{ color: theme.text }}>Álbumes recomendados</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 18 }}>
      {albums.map(album => (
        <Pressable key={album.id} className="w-40" onPress={() => onOpenAlbum(album)}>
          <LibraryArtwork artwork={album.artwork} className="aspect-square w-full rounded-3xl" />
          <Text className="mt-3 text-base font-bold" style={{ color: theme.text }} numberOfLines={1}>
            {album.name}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
            {album.subtitle}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  </View>
)};

export default HomeRecommendedAlbumsSection;