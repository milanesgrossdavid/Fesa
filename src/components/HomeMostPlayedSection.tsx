import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Song } from "../../modules/local-music";
import LibraryArtwork from "./LibraryArtwork";
import AutoScrollingText from "./AutoScrollingText";
import { PlayIcon } from "../Icons";
import { useAppSettings } from "../settings/appSettings";
import { useTranslation } from "../i18n/translations";

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
  const { theme, language } = useAppSettings();
  const { t } = useTranslation(language.id);
  const featuredSongs = group.songs.slice(0, limit);
  const topSong = featuredSongs[0];
  const remainingSongs = featuredSongs.slice(1);

  return (
    <View className="px-4 py-4">
      {topSong ? (
        <>
          <View className="mx-4 mb-4">
            <View className="aspect-[1.75] w-full overflow-hidden rounded-3xl" style={{ backgroundColor: theme.surface }}>
              <LibraryArtwork
                artwork={topSong.artwork}
                className="h-full w-full rounded-3xl"
              />
              <View className="absolute bottom-0 left-0 right-0 py-2 px-4 bg-black/25 flex flex-row justify-between items-center">
                <View className="mr-3 flex-1 flex-col">
                  <AutoScrollingText className="text-xl font-bold text-white">
                    {topSong.title}
                  </AutoScrollingText>
                  <AutoScrollingText className="mt-2 text-sm text-white/90">
                    {normalizeValue(topSong.artist, t('unknown_artist'))}
                  </AutoScrollingText>
                </View>
                <Pressable
                  className="rounded-full p-4"
                  style={{ backgroundColor: theme.background }}
                  onPress={() => onPlaySong(0)}
                >
                  <PlayIcon size={24} color={theme.text} />
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
                  <View className="aspect-[1.35] w-full overflow-hidden rounded-3xl" style={{ backgroundColor: theme.surface }}>
                    <LibraryArtwork
                      artwork={song.artwork}
                      className="h-full w-full rounded-3xl"
                    />
                    <View className="absolute bottom-0 left-0 right-0 flex flex-row items-center justify-between py-2 px-4 bg-black/25">
                      <View className="mr-3 flex-1 flex-col">
                        <AutoScrollingText className="text-base font-bold text-white">
                          {song.title}
                        </AutoScrollingText>
                        <AutoScrollingText className="mt-1 text-xs text-white/90">
                          {normalizeValue(song.artist, t('unknown_artist'))}
                        </AutoScrollingText>
                      </View>
                      <Pressable
                        className="rounded-full p-3"
                        style={{ backgroundColor: theme.background }}
                        onPress={() => onPlaySong(index + 1)}
                      >
                        <PlayIcon size={20} color={theme.text} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : (
        <Text className="px-5 py-6 text-center text-sm" style={{ color: theme.mutedText }}>
          {t('most_played_empty')}
        </Text>
      )}
    </View>
  );
};

export default HomeMostPlayedSection;
