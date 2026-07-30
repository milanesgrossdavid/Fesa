import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Song } from "../../modules/local-music";
import LibraryArtwork from "./LibraryArtwork";
import { PlayIcon } from "../Icons";

type SongGroup = {
  id: string;
  name: string;
  subtitle: string;
  songs: Song[];
  artwork?: string | null;
};

interface HomeMostPlayedSectionProps {
  group: SongGroup;
  limit: number;
  onOpenGroup: () => void;
  onPlaySong: (index: number) => void;
}

const UNKNOWN_ARTIST = "Artista Desconocido";

const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const cleanValue = value?.trim();

  return cleanValue || fallback;
};

const HomeMostPlayedSection = ({
  group,
  limit,
  onOpenGroup,
  onPlaySong,
}: HomeMostPlayedSectionProps) => {
  const featuredSongs = group.songs.slice(0, limit);
  const topSong = featuredSongs[0];
  const remainingSongs = featuredSongs.slice(1);

  return (
    <View className="pt-2">
      <View className="mb-3 flex-row items-center justify-between px-5">
        <Text className="text-lg font-bold text-white">Más escuchadas</Text>
      </View>

      {topSong ? (
        <>
          <View className="mx-5 mb-4">
            <View className="aspect-[1.75] w-full overflow-hidden rounded-3xl bg-[#333333]">
              <LibraryArtwork
                artwork={topSong.artwork}
                className="h-full w-full rounded-3xl"
              />
              <View className="absolute left-4 top-4 rounded-full bg-[#f5f5f5] px-4 py-2">
                <Text className="text-xs font-bold text-black">Top 1</Text>
              </View>
              <View className="absolute bottom-0 left-0 right-0 py-2 px-4 bg-black/25 flex flex-row justify-between items-center">
                <View className="flex flex-col">
                  <Text
                    className="text-xl font-bold text-white"
                    numberOfLines={1}
                  >
                    {topSong.title}
                  </Text>
                  <Text
                    className="mt-1 text-sm text-white/90"
                    numberOfLines={1}
                  >
                    {normalizeValue(topSong.artist, UNKNOWN_ARTIST)}
                  </Text>
                </View>
                <Pressable
                  className="rounded-full bg-[#c3c3c3] p-4"
                  onPress={() => onPlaySong(0)}
                >
                  <PlayIcon size={24} color="#f5f5f5" />
                </Pressable>
              </View>
            </View>
          </View>

          {remainingSongs.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            >
              {remainingSongs.map((song, index) => (
                <View key={song.id} className="w-56">
                  <View className="aspect-[1.35] w-full overflow-hidden rounded-3xl bg-[#333333]">
                    <LibraryArtwork
                      artwork={song.artwork}
                      className="h-full w-full rounded-3xl"
                    />
                    <View className="absolute bottom-0 left-0 right-0 flex flex-row items-center justify-between py-2 px-4 bg-black/25">
                      <View className="mr-3 flex-1 flex-col">
                        <Text
                          className="text-base font-bold text-white"
                          numberOfLines={1}
                        >
                          {song.title}
                        </Text>
                        <Text
                          className="mt-1 text-xs text-white/90"
                          numberOfLines={1}
                        >
                          {normalizeValue(song.artist, UNKNOWN_ARTIST)}
                        </Text>
                      </View>
                      <Pressable
                        className="rounded-full bg-[#c3c3c3] p-3"
                        onPress={() => onPlaySong(index + 1)}
                      >
                        <PlayIcon size={20} color="#f5f5f5" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : (
        <Text className="px-5 py-6 text-center text-sm text-[#707070]">
          Cuando empieces a reproducir canciones, aquí aparecerán tus más
          escuchadas.
        </Text>
      )}
    </View>
  );
};

export default HomeMostPlayedSection;
