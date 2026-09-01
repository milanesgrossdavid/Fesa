import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Font from "expo-font";
import {
  deleteAudioFile,
  getAudioFilesWithPermission,
  getEqualizerState,
  releaseEqualizer,
  setAudioAsTone,
  setEqualizerState,
  shareAudioFile,
  Song,
  ToneType,
} from "../../modules/local-music";
import { getAudioSessionId, useMusicPlayer } from "../audio/musicPlayer";
import AppSettingsModal from "../components/AppSettingsModal";
import AudioWaveBars from "../components/AudioWaveBars";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import QueuePlaylistModal from "../components/QueuePlaylistModal";
import RelatedTracksModal from "../components/RelatedTracksModal";
import SongDetailsModal from "../components/SongDetailsModal";
import LyricsModal from "../components/LyricsModal";
import AutoScrollingText from "../components/AutoScrollingText";
import {
  BackIcon,
  BackwardIcon,
  DotsIcon,
  FavoritedIcon,
  ForwardIcon,
  ImageIcon,
  LockScreenIcon,
  PlaylistIcon,
  RepeatAllIcon,
  RepeatOffbackIcon,
  RepeatOnceIcon,
  ShuffleIcon,
  UnfavoritedIcon,
  VolumeHighIcon,
  VolumeLowIcon,
} from "../Icons";
import { formatDuration } from "../utils/time";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useAppSettings } from "../settings/appSettings";
import { getTranslation } from "../i18n/translations";
import { LinearGradient } from "expo-linear-gradient";
import { useDominantColor, withAlpha } from "../hooks/useDominantColor";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

interface PlayerScreenProps {
  onBack: () => void;
}

type RelatedSongsState = {
  title: string;
  type: "album" | "artist";
  songs: Song[];
} | null;

type EqualizerBand = {
  index: number;
  frequency: number;
  level: number;
  minLevel: number;
  maxLevel: number;
};

const EQUALIZER_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0],
  Bass: [4, 7, 8, 5, 2, 1, 0],
  Vocal: [1, 2, 5, 7, 5, 2, 1],
  Rock: [5, 7, 6, 4, 3, 2, 1],
  Pop: [2, 4, 6, 5, 4, 2, 1],
  Treble: [0, 0, 2, 4, 6, 7, 8],
  Club: [6, 8, 7, 5, 4, 3, 2],
};

const LOCK_DATE_FONT = "BlackOpsOne-Regular";
const LOCK_TIME_FONT = "BlackOpsOne-Regular";
const UNKNOWN_ALBUM = "Álbum Desconocido";
const UNKNOWN_ARTIST = "Artista Desconocido";
const DEFAULT_MUSIC_ARTWORK = require("../../assets/musicNotFound.jpg");
const normalizeValue = (value: string | null | undefined, fallback: string) =>
  value?.trim() || fallback;

const VerticalEqualizerSlider = ({
  band,
  activeColor,
  onChange,
}: {
  band: EqualizerBand;
  activeColor: string;
  onChange: (nextLevel: number) => void;
}) => {
  const trackRef = useRef<View>(null);

  const updateLevelFromPointer = (pointerY: number) => {
    if (!trackRef.current) {
      return;
    }

    trackRef.current.measureInWindow((x, y, width, height) => {
      const top = y;
      const bottom = y + height;
      const safeHeight = Math.max(height, 1);
      const clampedY = Math.min(Math.max(pointerY, top), bottom);
      const percent = (bottom - clampedY) / safeHeight;
      const nextLevel = band.minLevel + (band.maxLevel - band.minLevel) * percent;
      onChange(Math.round(nextLevel));
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        updateLevelFromPointer(gestureState.y0);
      },
      onPanResponderMove: (_, gestureState) => {
        updateLevelFromPointer(gestureState.moveY);
      },
    })
  ).current;

  const fillPercent = Math.max(
    6,
    ((band.level - band.minLevel) / Math.max(1, band.maxLevel - band.minLevel)) * 100,
  );

  return (
    <View className="items-center justify-center" style={{ width: 32 }}>
      <View
        ref={trackRef}
        className="relative h-32 w-2.5 rounded-full"
        style={{
          backgroundColor: 'rgba(255,255,255,0.14)',
          borderWidth: 1,
          borderColor: activeColor + '66',
          overflow: 'visible',
        }}
        {...panResponder.panHandlers}
      >
        <View
          pointerEvents="none"
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{
            height: `${fillPercent}%`,
            backgroundColor: activeColor,
            minHeight: 10,
          }}
        />
        <View
          pointerEvents="none"
          className="absolute rounded-full border border-white/70"
          style={{
            width: 18,
            height: 18,
            backgroundColor: activeColor,
            left: '50%',
            transform: [{ translateX: -9 }, {translateY: 18}],
            bottom: `${Math.max(6, fillPercent)}%`,
            shadowColor: '#000',
            shadowOpacity: 0.28,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
          }}
        />
      </View>
    </View>
  );
};

