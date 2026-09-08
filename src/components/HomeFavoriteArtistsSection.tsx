import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';
import LibraryArtwork from './LibraryArtwork';
import AutoScrollingText from './AutoScrollingText';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import { useTranslation } from '../i18n/translations';

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
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const { t } = useTranslation(language.id);

  return (
    <View className="py-2">
      {artists.length ? (
        <View className="flex-row flex-wrap justify-between gap-y-4 px-4">
          {artists.slice(0, 6).map(artist => (
            <Pressable
              key={artist.id}
              className="w-[47%] items-center rounded-2xl p-2"
              style={({ pressed }) => ({ backgroundColor: pressed ? theme.surface : 'transparent', opacity: pressed ? 0.72 : 1 })}
              onPress={() => onOpenArtist(artist)}
              accessibilityRole="button"
              accessibilityLabel={artist.name}
            >
              <LibraryArtwork
                artwork={artist.artwork}
                fallback={artist.name.charAt(0).toUpperCase()}
                className="aspect-square w-full rounded-xl"
              />
              <View className="mt-2 w-full px-1">
                <AutoScrollingText
                  key={`${artist.id}-name`}
                  className="text-center text-sm font-bold"
                  style={{ color: theme.text }}
                >
                  {artist.name}
                </AutoScrollingText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text className="mx-4 rounded-2xl px-4 py-5 text-center text-sm" style={{ backgroundColor: theme.surface, color: theme.mutedText }}>
          {t('favorite_artists_empty')}
        </Text>
      )}
    </View>
  );
};

export default HomeFavoriteArtistsSection;