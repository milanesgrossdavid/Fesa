import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  FlatList,
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Share,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { BlurView } from "expo-blur";
import { Asset, requestPermissionsAsync } from "expo-media-library";
import { captureRef } from "react-native-view-shot";

import { LinearGradient } from "expo-linear-gradient";

import { useDominantColor, withAlpha, hexToHsl, hslToHex } from "../hooks/useDominantColor";

import Ionicons from "@expo/vector-icons/Ionicons";

import { BackwardIcon, ForwardIcon } from "../Icons";

import { formatDuration } from "../utils/time";

import { useAppSettingsLanguage, useAppSettingsTheme } from "../settings/appSettings";
import { getTranslation } from "../i18n/translations";

import { useMusicPlayerUi, usePlaybackProgress } from "../audio/musicPlayer";

import type { Song } from "../../modules/local-music";

import { FontAwesome5 } from "@expo/vector-icons";

const DEFAULT_MUSIC_ARTWORK = require("../../assets/musicNotFound.jpg");
const FESA_LOGO = require("../../assets/icon-foreground.png");

// Fixed line height for the lyrics FlatList. Matches fontSize 22/16 + the
// internal Text line height so `getItemLayout` produces correct offsets
// (avoids the per-line onLayout scroll jank).
const LYRIC_LINE_HEIGHT = 44;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const SHARE_THEMES = [
  {
    id: "dynamic",
    name: "Color de la canción",
    background: "#1c1c1c",
    card: "#262626",
    text: "#f8f8f8",
    muted: "#d6d6d6",
    accent: "#ffffff",
  },
  {
    id: "deep",
    name: "Azul profundo",
    background: "#0c2c3a",
    card: "#123d4d",
    text: "#f5f7fa",
    muted: "#bdd7e3",
    accent: "#7bc7d8",
  },
  {
    id: "sand",
    name: "Arena",
    background: "#3f2b1f",
    card: "#5a3728",
    text: "#f7f2ee",
    muted: "#d9c2b0",
    accent: "#f3d1b5",
  },
  {
    id: "slate",
    name: "Grafito",
    background: "#20283a",
    card: "#2d374f",
    text: "#edf4ff",
    muted: "#b5c4dd",
    accent: "#9ac7ff",
  },
  {
    id: "mint",
    name: "Menta",
    background: "#0d2d2d",
    card: "#164242",
    text: "#eefef8",
    muted: "#c2e5d9",
    accent: "#8de0c4",
  },
  {
    id: "rose",
    name: "Rosa",
    background: "#3d1e34",
    card: "#5a2d4c",
    text: "#fff7fb",
    muted: "#f0d0e0",
    accent: "#ffb0d5",
  },
  {
    id: "sunset",
    name: "Atardecer",
    background: "#3a1f2b",
    card: "#5a2f46",
    text: "#fff5ee",
    muted: "#f4d2ba",
    accent: "#ff9f6e",
  },
  {
    id: "forest",
    name: "Bosque",
    background: "#11251a",
    card: "#1f3d2c",
    text: "#eefbf3",
    muted: "#cfe9d6",
    accent: "#76d7a2",
  },
  {
    id: "lavender",
    name: "Lavanda",
    background: "#1d1a2f",
    card: "#2f2a4d",
    text: "#f5f1ff",
    muted: "#d7d0f8",
    accent: "#ada3ff",
  },
  {
    id: "amber",
    name: "Ámbar",
    background: "#2a1b0f",
    card: "#4a2f1b",
    text: "#fff8ee",
    muted: "#f2d7b3",
    accent: "#ffbf69",
  },
  {
    id: "brand",
    name: "FESA",
    background: "#000000",
    card: "#101010",
    text: "#f5f7fa",
    muted: "#d1d5db",
    accent: "#ffffff",
  },
] as const;

type ShareTheme = (typeof SHARE_THEMES)[number];