const PlayerScreen = ({ onBack }: PlayerScreenProps) => {
  const {
    currentSong,
    currentIndex,
    playing,
    currentTime,
    durationSeconds,
    volume,
    queue,
    favoriteSongIds,
    shuffleEnabled,
    playbackMode,
    playSong,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    setShuffleEnabled,
    cyclePlaybackMode,
    toggleFavoriteSong,
    togglePlayPause,
  } = useMusicPlayer();
  const { theme, language } = useAppSettings();
  const insets = useSafeAreaInsets();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);

  const mainProgressBarRef = useRef<View>(null);
  const miniProgressBarRef = useRef<View>(null);
  const lockProgressBarRef = useRef<View>(null);
  const volumeBarRef = useRef<View>(null);
  const miniPlayerBlurTargetRef = useRef<View | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);

  const [mainProgressBar, setMainProgressBar] = useState({ x: 0, width: 0 });
  const [miniProgressBar, setMiniProgressBar] = useState({ x: 0, width: 0 });
  const [lockProgressBar, setLockProgressBar] = useState({ x: 0, width: 0 });
  const [volumeBar, setVolumeBar] = useState({ x: 0, width: 0 });

  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [queueVisible, setQueueVisible] = useState(false);
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [lockScreenVisible, setLockScreenVisible] = useState(false);
  const [trackMenuVisible, setTrackMenuVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [defineAsVisible, setDefineAsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [lyricsVisible, setLyricsVisible] = useState(false);
  const [equalizerVisible, setEqualizerVisible] = useState(false);
  const [equalizerBands, setEqualizerBands] = useState<EqualizerBand[]>([]);
  const [equalizerEnabled, setEqualizerEnabled] = useState(true);
  const [equalizerLoading, setEqualizerLoading] = useState(false);
  const [equalizerSessionId, setEqualizerSessionId] = useState<number | null>(null);
  const [relatedSongs, setRelatedSongs] = useState<RelatedSongsState>(null);
  const [lockFontsLoaded, setLockFontsLoaded] = useState(false);

  const dominantColor = useDominantColor(currentSong?.artwork ?? null);

  useEffect(() => {
    let isMounted = true;

    Font.loadAsync({
      [LOCK_DATE_FONT]: require("../../assets/fonts/SFNSText-Regular.otf"),
    })
      .then(() => {
        if (isMounted) setLockFontsLoaded(true);
      })
      .catch((error) => {
        console.warn("No se pudieron cargar las fuentes del lock screen:", error);
        if (isMounted) setLockFontsLoaded(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    getAudioFilesWithPermission()
      .then(setAllSongs)
      .catch((error) =>
        console.warn("No se pudo cargar la biblioteca:", error),
      );
  }, []);

  const currentQueue = useMemo(
    () => (queue.length ? queue : currentSong ? [currentSong] : []),
    [queue, currentSong],
  );

  const isCurrentSongFavorite = currentSong
    ? favoriteSongIds.includes(currentSong.id)
    : false;

  const RepeatModeIcon = useMemo(() => {
    if (playbackMode === "repeat-all") return RepeatAllIcon;
    if (playbackMode === "repeat-one") return RepeatOnceIcon;
    return RepeatOffbackIcon;
  }, [playbackMode]);

  const repeatActive = playbackMode !== "linear";
  const closeTrackMenu = () => setTrackMenuVisible(false);

  useEffect(() => {
    return () => {
      if (equalizerSessionId != null && equalizerSessionId > 0) {
        void releaseEqualizer(equalizerSessionId);
      }
    };
  }, [equalizerSessionId]);

  const applyEqualizerBands = async (nextBands: EqualizerBand[], nextEnabled: boolean) => {
    if (equalizerSessionId == null || equalizerSessionId <= 0) {
      return;
    }

    const levels = nextBands.map(band => Number(band.level));
    await setEqualizerState(equalizerSessionId, nextEnabled, levels);
  };

  const openEqualizer = async () => {
    closeTrackMenu();

    if (Platform.OS !== 'android') {
      Alert.alert('Ecualizador', 'El ecualizador solo está disponible en Android.');
      return;
    }

    const sessionId = getAudioSessionId() ?? 0;
    setEqualizerSessionId(sessionId);
    setEqualizerVisible(true);
    setEqualizerLoading(true);

    try {
      const state = await getEqualizerState(sessionId);
      if (!state || !state.bands.length) {
        setEqualizerEnabled(true);
        setEqualizerBands([
          { index: 0, frequency: 250, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 1, frequency: 500, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 2, frequency: 1000, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 3, frequency: 2000, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 4, frequency: 4000, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 5, frequency: 8000, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 6, frequency: 16000, level: 0, minLevel: -1500, maxLevel: 1500 },
        ]);
        setEqualizerVisible(true);
        return;
      }
      if (!state || !state.bands.length) {
        Alert.alert("Ecualizador", "No se pudo inicializar el ecualizador para esta pista.");
        setEqualizerVisible(false);
        return;
      }

      setEqualizerEnabled(state.enabled);
      setEqualizerBands(state.bands.map(band => ({
        index: band.index,
        frequency: Number(band.frequency),
        level: Number(band.level),
        minLevel: Number(band.minLevel),
        maxLevel: Number(band.maxLevel),
      })));
    } catch (error) {
      console.warn("No se pudo cargar el ecualizador:", error);
      Alert.alert("Ecualizador", "No se pudo cargar el ecualizador del reproductor.");
      setEqualizerVisible(false);
    } finally {
      setEqualizerLoading(false);
    }
  };

  const toggleEqualizer = async () => {
    const activeSessionId = equalizerSessionId ?? getAudioSessionId() ?? 0;
    const nextEnabled = !equalizerEnabled;
    setEqualizerEnabled(nextEnabled);

    if (equalizerBands.length) {
      await setEqualizerState(activeSessionId, nextEnabled, equalizerBands.map(band => Number(band.level)));
    }
  };

  const applyPreset = async (presetName: string) => {
    if (!equalizerBands.length) {
      return;
    }

    const presetLevels = EQUALIZER_PRESETS[presetName] ?? EQUALIZER_PRESETS.Flat;
    const nextBands = equalizerBands.map((band, index) => {
      const min = band.minLevel;
      const max = band.maxLevel;
      const target = presetLevels[index] ?? presetLevels[presetLevels.length - 1] ?? 0;
      const normalizedTarget = target * 150;

      return {
        ...band,
        level: Math.max(min, Math.min(max, normalizedTarget)),
      };
    });

    setEqualizerBands(nextBands);
    await applyEqualizerBands(nextBands, equalizerEnabled);
  };

  const openRelatedSongs = (type: "album" | "artist") => {
    if (!currentSong) return;
    closeTrackMenu();
    const target =
      type === "album"
        ? normalizeValue(currentSong.album, UNKNOWN_ALBUM)
        : normalizeValue(currentSong.artist, UNKNOWN_ARTIST);
    setRelatedSongs({
      title: target,
      type,
      songs: allSongs.filter(
        (song) =>
          normalizeValue(
            type === "album" ? song.album : song.artist,
            type === "album" ? UNKNOWN_ALBUM : UNKNOWN_ARTIST,
          ) === target,
      ),
    });
  };

  const defineSongAs = async (type: ToneType) => {
    if (!currentSong) return;
    setDefineAsVisible(false);

    const setAsTone = await setAudioAsTone(currentSong.id, type);
    if (!setAsTone) {
      return;
    }

    const toneLabel = type === 'ringtone' ? 'tono del dispositivo' : 'tono de alarma';
    Alert.alert('Listo', `“${currentSong.title}” se definió como ${toneLabel}.`);
  };

  const deleteCurrentSong = async () => {
    if (!currentSong) return;
    const deleted = await deleteAudioFile(currentSong.id);
    if (!deleted) return;
    closeTrackMenu();
    const nextQueue = currentQueue.filter((song) => song.id !== currentSong.id);
    if (nextQueue.length) {
      void playSong(nextQueue, Math.min(currentIndex, nextQueue.length - 1));
      return;
    }
    onBack();
  };

  if (!currentSong) {
    return (
      <Modal
        visible
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={onBack}
      >
        <View
          className="flex-1 items-center justify-center px-6"
          style={{
            backgroundColor: theme.background,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <Text className="mb-6 text-center text-base" style={{ color: theme.mutedText }}>
            No hay ninguna canción seleccionada.
          </Text>
          <Pressable
            className="rounded-full px-6 py-3"
            style={{ backgroundColor: theme.surface }}
            onPress={onBack}
          >
            <Text className="font-bold" style={{ color: theme.text }}>Volver</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  const playbackDuration = durationSeconds || currentSong.duration / 1000;
  const displayTime = scrubTime ?? currentTime;
  const progress = playbackDuration > 0
    ? Math.min(Math.max(displayTime / playbackDuration, 0), 1)
    : 0;
  const elapsed = formatDuration(Math.round(displayTime * 1000));
  const remaining = formatDuration(
    Math.round(Math.max(playbackDuration - displayTime, 0) * 1000),
  );

  const createProgressBarLayoutHandler = (
    ref: React.RefObject<View | null>,
    setter: React.Dispatch<React.SetStateAction<{ x: number; width: number }>>,
  ) => (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    requestAnimationFrame(() => {
      ref.current?.measureInWindow((x, _y, measuredWidth) => {
        setter({ x, width: measuredWidth || width });
      });
    });
  };

  const handleMainProgressLayout = createProgressBarLayoutHandler(
    mainProgressBarRef,
    setMainProgressBar,
  );
  const handleMiniProgressLayout = createProgressBarLayoutHandler(
    miniProgressBarRef,
    setMiniProgressBar,
  );
  const handleLockProgressLayout = createProgressBarLayoutHandler(
    lockProgressBarRef,
    setLockProgressBar,
  );
  const handleVolumeLayout = createProgressBarLayoutHandler(
    volumeBarRef,
    setVolumeBar,
  );

  const getProgressTimeFromGesture = (
    event: GestureResponderEvent,
    bar: { x: number; width: number },
  ) => {
    if (!bar.width || !playbackDuration) return null;
    const touchX = bar.x
      ? event.nativeEvent.pageX - bar.x
      : event.nativeEvent.locationX;
    const nextProgress = Math.min(Math.max(touchX / bar.width, 0), 1);
    return nextProgress * playbackDuration;
  };

  const createProgressScrubHandler = (
    bar: { x: number; width: number },
  ) => (event: GestureResponderEvent) => {
    const nextTime = getProgressTimeFromGesture(event, bar);
    if (nextTime === null) return;
    setScrubTime(nextTime);
  };

  const handleProgressRelease = (event: GestureResponderEvent) => {
    // Use the last bar that was interacted with, just in case.
    const bar =
      miniProgressBar.width ? miniProgressBar
      : lockProgressBar.width ? lockProgressBar
      : mainProgressBar;

    const nextTime = getProgressTimeFromGesture(event, bar) ?? scrubTime;
    setScrubTime(null);
    if (nextTime === null) return;
    seekTo(nextTime);
  };

  const handleVolumeGesture = (event: GestureResponderEvent) => {
    if (!volumeBar.width) return;
    const touchX = volumeBar.x
      ? event.nativeEvent.pageX - volumeBar.x
      : event.nativeEvent.locationX;
    const nextVolume = Math.min(Math.max(touchX / volumeBar.width, 0), 1);
    setVolume(nextVolume);
  };

  const formatFrequencyLabel = (frequency: number) =>
    frequency >= 1000 ? `${Math.round(frequency / 1000)}k` : `${Math.round(frequency)}`;

  const lockScreenDate = useMemo(
    () =>
      new Date().toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [],
  );
  const lockScreenTime = useMemo(
    () =>
      new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onBack}
    >
      <View
        className="flex-1 px-6"
        style={{
          backgroundColor: "#0a0a0a",
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        {currentSong.artwork ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
          >
            <Image
              source={{ uri: currentSong.artwork }}
              blurRadius={32}
              resizeMode="cover"
              style={{
                position: "absolute",
                top: -48,
                right: -48,
                bottom: -48,
                left: -48,
                opacity: 0.3,
              }}
            />
          </View>
        ) : null}
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(dominantColor, 0.7), withAlpha(dominantColor, 0.28), "#0a0a0a"]}
          locations={[0, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <Pressable
            className="-ml-2 h-10 w-10 items-center justify-center"
            onPress={onBack}
          >
            <BackIcon size={26} color="#f5f5f5" />
          </Pressable>
          <View className="-mr-2 flex-row items-center">
            <Pressable
              className="h-10 w-10 items-center justify-center"
              onPress={() => setMiniPlayerVisible(true)}
            >
              <ImageIcon size={22} color="#f5f5f5" />
            </Pressable>
            <Pressable
              className="h-10 w-10 items-center justify-center"
              onPress={() => setLockScreenVisible(true)}
            >
              <LockScreenIcon size={22} color="#f5f5f5" />
            </Pressable>
            <Pressable
              className="h-10 w-10 items-center justify-center"
              onPress={() => setTrackMenuVisible(true)}
            >
              <DotsIcon size={24} color="#f5f5f5" />
            </Pressable>
          </View>
        </View>

        <View className="flex-1 justify-between pt-16 pb-32">
          {/* Portada */}
          <View className="aspect-square w-full max-w-[400px] items-center justify-center self-center overflow-hidden rounded-3xl bg-[#2a2a2a]">
            {currentSong.artwork ? (
              <Image
                source={{ uri: currentSong.artwork }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <Image
                source={DEFAULT_MUSIC_ARTWORK}
                className="h-full w-full"
                resizeMode="cover"
              />
            )}
          </View>

          {/* Info + Barra de progreso */}
          <View>
            <View className="flex-row items-center">
              <View className="flex-1 pr-4">
                <AutoScrollingText className="text-2xl font-bold text-white">
                  {currentSong.title}
                </AutoScrollingText>
                <AutoScrollingText className="mt-1 text-base text-white/60">
                  {normalizeValue(currentSong.artist, UNKNOWN_ARTIST)}
                </AutoScrollingText>
              </View>
              <View className="flex-row items-center gap-5">
                <Pressable onPress={() => setQueueVisible(true)}>
                  <PlaylistIcon size={26} color="#f5f5f5" />
                </Pressable>
                <Pressable onPress={() => void toggleFavoriteSong(currentSong.id)}>
                  {isCurrentSongFavorite ? (
                    <FavoritedIcon size={26} color="#f5f5f5" />
                  ) : (
                    <UnfavoritedIcon size={26} color="#f5f5f5" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Barra de progreso */}
            <View
              className="mt-7"
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={createProgressScrubHandler(mainProgressBar)}
              onResponderMove={createProgressScrubHandler(mainProgressBar)}
              onResponderRelease={handleProgressRelease}
              onResponderTerminate={handleProgressRelease}
            >
              <View className="h-9 justify-center">
                <View
                  ref={mainProgressBarRef}
                  className="relative h-2 justify-center rounded-full"
                  style={{ backgroundColor: withAlpha(dominantColor, 0.45) }}
                  onLayout={handleMainProgressLayout}
                >
                  <View
                    pointerEvents="none"
                    className="h-2 rounded-full bg-white"
                    style={{ width: `${progress * 100}%` }}
                  />
                  <View
                    pointerEvents="none"
                    className="absolute h-4 w-4 rounded-full bg-white"
                    style={{ left: `${progress * 100}%`, transform: [{ translateX: -8 }] }}
                  />
                </View>
              </View>
              <View className="-mt-1 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-white/60">{elapsed}</Text>
                <Text className="text-xs font-medium text-white/60">-{remaining}</Text>
              </View>
            </View>
          </View>

          {/* Controles */}
          <View className="flex-row items-center justify-between px-1">
            <Pressable
              className="h-12 w-12 items-center justify-center"
              onPress={() => setShuffleEnabled(!shuffleEnabled)}
            >
              <ShuffleIcon
                size={24}
                color={shuffleEnabled ? "#ffffff" : "#888888"}
              />
            </Pressable>
            <Pressable
              className="h-12 w-12 items-center justify-center"
              onPress={() => void playPrevious()}
            >
              <BackwardIcon size={36} color="#f5f5f5" />
            </Pressable>
            <Pressable
              className="h-20 w-20 items-center justify-center"
              onPress={() => void togglePlayPause()}
            >
              <FontAwesome5
                name={playing ? "pause" : "play"}
                size={44}
                color="#f5f5f5"
                style={{ marginLeft: playing ? 0 : 4 }}
              />
            </Pressable>
            <Pressable
              className="h-12 w-12 items-center justify-center"
              onPress={() => void playNext()}
            >
              <ForwardIcon size={36} color="#f5f5f5" />
            </Pressable>
            <Pressable
              className="h-12 w-12 items-center justify-center"
              onPress={cyclePlaybackMode}
            >
              <RepeatModeIcon
                size={24}
                color={repeatActive ? "#ffffff" : "#888888"}
              />
            </Pressable>
          </View>

          {/* Botón de Letras - centro inferior */}
          <View className="absolute bottom-0 items-center w-full justify-center">
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => setLyricsVisible(true)}
            >
              <MaterialCommunityIcons name="format-letter-case" size={22} color="#f5f5f5" />
            </Pressable>
          </View>
        </View>

        {queueVisible ? (
          <QueuePlaylistModal
            visible={queueVisible}
            queue={currentQueue}
            currentIndex={currentIndex}
            onClose={() => setQueueVisible(false)}
            onSelectSong={index => {
              setQueueVisible(false);
              void playSong(currentQueue, index);
            }}
          />
        ) : null}

        {trackMenuVisible ? (
          <Modal transparent visible={trackMenuVisible} animationType="fade" onRequestClose={closeTrackMenu}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={closeTrackMenu} />
            <View
              className="rounded-t-[32px] px-6 pb-8 pt-6"
              style={{ backgroundColor: theme.surface }}
            >
              {[
                [t('track_action_delete', 'Delete'), () => { closeTrackMenu(); setDeleteConfirmVisible(true); }],
                [t('track_action_share', 'Share'), () => { closeTrackMenu(); void shareAudioFile(currentSong.id); }],
                [t('track_action_details', 'Track details'), () => { closeTrackMenu(); setDetailsVisible(true); }],
                ["Equalizer", () => { void openEqualizer(); }],
                [t('track_action_album', 'Album'), () => openRelatedSongs("album")],
                [t('track_action_artist', 'Artist'), () => openRelatedSongs("artist")],
                [t('track_action_define_as', 'Set as'), () => { closeTrackMenu(); setDefineAsVisible(true); }],
                [t('settings', 'Settings'), () => { closeTrackMenu(); setSettingsVisible(true); }],
              ].map(([label, onPress]) => (
                <Pressable key={label as string} className="border-b border-white/5 px-2 py-4" onPress={onPress as () => void}>
                  <Text className="text-base font-bold" style={{ color: theme.text }}>{label as string}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          </Modal>
        ) : null}

        {detailsVisible ? (
          <SongDetailsModal
            song={currentSong}
            onClose={() => setDetailsVisible(false)}
          />
        ) : null}

        {lyricsVisible ? (
          <LyricsModal
            song={currentSong}
            visible={lyricsVisible}
            onClose={() => setLyricsVisible(false)}
          />
        ) : null}

        {deleteConfirmVisible ? (
          <ConfirmDeleteModal
            visible={deleteConfirmVisible}
            title={t('delete_song_title', 'Delete song')}
            message={t('delete_song_message', 'Do you want to delete %count% %label%? This action cannot be undone.').replace('%count%', '1').replace('%label%', t('delete_song_single', 'song'))}
            itemName={currentSong.title}
            artwork={currentSong.artwork}
            accent="white"
            onClose={() => setDeleteConfirmVisible(false)}
            onConfirm={() => {
              setDeleteConfirmVisible(false);
              void deleteCurrentSong();
            }}
          />
        ) : null}

        {defineAsVisible ? (
          <Modal transparent visible={defineAsVisible} animationType="fade" onRequestClose={() => setDefineAsVisible(false)}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setDefineAsVisible(false)} />
            <View
              className="rounded-t-[32px] px-4 pt-3"
              style={{
                backgroundColor: theme.background,
                borderTopColor: theme.border,
                borderTopWidth: 1,
                paddingBottom: Math.max(insets.bottom, 24),
                shadowColor: '#000',
                shadowOpacity: 0.22,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: -8 },
                elevation: 12,
              }}
            >
              <View className="mb-4 items-center">
                <View className="h-1.5 w-12 rounded-full" style={{ backgroundColor: theme.mutedText + '99' }} />
              </View>

              <View className="mb-4 flex-row items-center justify-between px-1">
                <View className="flex-1 pr-3">
                  <Text className="text-2xl font-bold" style={{ color: theme.text }}>
                    Definir como
                  </Text>
                  <Text className="mt-1 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
                    {currentSong.title}
                  </Text>
                </View>
                <Pressable
                  className="rounded-full px-3 py-2"
                  onPress={() => setDefineAsVisible(false)}
                >
                  <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                    Cerrar
                  </Text>
                </Pressable>
              </View>

              <View
                className="mb-4 flex-row items-center rounded-[24px] px-3 py-3"
              >
                {currentSong.artwork ? (
                  <Image
                    source={{ uri: currentSong.artwork }}
                    className="mr-3 h-12 w-12 rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <MaterialCommunityIcons name="music-note" size={22} color={theme.text} />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-sm font-bold" style={{ color: theme.text }} numberOfLines={1}>
                    {currentSong.title}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: theme.mutedText }} numberOfLines={1}>
                    {normalizeValue(currentSong.artist, UNKNOWN_ARTIST)}
                  </Text>
                </View>
              </View>

              <View className="gap-2">
                {[
                  { label: 'Tono del dispositivo', value: 'ringtone' as ToneType, description: 'Usar como tono de llamada' },
                  { label: 'Tono de alarma', value: 'alarm' as ToneType, description: 'Usar como alarma' },
                ].map(option => (
                  <Pressable
                    key={option.value}
                    className="rounded-[22px] border px-4 py-4"
                    style={{ backgroundColor: theme.surface + 'CC', borderColor: theme.border }}
                    onPress={() => void defineSongAs(option.value)}
                  >
                    <Text className="text-base font-bold" style={{ color: theme.text }}>
                      {option.label}
                    </Text>
                    <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                      {option.description}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          </Modal>
        ) : null}

        {miniPlayerVisible ? (
          <Modal
            transparent
            visible={miniPlayerVisible}
            animationType="fade"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => setMiniPlayerVisible(false)}
          >
          <View className="flex-1 items-center justify-center px-6">
            <Pressable
              className="absolute inset-0 bg-black/60"
              onPress={() => setMiniPlayerVisible(false)}
            />
            <View
              className="w-full max-w-[380px] overflow-hidden rounded-[34px] p-6"
              style={{
                backgroundColor: 'rgba(10,10,10,0.82)',
                borderColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                shadowColor: '#000',
                shadowOpacity: 0.28,
                shadowOffset: { width: 0, height: 8 },
                shadowRadius: 18,
              }}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[withAlpha(dominantColor, 0.22), 'rgba(0,0,0,0.2)']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <View className="aspect-square w-full items-center justify-center overflow-hidden rounded-[24px] bg-[#2a2a2a]">
                {currentSong.artwork ? (
                  <Image
                    source={{ uri: currentSong.artwork }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={DEFAULT_MUSIC_ARTWORK}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                )}
              </View>

              <View className="mt-4 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <AutoScrollingText className="text-base font-bold text-white">
                    {currentSong.title}
                  </AutoScrollingText>
                  <AutoScrollingText className="mt-1 text-xs text-white/55">
                    {normalizeValue(currentSong.artist, UNKNOWN_ARTIST)}
                  </AutoScrollingText>
                </View>
                <Pressable onPress={() => void toggleFavoriteSong(currentSong.id)}>
                  {isCurrentSongFavorite ? (
                    <FavoritedIcon size={22} color="#f5f5f5" />
                  ) : (
                    <UnfavoritedIcon size={22} color="#f5f5f5" />
                  )}
                </Pressable>
              </View>

              <View
                className="mt-4"
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={createProgressScrubHandler(miniProgressBar)}
                onResponderMove={createProgressScrubHandler(miniProgressBar)}
                onResponderRelease={handleProgressRelease}
                onResponderTerminate={handleProgressRelease}
              >
                <View className="h-8 justify-center">
                  <View
                    ref={miniProgressBarRef}
                    className="relative h-2 justify-center rounded-full bg-white/20"
                    onLayout={handleMiniProgressLayout}
                  >
                    <View
                      pointerEvents="none"
                      className="h-2 rounded-full bg-white"
                      style={{ width: `${progress * 100}%` }}
                    />
                    <View
                      pointerEvents="none"
                      className="absolute h-3.5 w-3.5 rounded-full bg-white"
                      style={{ left: `${progress * 100}%`, transform: [{ translateX: -7 }] }}
                    />
                  </View>
                </View>
                <View className="-mt-1 flex-row items-center justify-between">
                  <Text className="text-xs text-white/50">{elapsed}</Text>
                  <Text className="text-xs text-white/50">-{remaining}</Text>
                </View>
              </View>

              <View className="mt-5 flex-row items-center justify-center gap-8">
                <Pressable onPress={() => void playPrevious()}>
                  <BackwardIcon size={30} color="#f5f5f5" />
                </Pressable>
                <Pressable onPress={() => void togglePlayPause()}>
                  <Ionicons name={playing ? "pause" : "play"} size={44} color="#f5f5f5" />
                </Pressable>
                <Pressable onPress={() => void playNext()}>
                  <ForwardIcon size={30} color="#f5f5f5" />
                </Pressable>
              </View>

              <View className="mt-6 flex-row items-center gap-3">
                <VolumeLowIcon size={22} color="#f5f5f5" />
                <View
                  className="h-8 flex-1 justify-center"
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={handleVolumeGesture}
                  onResponderMove={handleVolumeGesture}
                >
                  <View
                    ref={volumeBarRef}
                    className="relative h-2 justify-center rounded-full bg-white/20"
                    onLayout={handleVolumeLayout}
                  >
                    <View
                      pointerEvents="none"
                      className="h-2 rounded-full bg-white"
                      style={{ width: `${volume * 100}%` }}
                    />
                    <View
                      pointerEvents="none"
                      className="absolute h-3.5 w-3.5 rounded-full bg-white"
                      style={{ left: `${volume * 100}%`, transform: [{ translateX: -7 }] }}
                    />
                  </View>
                </View>
                <VolumeHighIcon size={22} color="#f5f5f5" />
              </View>
            </View>
          </View>
          </Modal>
        ) : null}
        
        {lockScreenVisible ? (
          <Modal
            transparent
            visible={lockScreenVisible}
            animationType="fade"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => setLockScreenVisible(false)}
          >
          <View
            className="flex-1 px-6 pt-20"
          >
            <LinearGradient
              pointerEvents="none"
              colors={[dominantColor, withAlpha(dominantColor, 1), "#000000"]}
              locations={[0, 0.5, 1]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <View className="items-center">
              <Text
                className="text-3xl capitalize text-white/70"
                style={{ fontFamily: LOCK_DATE_FONT }}
              >
                {lockScreenDate}
              </Text>
              <Text
                className="mt-1 text-6xl font-black tracking-[-2px] text-white"
              >
                {lockScreenTime}
              </Text>
            </View>

            <View className="mt-10 aspect-square w-full items-center justify-center overflow-hidden rounded-[14px] bg-[#2a2a2a]">
              {currentSong.artwork ? (
                <Image
                  source={{ uri: currentSong.artwork }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={DEFAULT_MUSIC_ARTWORK}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              )}
            </View>

            <View className="mt-14 rounded-[32px] border border-white/10 bg-white/10 px-5 py-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <AutoScrollingText className="text-lg font-bold text-white">
                    {currentSong.title}
                  </AutoScrollingText>
                  <AutoScrollingText className="mt-1 text-sm text-white/60">
                    {normalizeValue(currentSong.artist, UNKNOWN_ARTIST)}
                  </AutoScrollingText>
                </View>
                <View className="flex-row items-center gap-5">
                  <AudioWaveBars playing={playing} color="#f5f5f5" size="md" />
                  <Pressable onPress={() => void toggleFavoriteSong(currentSong.id)}>
                    {isCurrentSongFavorite ? (
                      <FavoritedIcon size={24} color="#f5f5f5" />
                    ) : (
                      <UnfavoritedIcon size={24} color="#f5f5f5" />
                    )}
                  </Pressable>
                </View>
              </View>

              <View
                className="mt-5"
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={createProgressScrubHandler(lockProgressBar)}
                onResponderMove={createProgressScrubHandler(lockProgressBar)}
                onResponderRelease={handleProgressRelease}
                onResponderTerminate={handleProgressRelease}
              >
                <View className="h-8 justify-center">
                  <View
                    ref={lockProgressBarRef}
                    className="relative h-2 justify-center rounded-full bg-white/25"
                    onLayout={handleLockProgressLayout}
                  >
                    <View
                      pointerEvents="none"
                      className="h-2 rounded-full bg-white"
                      style={{ width: `${progress * 100}%` }}
                    />
                    <View
                      pointerEvents="none"
                      className="absolute h-4 w-4 rounded-full bg-white"
                      style={{ left: `${progress * 100}%`, transform: [{ translateX: -8 }] }}
                    />
                  </View>
                </View>
                <View className="-mt-1 flex-row items-center justify-between">
                  <Text className="text-xs text-white/60">{elapsed}</Text>
                  <Text className="text-xs text-white/60">-{remaining}</Text>
                </View>
              </View>

              <View className="mt-5 flex-row items-center justify-center gap-9">
                <Pressable onPress={() => void playPrevious()}>
                  <Ionicons name="play-skip-back" size={32} color="#f5f5f5" />
                </Pressable>
                <Pressable onPress={() => void togglePlayPause()}>
                  <Ionicons name={playing ? "pause" : "play"} size={42} color="#f5f5f5" />
                </Pressable>
                <Pressable onPress={() => void playNext()}>
                  <Ionicons name="play-skip-forward" size={32} color="#f5f5f5" />
                </Pressable>
              </View>
            </View>
          </View>
          </Modal>
        ) : null}

        {equalizerVisible ? (
          <Modal transparent visible={equalizerVisible} animationType="fade" onRequestClose={() => setEqualizerVisible(false)}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setEqualizerVisible(false)} />
            <View
              className="rounded-t-[32px] px-4 pb-8 pt-4"
              style={{
                backgroundColor: theme.background,
                borderTopColor: theme.border,
                borderTopWidth: 1,
                paddingBottom: Math.max(insets.bottom, 24),
              }}
            >
              <View className="mb-4 items-center">
                <View className="h-1.5 w-12 rounded-full" style={{ backgroundColor: theme.mutedText + "99" }} />
              </View>

              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-2xl font-bold" style={{ color: theme.text }}>
                  Ecualizador
                </Text>
                <Pressable
                  className="rounded-full px-3 py-2"
                  onPress={() => setEqualizerVisible(false)}
                >
                  <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                    Cerrar
                  </Text>
                </Pressable>
              </View>

              <View className="mb-4 flex-row items-center justify-between rounded-full border px-3 py-2" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                  Activado
                </Text>
                <Pressable
                  onPress={() => { void toggleEqualizer(); }}
                  className="h-8 w-14 items-center justify-center rounded-full px-1"
                  style={{ backgroundColor: equalizerEnabled ? theme.background : theme.mutedText }}
                >
                  <View
                    className="h-6 w-6 rounded-full"
                    style={{
                      backgroundColor: equalizerEnabled ? theme.accent : theme.mutedText,
                      alignSelf: equalizerEnabled ? 'flex-end' : 'flex-start',
                      marginHorizontal: 2,
                    }}
                  />
                </Pressable>
              </View>

              <View className="mb-5 flex-row flex-wrap justify-center gap-2">
                {Object.keys(EQUALIZER_PRESETS).map((presetName) => (
                  <Pressable
                    key={presetName}
                    onPress={() => { void applyPreset(presetName); }}
                    className="rounded-full px-3 py-2"
                    style={{
                      backgroundColor: theme.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                      minWidth: 74,
                    }}
                  >
                    <Text className="text-xs font-bold text-center uppercase tracking-[0.12em]" style={{ color: theme.text }}>
                      {presetName}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {equalizerLoading ? (
                <Text className="py-6 text-center text-sm" style={{ color: theme.mutedText }}>
                  Cargando ecualizador…
                </Text>
              ) : equalizerBands.length ? (
                <View className="flex-row items-end justify-between gap-1.5">
                  {equalizerBands.map((band, index) => {
                    const handleSliderChange = async (nextLevel: number) => {
                      const clampedLevel = Math.max(band.minLevel, Math.min(band.maxLevel, nextLevel));

                      setEqualizerBands((currentBands) => {
                        const nextBands = currentBands.map((item) =>
                          item.index === band.index
                            ? { ...item, level: clampedLevel }
                            : item
                        );

                        void applyEqualizerBands(nextBands, equalizerEnabled);
                        return nextBands;
                      });
                    };

                    return (
                      <View key={band.index} className="items-center" style={{ width: `${100 / Math.min(equalizerBands.length || 1, 7)}%` }}>
                        <Text className="mb-2 text-[10px] font-bold" style={{ color: theme.mutedText }}>
                          {formatFrequencyLabel(band.frequency)}
                        </Text>

                        <VerticalEqualizerSlider
                          band={band}
                          activeColor={theme.accent}
                          onChange={(nextLevel) => {
                            void handleSliderChange(nextLevel);
                          }}
                        />

                        <Text className="mt-2 text-[10px] font-bold" style={{ color: theme.text }}>
                          {band.level} dB
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text className="py-6 text-center text-sm" style={{ color: theme.mutedText }}>
                  No hay bandas disponibles para este audio.
                </Text>
              )}
            </View>
          </View>
          </Modal>
        ) : null}

        {relatedSongs ? (
          <RelatedTracksModal
            visible={Boolean(relatedSongs)}
            title={relatedSongs.title}
            songs={relatedSongs.songs}
            variant={relatedSongs.type}
            artwork={relatedSongs.songs[0]?.artwork}
            onClose={() => setRelatedSongs(null)}
            onPlayAll={() => {
              if (!relatedSongs.songs.length) return;
              setRelatedSongs(null);
              void playSong(relatedSongs.songs, 0);
            }}
            onSelectSong={(index) => {
              setRelatedSongs(null);
              void playSong(relatedSongs.songs, index);
            }}
          />
        ) : null}

        {settingsVisible ? (
          <AppSettingsModal
            visible={settingsVisible}
            onClose={() => setSettingsVisible(false)}
          />
        ) : null}
      </View>
    </Modal>
  );
};

export default PlayerScreen;