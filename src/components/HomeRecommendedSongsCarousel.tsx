import React, { useMemo, useRef } from 'react';
import { Animated, Dimensions, Pressable, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';
import { PlayIcon } from '../Icons';
import LibraryArtwork from './LibraryArtwork';
import AutoScrollingText from './AutoScrollingText';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import { useTranslation } from '../i18n/translations';

interface HomeRecommendedSongsCarouselProps {
  songs: Song[];
  onPlaySong: (index: number) => void;
}
const SCREEN_WIDTH = Dimensions.get('window').width;

const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const cleanValue = value?.trim();

  return cleanValue || fallback;
};

const HomeRecommendedSongsCarousel = ({
  songs,
  onPlaySong,
}: HomeRecommendedSongsCarouselProps) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const circularSongs = useMemo(
    () => (songs.length > 3 ? [...songs, ...songs] : songs),
    [songs]
  );
  const cardWidth = Math.min(SCREEN_WIDTH * 0.68, 270);
  const cardGap = 18;
  const snapInterval = cardWidth + cardGap;
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const { t } = useTranslation(language.id);

  return (
    <View className="py-2">
      {circularSongs.length ? (
        <Animated.FlatList
          horizontal
          data={circularSongs}
          keyExtractor={(song, index) => `${song.id}-${index}`}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={snapInterval}
          contentContainerStyle={{ paddingHorizontal: (SCREEN_WIDTH - cardWidth) / 2, paddingBottom: 26 }}
          ItemSeparatorComponent={() => <View style={{ width: cardGap }} />}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          renderItem={({ item: song, index }) => {
            const inputRange = [
              (index - 1) * snapInterval,
              index * snapInterval,
              (index + 1) * snapInterval,
            ];
            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [42, 0, 42],
              extrapolate: 'clamp',
            });
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.82, 1, 0.82],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.55, 1, 0.55],
              extrapolate: 'clamp',
            });
            const songIndex = songs.findIndex(recommendedSong => recommendedSong.id === song.id);
            const playIndex = songIndex >= 0 ? songIndex : index % songs.length;

            return (
              <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
                <View className="overflow-hidden rounded-2xl" style={{ width: cardWidth, backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
                  <View className="aspect-[1.55] w-full">
                    <LibraryArtwork artwork={song.artwork} className="h-full w-full rounded-2xl" />
                    <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between bg-black/30 px-4 py-2">
                      <View className="mr-2 flex-1">
                        <AutoScrollingText key={`${song.id}-title`} className="text-lg font-bold text-white">
                          {song.title}
                        </AutoScrollingText>
                        <AutoScrollingText key={`${song.id}-artist`} className="mt-1 text-sm text-white/90">
                          {normalizeValue(song.artist, t('unknown_artist'))}
                        </AutoScrollingText>
                      </View>
                      <Pressable
                        className="h-12 w-12 items-center justify-center rounded-full"
                        style={({ pressed }) => ({ backgroundColor: theme.background, opacity: pressed ? 0.65 : 1 })}
                        onPress={() => onPlaySong(playIndex)}
                        accessibilityRole="button"
                        accessibilityLabel={t('play_song', 'Play song')}
                      >
                        <PlayIcon size={22} color={theme.text} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          }}
        />
      ) : (
        <Text className="px-5 py-6 text-center text-sm text-[#707070]">
          {t('recommended_songs_empty')}
        </Text>
      )}
    </View>
  );
};

export default HomeRecommendedSongsCarousel;