const buildDynamicShareTheme = (baseHex: string): ShareTheme => {
  if (!/^#[0-9A-Fa-f]{6}$/.test(baseHex)) {
    return SHARE_THEMES[0];
  }
  const { hue, saturation, lightness } = hexToHsl(baseHex);
  const background = hslToHex(
    hue,
    clamp(saturation, 0.55, 0.85),
    clamp(lightness * 0.55 + 0.06, 0.14, 0.32),
  );
  const card = hslToHex(
    hue,
    clamp(saturation, 0.55, 0.9),
    clamp(lightness * 0.7 + 0.08, 0.2, 0.42),
  );
  const text = hslToHex(
    hue,
    clamp(saturation * 0.4, 0.12, 0.4),
    0.96,
  );
  const muted = hslToHex(
    hue,
    clamp(saturation * 0.55, 0.2, 0.55),
    0.78,
  );
  const accent = hslToHex(
    (hue + 18) % 360,
    clamp(Math.max(saturation, 0.55), 0.55, 0.9),
    clamp(Math.max(lightness, 0.45), 0.45, 0.72),
  );

  return {
    id: "dynamic",
    name: "Color de la canción",
    background,
    card,
    text,
    muted,
    accent,
  };
};

interface LyricsModalProps {
  song: Song | null;
  visible: boolean;
  onClose: () => void;
}

