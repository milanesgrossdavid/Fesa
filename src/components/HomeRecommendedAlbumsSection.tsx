import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';
import LibraryArtwork from './LibraryArtwork';
import AutoScrollingText from './AutoScrollingText';
import { useAppSettingsTheme } from '../settings/appSettings';

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
  const theme = useAppSettingsTheme();

  return (
    <View className="py-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {albums.map(album => (
          <Pressable
            key={album.id}
            className="w-40 rounded-2xl p-2"
            style={({ pressed }) => ({ backgroundColor: pressed ? theme.surface : 'transparent', opacity: pressed ? 0.72 : 1 })}
            onPress={() => onOpenAlbum(album)}
            accessibilityRole="button"
            accessibilityLabel={album.name}
          >
            <LibraryArtwork artwork={album.artwork} className="aspect-square w-full rounded-xl" />
            <View className="w-full px-1">
              <AutoScrollingText key={`${album.id}-name`} className="mt-2 text-base font-bold" style={{ color: theme.text }}>
                {album.name}
              </AutoScrollingText>
              <AutoScrollingText key={`${album.id}-subtitle`} className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                {album.subtitle}
              </AutoScrollingText>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

export default HomeRecommendedAlbumsSection;