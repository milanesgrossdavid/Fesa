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
    <View className="py-4">
      {artists.length ? (
        <View className="flex-row flex-wrap justify-between gap-y-6 px-4">
          {artists.slice(0, 6).map(artist => (
            <Pressable
              key={artist.id}
              className="w-[48%] items-center"
              onPress={() => onOpenArtist(artist)}
            >
              <LibraryArtwork
                artwork={artist.artwork}
                fallback={artist.name.charAt(0).toUpperCase()}
                className="h-36 w-36 rounded-full"
                fallbackTextClassName="text-6xl font-bold text-[#b64400]"
              />
              <View className="mt-3 w-full px-2">
                <AutoScrollingText
                  key={`${artist.id}-name`}
                  className="text-center text-base font-bold"
                  style={{ color: theme.text }}
                >
                  {artist.name}
                </AutoScrollingText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text className="rounded-3xl px-5 py-6 text-center text-sm" style={{ backgroundColor: theme.background, color: theme.mutedText }}>
          {t('favorite_artists_empty')}
        </Text>
      )}
    </View>
  );
};

export default HomeFavoriteArtistsSection;