const parseLRC = (text: string) => {
  const lines: Array<{ time: number; text: string }> = [];

  const re = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/;

  for (const rawLine of text.split(/\r?\n/)) {
    const m = rawLine.match(re);

    if (m) {
      const min = parseInt(m[1], 10);
      const sec = parseFloat(m[2]);
      const t = min * 60 + sec;
      const txt = m[3].trim();

      lines.push({ time: t, text: txt });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
};

const getLyricsText = (payload: any): string | null => {
  const candidates = [
    payload?.syncedLyrics,
    payload?.plainLyrics,
    payload?.lyrics,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
};

const toFallbackLines = (text: string) =>
  text
    .split(/\r?\n/)
    .filter((line: string) => line.trim().length > 0)
    .map((line: string, index: number) => ({
      time: index,
      text: line,
    }));

// Helper functions for local lyrics storage

const getLyricsStorageKey = (songId: string) => `@lyrics:${songId}`;

const getLocalLyrics = async (songId: string): Promise<string | null> => {
  try {
    const lyrics = await AsyncStorage.getItem(getLyricsStorageKey(songId));

    return lyrics;
  } catch (e) {
    console.error("Error reading local lyrics:", e);

    return null;
  }
};

const saveLocalLyrics = async (
  songId: string,
  lyrics: string,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(getLyricsStorageKey(songId), lyrics);
  } catch (e) {
    console.error("Error saving local lyrics:", e);
  }
};

const LyricsModal = ({ song, visible, onClose }: LyricsModalProps) => {
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);

  const {
    playing,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    favoriteSongIds,
    toggleFavoriteSong,
  } = useMusicPlayerUi();
  const { currentTime, durationSeconds } = usePlaybackProgress();

  const dominantColor = useDominantColor(visible && song ? (song.artwork ?? null) : null, "#1c1c1c");

  const [lyricsRaw, setLyricsRaw] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lines, setLines] = useState<Array<{ time: number; text: string }>>(
    [],
  );

  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const [shareSelectionVisible, setShareSelectionVisible] = useState(false);
  const [sharePreviewVisible, setSharePreviewVisible] = useState(false);
  const [shareStart, setShareStart] = useState<number | null>(null);
  const [shareEnd, setShareEnd] = useState<number | null>(null);
  const [shareThemeId, setShareThemeId] = useState<(typeof SHARE_THEMES)[number]["id"]>("dynamic");
  const [saveFeedback, setSaveFeedback] = useState<"success" | "error" | null>(null);

  const dynamicShareTheme = useMemo(
    () => buildDynamicShareTheme(dominantColor),
    [dominantColor],
  );

  const shareTheme: ShareTheme =
    shareThemeId === "dynamic"
      ? dynamicShareTheme
      : SHARE_THEMES.find((theme) => theme.id === shareThemeId) ?? dynamicShareTheme;

  const selectedShareLines =
    shareStart === null || shareEnd === null
      ? []
      : lines.slice(Math.min(shareStart, shareEnd), Math.max(shareStart, shareEnd) + 1);

  const shareText = selectedShareLines.map((line) => line.text).join("\n") || "";

  // Progress scrub state

  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const progressBarRef = useRef<View | null>(null);

  const [progressBarLayout, setProgressBarLayout] = useState({
    x: 0,
    width: 0,
  });

  const scrollRef = useRef<FlatList<{ time: number; text: string }> | null>(null);
  const selectionScrollRef = useRef<ScrollView | null>(null);
  const shareCardRef = useRef<View | null>(null);

  const lineLayouts = useRef<Array<{ y: number; height: number }>>([]);

  const containerHeight = useRef<number>(0);

  useEffect(() => {
    let aborted = false;

    if (!visible || !song) {
      setLyricsRaw(null);
      setLines([]);
      setError(null);
      setLoading(false);

      return;
    }

    const fetchLyrics = async () => {
      setLoading(true);
      setError(null);
      setLyricsRaw(null);
      setLines([]);

      try {
        const artist = song.artist || "";
        const title = song.title || "";
        const album = song.album || "";

        const localLyrics = await getLocalLyrics(song.id);

        if (localLyrics) {
          setLyricsRaw(localLyrics);

          const parsed = parseLRC(localLyrics);

          const nextLines = parsed.length
            ? parsed
            : toFallbackLines(localLyrics);

          setLines(nextLines);

          setError(null);
          setLoading(false);

          return;
        }

        // Normalize artist name
        const normalizeArtist = (a: string) =>
          a
            .replace(/\s*\/\s*/g, ", ")
            .replace(/\s+/g, " ")
            .trim();

        const normalizedArtist = normalizeArtist(artist);

        // Try different variations
        const primaryArtist =
          artist.split(/[\/]/)[0].trim() || normalizedArtist;

        const attempts = [
          {
            artist: normalizedArtist,
            album: "",
            desc: "without album",
          },
          {
            artist: primaryArtist,
            album: "",
            desc: "artist only",
          },
          {
            artist: normalizedArtist,
            album,
            desc: "with album",
          },
          {
            artist: primaryArtist,
            album,
            desc: "artist + album",
          },
        ];

        for (const attempt of attempts) {
          if (aborted) return;

          try {
            const params = new URLSearchParams();

            params.append("artist_name", attempt.artist);
            params.append("track_name", title);

            if (attempt.album) {
              params.append("album_name", attempt.album);
            }

            const url = `https://lrclib.net/api/get?${params.toString()}`;

            const controller = new AbortController();

            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch(url, {
              signal: controller.signal,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                Accept: "application/json",
                "Accept-Language": "en-US,en;q=0.9",
              },
            });

            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();

              if (aborted) return;

              const lyrics = getLyricsText(data);

              if (lyrics) {
                await saveLocalLyrics(song.id, lyrics);

                setLyricsRaw(lyrics);

                const parsed = parseLRC(lyrics);

                const nextLines = parsed.length
                  ? parsed
                  : toFallbackLines(lyrics);

                setLines(nextLines);

                setError(null);
                setLoading(false);

                return;
              }
            }
          } catch {
            // Try the next attempt on any network/parse error.
          }
        }

        if (aborted) return;

        try {
          const searchParams = new URLSearchParams();

          searchParams.append("q", `${normalizedArtist} ${title}`);

          const searchUrl = `https://lrclib.net/api/search?${searchParams.toString()}`;

          const controller = new AbortController();

          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(searchUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              Accept: "application/json",
            },
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
              const first = data[0];

              const lyrics = getLyricsText(first);

              if (lyrics) {
                await saveLocalLyrics(song.id, lyrics);

                setLyricsRaw(lyrics);

                const parsed = parseLRC(lyrics);

                const nextLines = parsed.length
                  ? parsed
                  : toFallbackLines(lyrics);

                setLines(nextLines);

                setError(null);
                setLoading(false);

                return;
              }
            }
          }
        } catch {
          // Fall through to the not-found state below.
        }

        if (aborted) return;

        setError(t('player_lyrics_not_found', 'No lyrics found.'));

        setLoading(false);
      } catch (e) {
        if (!aborted) {
          console.error("Error fetching lyrics:", e);

          setError(t('player_lyrics_error', 'Could not get the lyrics.'));
        }

        setLoading(false);
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    };

    void fetchLyrics();

    return () => {
      aborted = true;

      lineLayouts.current = [];

      setActiveIndex(-1);
    };
  }, [visible, song]);

  // Update active index when currentTime or lines change

  useEffect(() => {
    if (!lines || lines.length === 0) {
      if (activeIndex !== -1) {
        setActiveIndex(-1);
      }

      return;
    }

    const hasTimestamps = lines?.some(
      (l) => typeof l?.time === "number" && l.time > 0,
    );

    if (!hasTimestamps) {
      if (activeIndex !== -1) {
        setActiveIndex(-1);
      }

      return;
    }

    // Binary search for better performance

    let left = 0;
    let right = lines.length - 1;
    let idx = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);

      if (lines[mid].time <= currentTime) {
        idx = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    if (activeIndex !== idx) {
      setActiveIndex(idx);
    }
  }, [currentTime, lines, activeIndex]);

  // Scroll to active line

  useEffect(() => {
    if (activeIndex < 0) return;

    const layout = lineLayouts.current[activeIndex];

    if (!layout || !scrollRef.current || !containerHeight.current) {
      return;
    }

    const targetY = Math.max(
      0,
      layout.y -
        containerHeight.current / 2 +
        layout.height / 2,
    );

    scrollRef.current?.scrollToOffset({
      offset: Math.max(0, targetY),
      animated: false,
    });
  }, [activeIndex]);

  const onLineLayout = (
    index: number,
    y: number,
    height: number,
  ) => {
    lineLayouts.current[index] = { y, height };
  };

  const onScrollViewLayout = (e: any) => {
    containerHeight.current = e.nativeEvent.layout.height;
  };

  const openShareSelection = () => {
    if (activeIndex >= 0) {
      setShareStart(activeIndex);
      setShareEnd(activeIndex);
    } else {
      setShareStart(null);
      setShareEnd(null);
    }

    setShareSelectionVisible(true);
  };

  // Default to the color-based theme every time the share preview opens,
  // and whenever the playing track changes. The user's manual override is
  // still respected for the duration of that preview session.
  useEffect(() => {
    if (sharePreviewVisible) {
      setShareThemeId("dynamic");
    }
  }, [sharePreviewVisible, song?.id]);

  useEffect(() => {
    if (!shareSelectionVisible || activeIndex < 0 || !selectionScrollRef.current) {
      return;
    }

    selectionScrollRef.current.scrollTo({
      y: Math.max(0, activeIndex * 42),
      animated: false,
    });
  }, [shareSelectionVisible]);

  const removeLastSelectedLine = () => {
    if (shareStart === null || shareEnd === null) {
      return;
    }

    const minIndex = Math.min(shareStart, shareEnd);
    const maxIndex = Math.max(shareStart, shareEnd);

    if (maxIndex === minIndex) {
      setShareStart(null);
      setShareEnd(null);
      return;
    }

    setShareStart(minIndex);
    setShareEnd(maxIndex - 1);
  };

  const clearSelection = () => {
    setShareStart(null);
    setShareEnd(null);
  };

  const handleShareLinePress = (index: number) => {
    if (shareStart === null) {
      setShareStart(index);
      setShareEnd(index);
      return;
    }

    if (shareEnd === null) {
      const nextStart = Math.min(shareStart, index);
      const nextEnd = Math.max(shareStart, index);
      setShareStart(nextStart);
      setShareEnd(nextEnd);
      return;
    }

    const nextStart = Math.min(shareStart, shareEnd, index);
    const nextEnd = Math.max(shareStart, shareEnd, index);
    setShareStart(nextStart);
    setShareEnd(nextEnd);
  };

  const shareSelectedLyrics = async () => {
    if (!shareText.trim()) {
      return;
    }

    const preview = `${song?.title ?? "Canción"}\n${song?.artist ?? "Artista"}\n\n${shareText}`;

    try {
      await Share.share({
        message: preview,
        title: song?.title ?? "Letra de la canción",
      });
    } catch (error) {
      console.error("Error sharing lyrics:", error);
    }
  };

  const saveLyricsCard = async () => {
    if (!shareCardRef.current || !shareText.trim()) {
      return;
    }

    try {
      const permission = await requestPermissionsAsync(true, ["photo"]);
      if (!permission.granted) {
        Alert.alert(
          t("lyrics_save_permission_title", "Permiso necesario"),
          t("lyrics_save_permission_message", "Permite el acceso a fotos para guardar la letra."),
        );
        return;
      }

      const uri = await captureRef(shareCardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      await Asset.create(uri);
      setSaveFeedback("success");
    } catch (error) {
      console.error("Error saving lyrics card:", error);
      setSaveFeedback("error");
    }
  };

  return (
    <>
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View className="flex-1">
          <BlurView
            intensity={60}
            tint="dark"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          <LinearGradient
            colors={[
              dominantColor,
              withAlpha(dominantColor, 1),
              "#000000",
            ]}
            locations={[0, 0.45, 1]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.98,
            }}
          />

          {/* Don't close on backdrop tap; only on hardware back */}

          <View
            style={{
              flex: 1,
              paddingHorizontal: 18,
              paddingTop: 40,
            }}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  backgroundColor: "rgba(0,0,0,0.18)",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 18,
                }}
              >
                <View style={{ marginBottom: 18 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 18,
                        overflow: "hidden",
                        backgroundColor: "rgba(255,255,255,0.1)",
                        elevation: 8,
                        shadowColor: "#000",
                        shadowOpacity: 0.25,
                        shadowRadius: 12,
                        shadowOffset: {
                          width: 0,
                          height: 6,
                        },
                      }}
                    >
                      {song?.artwork ? (
                        <Image
                          source={{ uri: song.artwork }}
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Image
                          source={DEFAULT_MUSIC_ARTWORK}
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
                          resizeMode="cover"
                        />
                      )}
                    </View>

                    <View
                      style={{
                        flex: 1,
                        marginLeft: 14,
                        marginRight: 6,
                      }}
                    >
                      <Text
                        numberOfLines={2}
                        style={{
                          color: "#ffffff",
                          fontSize: 26,
                          fontWeight: "800",
                          lineHeight: 34,
                        }}
                      >
                        {song?.title || t('player_no_title', 'Untitled')}
                      </Text>

                      <Text
                        numberOfLines={1}
                        style={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: 16,
                          marginTop: 8,
                        }}
                      >
                        {song?.artist || t('player_unknown_artist', 'Unknown artist')}
                      </Text>
                    </View>

                    <View
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                      }}
                    >
                      <Pressable
                        accessibilityRole="button"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 23,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() => {
                          if (!song) return;

                          void toggleFavoriteSong(song.id);
                        }}
                      >
                        <Ionicons
                          name={
                            song &&
                            favoriteSongIds.includes(song.id)
                              ? "star"
                              : "star-outline"
                          }
                          size={24}
                          color="#ffffff"
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View
                  style={{ height: 360 }}
                  onLayout={onScrollViewLayout}
                >
                  {loading ? (
                    <View className="flex-1 items-center justify-center px-4">
                      <ActivityIndicator
                        size="small"
                        color="#ffffff"
                      />

                      <Text
                        style={{
                          color: theme.mutedText,
                          textAlign: "center",
                          fontSize: 16,
                          marginTop: 12,
                        }}
                      >
                        {t('player_lyrics_loading', 'Searching for song lyrics...')}
                      </Text>
                    </View>
                  ) : error ? (
                    <View className="flex-1 items-center justify-center px-4">
                      <Text
                        style={{
                          color: theme.mutedText,
                          textAlign: "center",
                        }}
                      >
                        {error}
                      </Text>
                    </View>
                  ) : lines && lines.length ? (
                    <FlatList
                      ref={(ref) => {
                        scrollRef.current = ref;
                      }}
                      data={lines}
                      keyExtractor={(item, index) => `${index}-${item.time}`}
                      // stable keyExtractor prevents re-mount when `lines` is
                      // re-assigned during the multi-attempt fetch.
                      initialNumToRender={20}
                      maxToRenderPerBatch={15}
                      windowSize={5}
                      removeClippedSubviews
                      getItemLayout={(_data, index) => ({
                        length: LYRIC_LINE_HEIGHT,
                        offset: LYRIC_LINE_HEIGHT * index,
                        index,
                      })}
                      contentContainerStyle={{ paddingVertical: 40 }}
                      renderItem={({ item: line, index: i }) => {
                        const isActive = i === activeIndex;
                        return (
                          <View
                            onLayout={(e) =>
                              onLineLayout(
                                i,
                                e.nativeEvent.layout.y,
                                e.nativeEvent.layout.height,
                              )
                            }
                            style={{
                              height: LYRIC_LINE_HEIGHT,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: isActive
                                  ? "#ffffff"
                                  : "rgba(255,255,255,0.6)",
                                fontSize: isActive ? 22 : 16,
                                fontWeight: isActive
                                  ? "800"
                                  : "500",
                                textAlign: "center",
                              }}
                            >
                              {line.text || " "}
                            </Text>
                          </View>
                        );
                      }}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center px-4">
                      <Text style={{ color: theme.mutedText }}>
                        {t('player_lyrics_unavailable', 'No lyrics available.')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Bottom controls: progress + playback controls */}

              <View
                style={{
                  paddingTop: 14,
                  paddingBottom: 18,
                }}
              >
                <View
                  ref={(ref) => {
                    progressBarRef.current = ref;
                  }}
                  onLayout={(e) => {
                    const nextLayout = {
                      x: e.nativeEvent.layout.x,
                      width: e.nativeEvent.layout.width,
                    };

                    setProgressBarLayout((prev) =>
                      prev.x === nextLayout.x &&
                      prev.width === nextLayout.width
                        ? prev
                        : nextLayout,
                    );
                  }}
                  style={{ height: 36 }}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={(e) => {
                    const locX = e.nativeEvent.locationX;

                    const pct = Math.max(
                      0,
                      Math.min(
                        1,
                        locX / (progressBarLayout.width || 1),
                      ),
                    );

                    const dur = durationSeconds || 0;

                    setScrubTime(pct * dur);
                  }}
                  onResponderMove={(e) => {
                    const locX = e.nativeEvent.locationX;

                    const pct = Math.max(
                      0,
                      Math.min(
                        1,
                        locX / (progressBarLayout.width || 1),
                      ),
                    );

                    const dur = durationSeconds || 0;

                    setScrubTime(pct * dur);
                  }}
                  onResponderRelease={(e) => {
                    const locX = e.nativeEvent.locationX;

                    const pct = Math.max(
                      0,
                      Math.min(
                        1,
                        locX / (progressBarLayout.width || 1),
                      ),
                    );

                    const dur = durationSeconds || 0;

                    const target = pct * dur;

                    setScrubTime(null);

                    void seekTo(target);
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      borderRadius: 6,
                      backgroundColor:
                        "rgba(255,255,255,0.12)",
                      overflow: "hidden",
                    }}
                  >
                    <View
                      pointerEvents="none"
                      style={{
                        height: 6,
                        backgroundColor: "#fff",
                        width: `${
                          ((scrubTime ?? currentTime) /
                            (durationSeconds || 1)) *
                          100
                        }%`,
                      }}
                    />
                  </View>
                </View>

                <View className="-mt-1 flex-row items-center justify-between">
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    {formatDuration(
                      Math.round(
                        (scrubTime ?? currentTime) * 1000,
                      ),
                    )}
                  </Text>

                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    -
                    {formatDuration(
                      Math.round(
                        Math.max(
                          (durationSeconds || 0) -
                            (scrubTime ?? currentTime),
                          0,
                        ) * 1000,
                      ),
                    )}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 12,
                  }}
                >
                  <Pressable
                    onPress={() => void playPrevious()}
                    style={{
                      padding: 8,
                      marginHorizontal: 18,
                    }}
                  >
                    <BackwardIcon
                      size={36}
                      color="#ffffff"
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => void togglePlayPause()}
                    style={{
                      padding: 8,
                      marginHorizontal: 18,
                    }}
                  >
                    <FontAwesome5
                      name={playing ? "pause" : "play"}
                      size={44}
                      color="#ffffff"
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => void playNext()}
                    style={{
                      padding: 8,
                      marginHorizontal: 18,
                    }}
                  >
                    <ForwardIcon
                      size={36}
                      color="#ffffff"
                    />
                  </Pressable>
                </View>

                <Pressable
                  onPress={openShareSelection}
                  style={{
                    alignSelf: "center",
                    marginTop: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.94)",
                    minWidth: 170,
                    shadowColor: "#000",
                    shadowOpacity: 0.18,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 4,
                  }}
                >
                  <FontAwesome5 name="cloudsmith" size={18} color="#111827" />
                  <Text
                    style={{
                      color: "#111827",
                      fontSize: 16,
                      fontWeight: "700",
                      letterSpacing: 0.2,
                    }}
                  >
                    {t('lyrics_share_action', 'Share')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={shareSelectionVisible}
        animationType="fade"
        onRequestClose={() => setShareSelectionVisible(false)}
      >
        <View className="flex-1" style={{ backgroundColor: `${theme.background}cc` }}>
          <View
            className="flex-1 px-5 pb-6 pt-14"
            style={{
              backgroundColor: theme.background,
            }}
          >
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-3xl font-bold" style={{ color: theme.text }}>
                  {t('lyrics_share_select_title', 'Select lyrics')}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                  {song?.title || t('player_lyrics', 'Lyrics')}
                </Text>
              </View>
              <Pressable onPress={() => setShareSelectionVisible(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </Pressable>
            </View>

            <View className="mb-4 flex-row items-center justify-between gap-2">
              <Pressable
                onPress={clearSelection}
                disabled={shareStart === null || shareEnd === null}
                className="flex-1 items-center justify-center rounded-full py-3"
                style={{
                  backgroundColor: shareStart !== null && shareEnd !== null ? theme.surface : `${theme.surface}88`,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text className="text-base font-semibold" style={{ color: theme.text }}>Borrar todo</Text>
              </Pressable>

              <Pressable
                onPress={removeLastSelectedLine}
                disabled={shareStart === null || shareEnd === null}
                className="flex-1 items-center justify-center rounded-full py-3"
                style={{
                  backgroundColor: shareStart !== null && shareEnd !== null ? theme.surface : `${theme.surface}88`,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text className="text-base font-semibold" style={{ color: theme.text }}>Quitar última</Text>
              </Pressable>
            </View>

            <ScrollView
              ref={(ref) => {
                selectionScrollRef.current = ref;
              }}
              showsVerticalScrollIndicator={false}
            >
              {lines.length === 0 ? (
                <Text className="text-base" style={{ color: theme.mutedText }}>
                  {t('lyrics_share_empty', 'No lyrics available to share.')}
                </Text>
              ) : (
                <View className="gap-2 pb-4">
                  {lines.map((line, index) => {
                    const isSelected =
                      shareStart !== null &&
                      shareEnd !== null &&
                      index >= Math.min(shareStart, shareEnd) &&
                      index <= Math.max(shareStart, shareEnd);

                    return (
                      <Pressable
                        key={`${index}-${line.time}`}
                        onPress={() => handleShareLinePress(index)}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 14,
                          backgroundColor: isSelected ? theme.accent : theme.surface,
                          borderWidth: 1,
                          borderColor: isSelected ? theme.accent : theme.border,
                        }}
                      >
                        <Text
                          numberOfLines={2}
                          style={{
                            color: isSelected ? theme.background : theme.text,
                            fontSize: 15,
                            fontWeight: isSelected ? "700" : "500",
                            lineHeight: 22,
                          }}
                        >
                          {line.text || " "}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View className="mt-4 pt-2">
              <Pressable
                disabled={shareStart === null || shareEnd === null}
                onPress={() => {
                  if (shareStart === null || shareEnd === null) {
                    return;
                  }

                  setShareSelectionVisible(false);
                  setSharePreviewVisible(true);
                }}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  paddingVertical: 16,
                  backgroundColor: shareStart !== null && shareEnd !== null ? theme.accent : `${theme.surface}88`,
                }}
              >
                <Text
                  style={{
                    color: shareStart !== null && shareEnd !== null ? theme.background : theme.mutedText,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  {t('lyrics_share_next', 'Next')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={sharePreviewVisible}
        animationType="fade"
        onRequestClose={() => setSharePreviewVisible(false)}
      >
        <View className="flex-1 bg-black/70">
          <View
            className="flex-1 px-5 pb-6 pt-14"
            style={{
              backgroundColor: shareTheme.background,
            }}
          >
            <View className="mb-4 flex-row items-center justify-end">
              <Pressable onPress={() => setSharePreviewVisible(false)}>
                <Ionicons name="close" size={28} color={shareTheme.text} />
              </Pressable>
            </View>

            <View className="flex-1 justify-center">
              <View
                ref={shareCardRef}
                collapsable={false}
                className="rounded-[24px] p-5"
                style={{
                  backgroundColor: shareTheme.card,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                }}
              >
                <View className="mb-4 flex-row items-center">
                  <View
                    className="mr-4 overflow-hidden rounded-[12px]"
                    style={{ width: 54, height: 54 }}
                  >
                    {song?.artwork ? (
                      <Image source={{ uri: song.artwork }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    ) : (
                      <Image source={DEFAULT_MUSIC_ARTWORK} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    )}
                  </View>

                  <View className="flex-1">
                    <Text className="text-xl font-bold" style={{ color: shareTheme.text }}>
                      {song?.title || "Canción"}
                    </Text>
                    <Text className="text-base" style={{ color: shareTheme.muted }}>
                      {song?.artist || "Artista"}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: `${shareTheme.text}18`, marginBottom: 26 }} />

                <Text
                  style={{
                    color: shareTheme.text,
                    fontSize: 24,
                    fontWeight: "700",
                    lineHeight: 32,
                  }}
                >
                  {shareText || t('lyrics_share_prompt', 'Select a section of the lyrics.')}
                </Text>

                <View className="mt-8 flex-row items-center">
                  <Image source={FESA_LOGO} style={{ width: 28, height: 28 }} resizeMode="contain" />
                  <Text style={{ color: shareTheme.muted, fontSize: 16, fontWeight: "700" }}>FESA</Text>
                </View>
              </View>
            </View>

            <View className="mt-auto flex-row flex-wrap items-center justify-center gap-2 pb-5 pt-8">
              {SHARE_THEMES.map((themeOption) => {
                const isSelected = themeOption.id === shareThemeId;
                const previewTheme =
                  themeOption.id === "dynamic" ? dynamicShareTheme : themeOption;

                return (
                  <Pressable
                    key={themeOption.id}
                    onPress={() => setShareThemeId(themeOption.id)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 18,
                      marginVertical: 4,
                      padding: 6,
                      marginHorizontal: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: isSelected ? previewTheme.text : "transparent",
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        marginHorizontal: 4,
                        borderRadius: 12,
                        backgroundColor: previewTheme.background,
                        borderWidth: themeOption.id === "brand" ? 1 : 0,
                        borderColor: themeOption.id === "brand" ? "rgba(255,255,255,0.15)" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {themeOption.id === "brand" ? (
                        <View style={{ alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="musical-note" size={14} color="#ffffff" />
                          <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "800", letterSpacing: 0.8 }}>FESA</Text>
                        </View>
                      ) : (
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            backgroundColor: previewTheme.accent,
                            opacity: 1,
                          }}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => { void saveLyricsCard(); }}
              disabled={!shareText.trim()}
              className="items-center justify-center rounded-full py-4"
              style={{
                backgroundColor: shareText.trim() ? theme.accent : `${theme.surface}88`,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ color: shareText.trim() ? theme.background : theme.mutedText, fontSize: 18, fontWeight: "800" }}>
                {t("lyrics_save_action", "Guardar")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={saveFeedback !== null}
        animationType="fade"
        onRequestClose={() => setSaveFeedback(null)}
      >
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: `${theme.background}cc` }}
        >
          <View
            className="w-full max-w-sm items-center rounded-[24px] p-6"
            style={{
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <View
              className="mb-4 h-16 w-16 items-center justify-center rounded-full"
              style={{
                backgroundColor: saveFeedback === "success" ? `${theme.accent}24` : "#ef444424",
              }}
            >
              <Ionicons
                name={saveFeedback === "success" ? "checkmark" : "close"}
                size={34}
                color={saveFeedback === "success" ? theme.accent : "#ef4444"}
              />
            </View>

            <Text className="text-center text-xl font-bold" style={{ color: theme.text }}>
              {saveFeedback === "success"
                ? t("lyrics_save_success_title", "Guardado")
                : t("lyrics_save_error_title", "No se pudo guardar")}
            </Text>
            <Text className="mt-2 text-center text-base leading-6" style={{ color: theme.mutedText }}>
              {saveFeedback === "success"
                ? t("lyrics_save_success_message", "La selección se guardó en tus fotos.")
                : t("lyrics_save_error_message", "No se pudo guardar la selección en el dispositivo.")}
            </Text>

            <Pressable
              onPress={() => setSaveFeedback(null)}
              className="mt-6 w-full items-center justify-center rounded-full py-3"
              style={{ backgroundColor: theme.accent }}
            >
              <Text className="text-base font-bold" style={{ color: theme.background }}>
                {t("done", "Listo")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default LyricsModal;
