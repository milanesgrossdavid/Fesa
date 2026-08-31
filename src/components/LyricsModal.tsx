import React, { useEffect, useRef, useState } from "react";

import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { BlurView } from "expo-blur";

import { LinearGradient } from "expo-linear-gradient";

import { useDominantColor, withAlpha } from "../hooks/useDominantColor";

import Ionicons from "@expo/vector-icons/Ionicons";

import { BackwardIcon, ForwardIcon } from "../Icons";

import { formatDuration } from "../utils/time";

import { useAppSettings } from "../settings/appSettings";

import { useMusicPlayer } from "../audio/musicPlayer";

import type { Song } from "../../modules/local-music";

import { FontAwesome5 } from "@expo/vector-icons";

const DEFAULT_MUSIC_ARTWORK = require("../../assets/musicNotFound.jpg");

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
  const { theme } = useAppSettings();

  const {
    currentTime,
    playing,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    durationSeconds,
    favoriteSongIds,
    toggleFavoriteSong,
  } = useMusicPlayer();

  const dominantColor = useDominantColor(song?.artwork ?? null, "#1c1c1c");

  const [lyricsRaw, setLyricsRaw] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lines, setLines] = useState<Array<{ time: number; text: string }>>(
    [],
  );

  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Progress scrub state

  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const progressBarRef = useRef<View | null>(null);

  const [progressBarLayout, setProgressBarLayout] = useState({
    x: 0,
    width: 0,
  });

  const scrollRef = useRef<ScrollView | null>(null);

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

        console.log("Fetching lyrics for:", {
          artist,
          title,
          album,
          songId: song.id,
        });

        const localLyrics = await getLocalLyrics(song.id);

        if (localLyrics) {
          console.log("Found local lyrics");

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

          console.log(`Attempt: ${attempt.desc}`);

          try {
            const params = new URLSearchParams();

            params.append("artist_name", attempt.artist);
            params.append("track_name", title);

            if (attempt.album) {
              params.append("album_name", attempt.album);
            }

            const url = `https://lrclib.net/api/get?${params.toString()}`;

            console.log("API URL:", url);

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

            console.log("API Response status:", res.status);

            if (res.ok) {
              const data = await res.json();

              console.log("API Response data:", {
                hasSyncedLyrics: !!data.syncedLyrics,
                hasPlainLyrics: !!data.plainLyrics,
                syncedLength: data.syncedLyrics?.length,
                plainLength: data.plainLyrics?.length,
              });

              if (aborted) return;

              const lyrics = getLyricsText(data);

              if (lyrics) {
                console.log("Found lyrics, saving locally...");

                await saveLocalLyrics(song.id, lyrics);

                setLyricsRaw(lyrics);

                const parsed = parseLRC(lyrics);

                console.log("Parsed lines:", parsed.length);

                const nextLines = parsed.length
                  ? parsed
                  : toFallbackLines(lyrics);

                console.log("Final lines:", nextLines.length);

                setLines(nextLines);

                setError(null);
                setLoading(false);

                return;
              } else {
                console.log(
                  "API returned data but no lyrics field, trying next attempt...",
                );
              }
            } else {
              console.log(
                "API response not ok:",
                res.status,
                res.statusText,
                "trying next attempt...",
              );
            }
          } catch (attemptError) {
            console.log(
              "Attempt error:",
              attemptError,
              "trying next attempt...",
            );
          }
        }

        if (aborted) return;

        console.log("Trying search endpoint...");

        try {
          const searchParams = new URLSearchParams();

          searchParams.append("q", `${normalizedArtist} ${title}`);

          const searchUrl = `https://lrclib.net/api/search?${searchParams.toString()}`;

          console.log("Search URL:", searchUrl);

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

          console.log("Search Response status:", res.status);

          if (res.ok) {
            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
              const first = data[0];

              const lyrics = getLyricsText(first);

              if (lyrics) {
                console.log(
                  "Found lyrics from search, saving locally...",
                );

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
        } catch (searchError) {
          console.log("Search endpoint error:", searchError);
        }

        if (aborted) return;

        console.log("No lyrics found after all attempts");

        setError("No se encontró la letra.");

        setLoading(false);
      } catch (e) {
        if (!aborted) {
          console.error("Error fetching lyrics:", e);

          setError("No se pudo obtener la letra.");
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

    scrollRef.current.scrollTo({
      y: targetY,
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

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        <BlurView
          intensity={100}
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
                      {song?.title || "Sin título"}
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={{
                        color: "rgba(255,255,255,0.8)",
                        fontSize: 16,
                        marginTop: 8,
                      }}
                    >
                      {song?.artist || "Artista desconocido"}
                    </Text>
                  </View>

                  <View
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
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
                      Buscando letra de la canción...
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
                  <ScrollView
                    ref={(ref) => {
                      scrollRef.current = ref;
                    }}
                  >
                    <View style={{ paddingVertical: 40 }}>
                      {lines.map((line, i) => {
                        const isActive = i === activeIndex;

                        return (
                          <View
                            key={`${i}-${line.time}`}
                            onLayout={(e) =>
                              onLineLayout(
                                i,
                                e.nativeEvent.layout.y,
                                e.nativeEvent.layout.height,
                              )
                            }
                            style={{
                              alignItems: "center",
                              marginVertical: 6,
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
                      })}
                    </View>
                  </ScrollView>
                ) : (
                  <View className="flex-1 items-center justify-center px-4">
                    <Text style={{ color: theme.mutedText }}>
                      No hay letra disponible.
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
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default LyricsModal;
