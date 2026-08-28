import React, { useMemo, useRef } from 'react';
import { Animated, Dimensions, Pressable, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';
import { PlayIcon } from '../Icons';
import LibraryArtwork from './LibraryArtwork';
import AutoScrollingText from './AutoScrollingText';
import { useAppSettings } from '../settings/appSettings';

interface HomeRecommendedSongsCarouselProps {
  songs: Song[];
  onPlaySong: (index: number) => void;
}

const UNKNOWN_ARTIST = 'Artista Desconocido';
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
    () => songs.length > 3 ? [...songs, ...songs] : songs,
    [songs]
  );
  const cardWidth = Math.min(SCREEN_WIDTH * 0.68, 270);
  const cardGap = 18;
  const snapInterval = cardWidth + cardGap;
  const { theme } = useAppSettings();
  

  return (
    <View className="px-2 py-2">
      <Text className="mb-2 text-2xl text-center font-bold" style={{ color: theme.text }}>Canciones recomendadas</Text>
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
                <View
                  className="overflow-hidden rounded-[34px] bg-[#333333]"
                  style={{ width: cardWidth }}
                >
                  <View className="aspect-[1.55] w-full">
                    <LibraryArtwork artwork={song.artwork} className="h-full w-full rounded-[34px]" />
                    <View className="absolute bottom-0 left-0 right-0 flex flex-row items-center justify-between py-2 px-4 bg-black/30">
                      <View className="mr-2 flex-1 flex-col">
                        <AutoScrollingText className="text-lg font-bold text-white">
                          {song.title}
                        </AutoScrollingText>
                        <AutoScrollingText className="mt-1 text-sm text-white/90">
                          {normalizeValue(song.artist, UNKNOWN_ARTIST)}
                        </AutoScrollingText>
                      </View>
                      <Pressable
                        className="rounded-full p-4"
                        style={{ backgroundColor: theme.background }}
                        onPress={() => onPlaySong(playIndex)}
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
          Cuando se cargue tu música, aquí aparecerán canciones recomendadas para escuchar.
        </Text>
      )}
    </View>
  );
};

export default HomeRecommendedSongsCarousel;