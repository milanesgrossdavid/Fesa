import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "react-native";
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
import {
  getAudioSessionId,
  setEqualizerEnabled as setEqualizerEnabledState,
  setEqualizerLevels,
  useMusicPlayerUi,
  usePlaybackProgress,
  usePlayerVolume,
} from "../audio/musicPlayer";
import AppSettingsModal from "../components/AppSettingsModal";
import AppModal from "../components/AppModal";
import AudioWaveBars from "../components/AudioWaveBars";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import QueuePlaylistModal from "../components/QueuePlaylistModal";
import RelatedTracksModal from "../components/RelatedTracksModal";
import SetAsSuccessModal from "../components/SetAsSuccessModal";
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
import { useAppSettingsLanguage, useAppSettingsTheme } from "../settings/appSettings";
import { getTranslation } from "../i18n/translations";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { getGradientColors, useDominantColor, withAlpha } from "../hooks/useDominantColor";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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

const equalizerPresetLabels: Record<string, string> = {
  Flat: 'Flat',
  Bass: 'Bass',
  Vocal: 'Vocal',
  Rock: 'Rock',
  Pop: 'Pop',
  Treble: 'Treble',
  Club: 'Club',
};

const LOCK_DATE_FONT = "Fesa-LockDate";
const UNKNOWN_ALBUM = "Álbum Desconocido";
const UNKNOWN_ARTIST = "Artista Desconocido";
const DEFAULT_MUSIC_ARTWORK = require("../../assets/musicNotFound.jpg");
let lockFontPromise: Promise<void> | null = null;

const normalizeValue = (value: string | null | undefined, fallback: string) =>
  value?.trim() || fallback;

const getContrastColorForBackground = (backgroundColor: string, fallback: string = '#ffffff') => {
  const hex = backgroundColor?.startsWith('#') ? backgroundColor : fallback;
  const normalized = hex.replace('#', '');

  if (normalized.length !== 6) return fallback;

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.6 ? '#111111' : '#ffffff';
};

const VerticalEqualizerSlider = React.memo(({
  band,
  activeColor,
  onChange,
}: {
  band: EqualizerBand;
  activeColor: string;
  onChange: (nextLevel: number) => void;
}) => {
  const trackRef = useRef<View>(null);
  const trackLayoutRef = useRef({ top: 0, height: 0 });
  const bandRef = useRef(band);
  bandRef.current = band;

  const updateLevelFromPointer = (pointerY: number) => {
    const { top, height } = trackLayoutRef.current;
    if (!height) return;

    const bottom = top + height;
    const clampedY = Math.min(Math.max(pointerY, top), bottom);
    const percent = (bottom - clampedY) / height;
    const current = bandRef.current;
    const nextLevel = current.minLevel + (current.maxLevel - current.minLevel) * percent;
    onChange(Math.round(nextLevel));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        if (trackLayoutRef.current.height) {
          updateLevelFromPointer(gestureState.y0);
          return;
        }

        trackRef.current?.measureInWindow((_x, y, _width, height) => {
          trackLayoutRef.current = { top: y, height };
          updateLevelFromPointer(gestureState.y0);
        });
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
        onLayout={() => {
          trackRef.current?.measureInWindow((_x, y, _width, height) => {
            trackLayoutRef.current = { top: y, height };
          });
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
            transform: [{ translateX: -9 }, { translateY: 18 }],
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
});

const EqualizerBandControl = React.memo(({
  band,
  activeColor,
  onChange,
}: {
  band: EqualizerBand;
  activeColor: string;
  onChange: (index: number, level: number) => void;
}) => {
  const [level, setLevel] = useState(band.level);

  useEffect(() => {
    setLevel(band.level);
  }, [band.level]);

  const handleChange = useCallback(
    (nextLevel: number) => {
      setLevel(nextLevel);
      onChange(band.index, nextLevel);
    },
    [band.index, onChange],
  );

  return (
    <View className="items-center" style={{ width: `${100 / 7}%` }}>
      <Text className="mb-2 text-[10px] font-bold" style={{ color: '#999' }}>
        {band.frequency >= 1000 ? `${Math.round(band.frequency / 1000)}k` : `${Math.round(band.frequency)}`}
      </Text>
      <VerticalEqualizerSlider
        band={{ ...band, level }}
        activeColor={activeColor}
        onChange={handleChange}
      />
      <Text className="mt-2 text-[10px] font-bold" style={{ color: '#fff' }}>
        {level} dB
      </Text>
    </View>
  );
});

const VolumeSlider = React.memo(({ setVolume }: { setVolume: (value: number) => void }) => {
  const volume = usePlayerVolume();
  const volumeBarRef = useRef<View>(null);
  const volumeBarLayoutRef = useRef({ x: 0, width: 0 });

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    requestAnimationFrame(() => {
      volumeBarRef.current?.measureInWindow((x, _y, measuredWidth) => {
        volumeBarLayoutRef.current = { x, width: measuredWidth || width };
      });
    });
  }, []);

  const handleGesture = useCallback(
    (event: GestureResponderEvent) => {
      const { x, width } = volumeBarLayoutRef.current;
      if (!width) return;
      const touchX = x ? event.nativeEvent.pageX - x : event.nativeEvent.locationX;
      setVolume(Math.min(Math.max(touchX / width, 0), 1));
    },
    [setVolume],
  );

  return (
    <View className="mt-6 flex-row items-center gap-3">
      <VolumeLowIcon size={22} color="#f5f5f5" />
      <View
        className="h-8 flex-1 justify-center"
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleGesture}
        onResponderMove={handleGesture}
      >
        <View ref={volumeBarRef} className="relative h-2 justify-center rounded-full bg-white/20" onLayout={handleLayout}>
          <View pointerEvents="none" className="h-2 rounded-full bg-white" style={{ width: `${volume * 100}%` }} />
          <View pointerEvents="none" className="absolute h-3.5 w-3.5 rounded-full bg-white" style={{ left: `${volume * 100}%`, transform: [{ translateX: -7 }] }} />
        </View>
      </View>
      <VolumeHighIcon size={22} color="#f5f5f5" />
    </View>
  );
});

const PlaybackProgressBar = React.memo(({
  seekTo,
  barClassName,
  thumbClassName,
  containerClassName = "mt-7",
  trackBackgroundColor,
  thumbOffset = -8,
}: {
  seekTo: (seconds: number) => void;
  barClassName: string;
  thumbClassName: string;
  containerClassName?: string;
  trackBackgroundColor?: string;
  thumbOffset?: number;
}) => {
  const { currentTime, durationSeconds } = usePlaybackProgress();
  const progressBarRef = useRef<View>(null);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const activeBarRef = useRef({ x: 0, width: 0 });
  const playbackDuration = durationSeconds || 0;
  const displayTime = scrubTime ?? currentTime;
  const progress = playbackDuration > 0
    ? Math.min(Math.max(displayTime / playbackDuration, 0), 1)
    : 0;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    requestAnimationFrame(() => {
      progressBarRef.current?.measureInWindow((x, _y, measuredWidth) => {
        activeBarRef.current = { x, width: measuredWidth || width };
      });
    });
  }, []);

  const getTimeFromGesture = useCallback(
    (event: GestureResponderEvent) => {
      if (!activeBarRef.current.width || !playbackDuration) return null;
      const touchX = activeBarRef.current.x
        ? event.nativeEvent.pageX - activeBarRef.current.x
        : event.nativeEvent.locationX;
      return Math.min(Math.max(touchX / activeBarRef.current.width, 0), 1) * playbackDuration;
    },
    [playbackDuration],
  );

  const handleGesture = useCallback(
    (event: GestureResponderEvent) => {
      const nextTime = getTimeFromGesture(event);
      if (nextTime !== null) setScrubTime(nextTime);
    },
    [getTimeFromGesture],
  );

  const handleRelease = useCallback(
    (event: GestureResponderEvent) => {
      const nextTime = scrubTime ?? getTimeFromGesture(event);
      setScrubTime(null);
      if (nextTime !== null) seekTo(nextTime);
    },
    [getTimeFromGesture, scrubTime, seekTo],
  );

  return (
    <View
      className={containerClassName}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleGesture}
      onResponderMove={handleGesture}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleRelease}
    >
      <View className="h-9 justify-center">
        <View
          ref={progressBarRef}
          className={barClassName}
          style={{ backgroundColor: trackBackgroundColor ?? 'rgba(255,255,255,0.25)' }}
          onLayout={handleLayout}
        >
          <View pointerEvents="none" className="h-2 rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
          <View
            pointerEvents="none"
            className={thumbClassName}
            style={{ left: `${progress * 100}%`, transform: [{ translateX: thumbOffset }] }}
          />
        </View>
      </View>
      <View className="-mt-1 flex-row items-center justify-between">
        <Text className="text-xs font-medium text-white/60">{formatDuration(Math.round(displayTime * 1000))}</Text>
        <Text className="text-xs font-medium text-white/60">-{formatDuration(Math.round(Math.max(playbackDuration - displayTime, 0) * 1000))}</Text>
      </View>
    </View>
  );
});

const CoverArt = React.memo(({ artwork }: { artwork?: string | null }) => (
  <View className="aspect-square w-full max-w-[400px] items-center justify-center self-center overflow-hidden rounded-3xl bg-[#2a2a2a]">
    {artwork ? (
      <Image
        source={{ uri: artwork }}
        className="h-full w-full"
        resizeMode="cover"
        fadeDuration={0}
        progressiveRenderingEnabled
      />
    ) : (
      <Image source={DEFAULT_MUSIC_ARTWORK} className="h-full w-full" resizeMode="cover" fadeDuration={0} />
    )}
  </View>
));

type HeaderProps = {
  onBack: () => void;
  onOpenMiniPlayer: () => void;
  onOpenLockScreen: () => void;
  onOpenTrackMenu: () => void;
};
const PlayerHeader = React.memo(({ onBack, onOpenMiniPlayer, onOpenLockScreen, onOpenTrackMenu }: HeaderProps) => (
  <View className="flex-row items-center justify-between">
    <Pressable className="-ml-2 h-10 w-10 items-center justify-center" onPress={onBack}>
      <BackIcon size={26} color="#f5f5f5" />
    </Pressable>
    <View className="-mr-2 flex-row items-center">
      <Pressable className="h-10 w-10 items-center justify-center" onPress={onOpenMiniPlayer}>
        <ImageIcon size={22} color="#f5f5f5" />
      </Pressable>
      <Pressable className="h-10 w-10 items-center justify-center" onPress={onOpenLockScreen}>
        <LockScreenIcon size={22} color="#f5f5f5" />
      </Pressable>
      <Pressable className="h-10 w-10 items-center justify-center" onPress={onOpenTrackMenu}>
        <DotsIcon size={24} color="#f5f5f5" />
      </Pressable>
    </View>
  </View>
));

type SongInfoProps = {
  title: string;
  artist: string;
  isFavorite: boolean;
  onOpenQueue: () => void;
  onToggleFavorite: () => void;
};
const SongInfo = React.memo(({ title, artist, isFavorite, onOpenQueue, onToggleFavorite }: SongInfoProps) => (
  <View className="flex-row items-center">
    <View className="flex-1 pr-4">
      <AutoScrollingText className="text-2xl font-bold text-white">{title}</AutoScrollingText>
      <AutoScrollingText className="mt-1 text-base text-white/60">{artist}</AutoScrollingText>
    </View>
    <View className="flex-row items-center gap-5">
      <Pressable onPress={onOpenQueue}>
        <PlaylistIcon size={26} color="#f5f5f5" />
      </Pressable>
      <Pressable onPress={onToggleFavorite}>
        {isFavorite ? (
          <FavoritedIcon size={26} color="#f5f5f5" />
        ) : (
          <UnfavoritedIcon size={26} color="#f5f5f5" />
        )}
      </Pressable>
    </View>
  </View>
));

type PlaybackControlsProps = {
  playing: boolean;
  shuffleEnabled: boolean;
  repeatActive: boolean;
  shuffleColor: string;
  inactiveColor: string;
  repeatIcon: React.ComponentType<{ size: number; color: string }>;
  onToggleShuffle: () => void;
  onPrevious: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onCycleRepeat: () => void;
  onOpenLyrics: () => void;
};
const PlaybackControls = React.memo((props: PlaybackControlsProps) => {
  const {
    playing, shuffleEnabled, repeatActive,
    shuffleColor, inactiveColor, repeatIcon: RepeatIcon,
    onToggleShuffle, onPrevious, onPlayPause, onNext, onCycleRepeat, onOpenLyrics,
  } = props;

  return (
    <>
      <View className="flex-row items-center justify-between px-1">
        <Pressable className="h-12 w-12 items-center justify-center rounded-full" onPress={onToggleShuffle}>
          <ShuffleIcon
            size={24}
            color={shuffleEnabled ? shuffleColor : inactiveColor}
          />
        </Pressable>
        <Pressable className="h-12 w-12 items-center justify-center" onPress={onPrevious}>
          <BackwardIcon size={36} color="#f5f5f5" />
        </Pressable>
        <Pressable className="h-20 w-20 items-center justify-center" onPress={onPlayPause}>
          <FontAwesome5
            name={playing ? "pause" : "play"}
            size={44}
            color="#f5f5f5"
            style={{ marginLeft: playing ? 0 : 4 }}
          />
        </Pressable>
        <Pressable className="h-12 w-12 items-center justify-center" onPress={onNext}>
          <ForwardIcon size={36} color="#f5f5f5" />
        </Pressable>
        <Pressable className="h-12 w-12 items-center justify-center rounded-full" onPress={onCycleRepeat}>
          <RepeatIcon
            size={24}
            color={repeatActive ? shuffleColor : inactiveColor}
          />
        </Pressable>
      </View>
      <View className="absolute bottom-0 items-center w-full justify-center">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full" onPress={onOpenLyrics}>
          <MaterialCommunityIcons name="format-letter-case" size={22} color="#f5f5f5" />
        </Pressable>
      </View>
    </>
  );
});

const PlayerScreen = ({ onBack }: PlayerScreenProps) => {
  const {
    currentSong,
    currentIndex,
    playing,
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
  } = useMusicPlayerUi();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const insets = useSafeAreaInsets();
  const t = useCallback(
    (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback),
    [language.id],
  );

  const [allSongs, setAllSongs] = useState<Song[]>([]);

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

  // Lazy-mount flags: each sub-modal only enters the tree when first opened,
  // and is unmounted (not just hidden) after its close animation finishes.
  // This prevents BlurView/LinearGradient/Icon trees from staying alive in the
  // native view hierarchy when the user is on a different overlay.
  const [miniPlayerMounted, setMiniPlayerMounted] = useState(false);
  const [lockScreenMounted, setLockScreenMounted] = useState(false);
  const [equalizerMounted, setEqualizerMounted] = useState(false);
  const [defineAsMounted, setDefineAsMounted] = useState(false);
  const [setAsSuccessVisible, setSetAsSuccessVisible] = useState(false);
  const [setAsSuccessTone, setSetAsSuccessTone] = useState<ToneType>('ringtone');
  const [trackMenuMounted, setTrackMenuMounted] = useState(false);

  // Track "transitioning out" so we can keep the Modal in the tree (with
  // visible=false) while the close animation plays, then unmount it.
  const [miniPlayerClosing, setMiniPlayerClosing] = useState(false);
  const [lockScreenClosing, setLockScreenClosing] = useState(false);
  const [equalizerClosing, setEqualizerClosing] = useState(false);
  const [defineAsClosing, setDefineAsClosing] = useState(false);
  const [trackMenuClosing, setTrackMenuClosing] = useState(false);

  const requestCloseMiniPlayer = useCallback(() => {
    setMiniPlayerVisible(false);
  }, []);
  const requestCloseLockScreen = useCallback(() => {
    setLockScreenVisible(false);
  }, []);
  const requestCloseEqualizer = useCallback(() => {
    setEqualizerVisible(false);
  }, []);
  const requestCloseDefineAs = useCallback(() => {
    setDefineAsVisible(false);
  }, []);
  const requestCloseTrackMenu = useCallback(() => {
    setTrackMenuVisible(false);
  }, []);

  // After the parent Modal slide-in finishes, allow child modals to be shown.
  // Setting visible=true on a nested Modal while the parent is still animating
  // makes the child "float" over the half-rendered parent.
  // Two requestAnimationFrame calls lets the slide-in paint at least one
  // frame before we unmask the children.
  const [parentAnimationDone, setParentAnimationDone] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const first = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setParentAnimationDone(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(first);
    };
  }, []);

  const isScreenMountedRef = useRef(true);
  const equalizerRequestIdRef = useRef(0);
  const equalizerSessionIdRef = useRef<number | null>(null);
  const equalizerEnabledRef = useRef(true);
  const equalizerBandsRef = useRef<EqualizerBand[]>([]);
  const equalizerWriteRef = useRef(Promise.resolve());
  const lastEqualizerSongIdRef = useRef<string | null>(null);

  // If the song changes mid-drag of the equalizer, the native audio session
  // is replaced by expo-audio. Reset the cached session id so the next
  // applyEqualizerBands() re-reads the active session from the player.
  useEffect(() => {
    const songId = currentSong?.id ?? null;
    if (songId !== lastEqualizerSongIdRef.current) {
      lastEqualizerSongIdRef.current = songId;
      equalizerSessionIdRef.current = null;
      setEqualizerSessionId(null);
    }
  }, [currentSong?.id]);

  // Back gesture on Android: when a sub-modal is open, intercept the back
  // button and dismiss the topmost modal in order. RN's `onRequestClose` is
  // unreliable for transparent modals nested inside another Modal because the
  // outer Modal's window intercepts the back event first. Registering a
  // single BackHandler here lets us hand-dispatch the close to the correct
  // sub-modal regardless of the render tree.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (trackMenuVisible) { requestCloseTrackMenu(); return true; }
      if (equalizerVisible) { requestCloseEqualizer(); return true; }
      if (defineAsVisible) { requestCloseDefineAs(); return true; }
      if (lockScreenVisible) { requestCloseLockScreen(); return true; }
      if (miniPlayerVisible) { requestCloseMiniPlayer(); return true; }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [
    defineAsVisible,
    equalizerVisible,
    lockScreenVisible,
    miniPlayerVisible,
    requestCloseDefineAs,
    requestCloseEqualizer,
    requestCloseLockScreen,
    requestCloseMiniPlayer,
    requestCloseTrackMenu,
    trackMenuVisible,
  ]);

  // Stable fallback for dominant color (theme.surface from a static list, but we still keep it stable per theme id).
  const themeSurface = useMemo(() => theme.surface || '#252525', [theme.surface, theme.id]);
  const dominantColor = useDominantColor(currentSong?.artwork ?? null, themeSurface);
  const gradientColors = useMemo(() => getGradientColors(dominantColor), [dominantColor]);

  useEffect(() => {
    isScreenMountedRef.current = true;

    lockFontPromise ??= Font.loadAsync({
      [LOCK_DATE_FONT]: require("../../assets/fonts/SFNSText-Regular.otf"),
    });

    lockFontPromise.catch((error) => {
      console.warn("No se pudieron cargar las fuentes del lock screen:", error);
    });

    return () => {
      isScreenMountedRef.current = false;
    };
  }, []);

  const currentQueue = useMemo(
    () => (queue.length ? queue : currentSong ? [currentSong] : []),
    [queue, currentSong],
  );

  const isCurrentSongFavorite = useMemo(
    () => (currentSong ? favoriteSongIds.includes(currentSong.id) : false),
    [currentSong, favoriteSongIds],
  );

  const RepeatModeIcon = useMemo(() => {
    if (playbackMode === "repeat-all") return RepeatAllIcon;
    if (playbackMode === "repeat-one") return RepeatOnceIcon;
    return RepeatOffbackIcon;
  }, [playbackMode]);

  const adaptiveControlColors = useMemo(() => {
    const iconColor = getContrastColorForBackground(dominantColor, '#ffffff');
    const isDarkBackground = iconColor === '#ffffff';

    return {
      iconColor,
      inactiveColor: isDarkBackground ? withAlpha('#ffffff', 0.58) : withAlpha('#111111', 0.5),
      buttonBackground: isDarkBackground ? withAlpha('#ffffff', 0.12) : withAlpha('#111111', 0.08),
      buttonBorder: isDarkBackground ? withAlpha('#ffffff', 0.18) : withAlpha('#111111', 0.12),
    };
  }, [dominantColor]);

  const repeatActive = playbackMode !== "linear";
  const closeTrackMenu = useCallback(() => setTrackMenuVisible(false), []);

  useEffect(() => {
    return () => {
      if (equalizerSessionId != null && equalizerSessionId > 0) {
        void releaseEqualizer(equalizerSessionId);
      }
    };
  }, [equalizerSessionId]);

  const applyEqualizerBands = useCallback((nextBands: EqualizerBand[], nextEnabled: boolean) => {
    // Always try the live audio session id first: after a track change the
    // cached ref is intentionally reset (so we re-read the new session), and
    // before the first play the live session id is 0 on Android — in both
    // cases we still need to push the new preset immediately instead of
    // silently bailing out and forcing the user to toggle the EQ off/on.
    let sessionId = getAudioSessionId() ?? 0;
    if (sessionId > 0) {
      equalizerSessionIdRef.current = sessionId;
      setEqualizerSessionId(sessionId);
    } else {
      sessionId = equalizerSessionIdRef.current ?? 0;
    }

    const levels = nextBands.map(band => Number(band.level));

    if (sessionId <= 0) {
      // No native session yet — persist at module scope so loadAndPlay()
      // re-applies automatically when expo-audio swaps the underlying audio
      // session on first play or on the next track change.
      setEqualizerLevels(levels);
      return;
    }

    equalizerWriteRef.current = equalizerWriteRef.current
      .catch(() => undefined)
      .then(() => {
        setEqualizerLevels(levels);
        void setEqualizerState(sessionId, nextEnabled, levels);
      })
      .then(() => undefined);
  }, []);

  const handleEqualizerBandChange = useCallback((bandIndex: number, nextLevel: number) => {
    const nextBands = equalizerBandsRef.current.map(item =>
      item.index === bandIndex ? { ...item, level: nextLevel } : item,
    );
    equalizerBandsRef.current = nextBands;
    applyEqualizerBands(nextBands, equalizerEnabledRef.current);
  }, [applyEqualizerBands]);

  const openEqualizer = useCallback(async () => {
    closeTrackMenu();
    setEqualizerMounted(true);

    if (Platform.OS !== 'android') {
      Alert.alert('Ecualizador', 'El ecualizador solo está disponible en Android.');
      return;
    }

    const sessionId = getAudioSessionId() ?? 0;
    const requestId = equalizerRequestIdRef.current + 1;
    equalizerRequestIdRef.current = requestId;
    equalizerSessionIdRef.current = sessionId;
    setEqualizerSessionId(sessionId);
    setEqualizerVisible(true);
    setEqualizerLoading(true);

    try {
      const state = await getEqualizerState(sessionId);
      if (!isScreenMountedRef.current || requestId !== equalizerRequestIdRef.current) return;

      if (!state || !state.bands.length) {
        const fallback: EqualizerBand[] = [
          { index: 0, frequency: 250, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 1, frequency: 500, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 2, frequency: 1000, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 3, frequency: 2000, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 4, frequency: 4000, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 5, frequency: 8000, level: 0, minLevel: -1500, maxLevel: 1500 },
          { index: 6, frequency: 16000, level: 0, minLevel: -1500, maxLevel: 1500 },
        ];
        equalizerEnabledRef.current = true;
        equalizerBandsRef.current = fallback;
        setEqualizerEnabled(true);
        setEqualizerBands(fallback);
        return;
      }

      const mapped: EqualizerBand[] = state.bands.map(band => ({
        index: band.index,
        frequency: Number(band.frequency),
        level: Number(band.level),
        minLevel: Number(band.minLevel),
        maxLevel: Number(band.maxLevel),
      }));
      equalizerEnabledRef.current = state.enabled;
      equalizerBandsRef.current = mapped;
      setEqualizerEnabled(state.enabled);
      setEqualizerBands(mapped);
    } catch (error) {
      if (!isScreenMountedRef.current || requestId !== equalizerRequestIdRef.current) return;

      console.warn("No se pudo cargar el ecualizador:", error);
      Alert.alert("Ecualizador", "No se pudo cargar el ecualizador del reproductor.");
      setEqualizerVisible(false);
    } finally {
      if (isScreenMountedRef.current && requestId === equalizerRequestIdRef.current) {
        setEqualizerLoading(false);
      }
    }
  }, [closeTrackMenu]);

  const toggleEqualizer = useCallback(async () => {
    const nextEnabled = !equalizerEnabledRef.current;
    equalizerEnabledRef.current = nextEnabled;
    setEqualizerEnabled(nextEnabled);
    setEqualizerEnabledState(nextEnabled);
  }, []);

  const applyPreset = useCallback(async (presetName: string) => {
    if (!equalizerBandsRef.current.length) return;

    const presetLevels = EQUALIZER_PRESETS[presetName] ?? EQUALIZER_PRESETS.Flat;
    const nextBands = equalizerBandsRef.current.map((band, index) => {
      const min = band.minLevel;
      const max = band.maxLevel;
      const target = presetLevels[index] ?? presetLevels[presetLevels.length - 1] ?? 0;
      const normalizedTarget = target * 150;

      return {
        ...band,
        level: Math.max(min, Math.min(max, normalizedTarget)),
      };
    });

    equalizerBandsRef.current = nextBands;
    setEqualizerBands(nextBands);
    applyEqualizerBands(nextBands, equalizerEnabledRef.current);
  }, [applyEqualizerBands]);

  const openRelatedSongs = useCallback(async (type: "album" | "artist") => {
    if (!currentSong) return;
    closeTrackMenu();

    let songs = allSongs;
    if (!songs.length) {
      try {
        songs = await getAudioFilesWithPermission();
        if (isScreenMountedRef.current) setAllSongs(songs);
      } catch (error) {
        console.warn("No se pudo cargar la biblioteca relacionada:", error);
        return;
      }
    }

    if (!isScreenMountedRef.current) return;

    const target =
      type === "album"
        ? normalizeValue(currentSong.album, UNKNOWN_ALBUM)
        : normalizeValue(currentSong.artist, UNKNOWN_ARTIST);
    setRelatedSongs({
      title: target,
      type,
      songs: songs.filter(song =>
        normalizeValue(
          type === "album" ? song.album : song.artist,
          type === "album" ? UNKNOWN_ALBUM : UNKNOWN_ARTIST,
        ) === target,
      ),
    });
  }, [allSongs, closeTrackMenu, currentSong]);

  const defineSongAs = useCallback(async (type: ToneType) => {
    if (!currentSong) return;
    setDefineAsVisible(false);

    const setAsTone = await setAudioAsTone(currentSong.id, type);
    if (!setAsTone) return;

    setSetAsSuccessTone(type);
    setSetAsSuccessVisible(true);
  }, [currentSong]);

  const closeSetAsSuccess = useCallback(() => {
    setSetAsSuccessVisible(false);
  }, []);

  const deleteCurrentSong = useCallback(async () => {
    if (!currentSong) return;
    const deleted = await deleteAudioFile(currentSong.id);
    if (!deleted) return;
    closeTrackMenu();
    const nextQueue = currentQueue.filter(song => song.id !== currentSong.id);
    if (nextQueue.length) {
      void playSong(nextQueue, Math.min(currentIndex, nextQueue.length - 1));
      return;
    }
    onBack();
  }, [closeTrackMenu, currentIndex, currentQueue, currentSong, onBack, playSong]);

  const lockScreenLocale = useMemo(() => {
    const locales: Record<string, string> = {
      es: 'es-ES',
      en: 'en-US',
      pt: 'pt-BR',
      fr: 'fr-FR',
      it: 'it-IT',
    };

    return locales[language.id] ?? 'en-US';
  }, [language.id]);

  const lockScreenDate = useMemo(
    () =>
      new Date().toLocaleDateString(lockScreenLocale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [lockScreenLocale],
  );
  const lockScreenTime = useMemo(
    () =>
      new Date().toLocaleTimeString(lockScreenLocale, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [lockScreenLocale],
  );

  // Stable handlers passed down to memoized children.
  const handleOpenMiniPlayer = useCallback(() => {
    setMiniPlayerClosing(false);
    setMiniPlayerMounted(true);
    setMiniPlayerVisible(true);
  }, []);
  const handleOpenLockScreen = useCallback(() => {
    setLockScreenClosing(false);
    setLockScreenMounted(true);
    setLockScreenVisible(true);
  }, []);
  const handleOpenTrackMenu = useCallback(() => {
    setTrackMenuClosing(false);
    setTrackMenuMounted(true);
    setTrackMenuVisible(true);
  }, []);
  const handleOpenDefineAs = useCallback(() => {
    setDefineAsClosing(false);
    setDefineAsMounted(true);
    setTrackMenuVisible(false);
    setDefineAsVisible(true);
  }, []);
  const handleOpenQueue = useCallback(() => setQueueVisible(true), []);
  const handleOpenLyrics = useCallback(() => setLyricsVisible(true), []);
  const handleToggleShuffle = useCallback(
    () => setShuffleEnabled(!shuffleEnabled),
    [shuffleEnabled, setShuffleEnabled],
  );
  const handlePrevious = useCallback(() => { void playPrevious(); }, [playPrevious]);
  const handlePlayPause = useCallback(() => { void togglePlayPause(); }, [togglePlayPause]);
  const handleNext = useCallback(() => { void playNext(); }, [playNext]);
  const handleCycleRepeat = useCallback(() => { cyclePlaybackMode(); }, [cyclePlaybackMode]);
  const handleToggleFavorite = useCallback(() => {
    if (currentSong) void toggleFavoriteSong(currentSong.id);
  }, [currentSong, toggleFavoriteSong]);

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
            {t('player_no_song_selected', 'No song selected.')}
          </Text>
          <Pressable
            className="rounded-full px-6 py-3"
            style={{ backgroundColor: theme.surface }}
            onPress={onBack}
          >
            <Text className="font-bold" style={{ color: theme.text }}>{t('player_back', 'Back')}</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

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
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(gradientColors[0], 0.78), withAlpha(gradientColors[1], 0.5), gradientColors[2]]}
          locations={[0, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <PlayerHeader
          onBack={onBack}
          onOpenMiniPlayer={handleOpenMiniPlayer}
          onOpenLockScreen={handleOpenLockScreen}
          onOpenTrackMenu={handleOpenTrackMenu}
        />

        <View className="flex-1 justify-between pt-16 pb-32">
          <CoverArt artwork={currentSong.artwork} />

          <View>
            <SongInfo
              title={currentSong.title}
              artist={normalizeValue(currentSong.artist, UNKNOWN_ARTIST)}
              isFavorite={isCurrentSongFavorite}
              onOpenQueue={handleOpenQueue}
              onToggleFavorite={handleToggleFavorite}
            />

            <PlaybackProgressBar
              seekTo={seekTo}
              barClassName="relative h-2 justify-center rounded-full"
              thumbClassName="absolute h-4 w-4 rounded-full bg-white"
            />
          </View>

          <PlaybackControls
            playing={playing}
            shuffleEnabled={shuffleEnabled}
            repeatActive={repeatActive}
            shuffleColor={adaptiveControlColors.iconColor}
            inactiveColor={adaptiveControlColors.inactiveColor}
            repeatIcon={RepeatModeIcon}
            onToggleShuffle={handleToggleShuffle}
            onPrevious={handlePrevious}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onCycleRepeat={handleCycleRepeat}
            onOpenLyrics={handleOpenLyrics}
          />
        </View>

        {queueVisible ? (
          <QueuePlaylistModal
            visible={queueVisible && parentAnimationDone}
            queue={currentQueue}
            currentIndex={currentIndex}
            onClose={() => setQueueVisible(false)}
            onSelectSong={index => {
              setQueueVisible(false);
              void playSong(currentQueue, index);
            }}
          />
        ) : null}

        {trackMenuMounted ? (
          <AppModal
            transparent
            visible={(trackMenuVisible || trackMenuClosing) && parentAnimationDone}
            animationType="fade"
            onRequestClose={requestCloseTrackMenu}
            onModalHide={() => {
              setTrackMenuMounted(false);
              setTrackMenuClosing(false);
            }}
          >
            <View className="flex-1 justify-end">
              <Pressable className="absolute inset-0 bg-black/70" onPress={requestCloseTrackMenu} />
              <View
                className="rounded-t-[32px] px-6 pb-8 pt-6"
                style={{ backgroundColor: theme.surface }}
              >
                {[
                  [t('track_action_delete', 'Delete'), () => { requestCloseTrackMenu(); setDeleteConfirmVisible(true); }],
                  [t('track_action_share', 'Share'), () => { requestCloseTrackMenu(); void shareAudioFile(currentSong.id); }],
                  [t('track_action_details', 'Track details'), () => { requestCloseTrackMenu(); setDetailsVisible(true); }],
                  [t('player_equalizer', 'Equalizer'), () => { void openEqualizer(); }],
                  [t('track_action_album', 'Album'), () => openRelatedSongs("album")],
                  [t('track_action_artist', 'Artist'), () => openRelatedSongs("artist")],
                  [t('track_action_define_as', 'Set as'), handleOpenDefineAs],
                  [t('settings', 'Settings'), () => { requestCloseTrackMenu(); setSettingsVisible(true); }],
                ].map(([label, onPress]) => (
                  <Pressable key={label as string} className="border-b border-white/5 px-2 py-4" onPress={onPress as () => void}>
                    <Text className="text-base font-bold" style={{ color: theme.text }}>{label as string}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </AppModal>
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

        <SetAsSuccessModal
          visible={setAsSuccessVisible}
          song={currentSong}
          tone={setAsSuccessTone}
          onClose={closeSetAsSuccess}
        />

        {defineAsMounted ? (
          <AppModal
            transparent
            visible={defineAsVisible && parentAnimationDone}
            animationType="fade"
            onRequestClose={requestCloseDefineAs}
            onModalHide={() => {
              setDefineAsMounted(false);
              setDefineAsClosing(false);
            }}
          >
            <View className="flex-1 justify-end">
              <Pressable className="absolute inset-0 bg-black/70" onPress={requestCloseDefineAs} />
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
                      {t('player_define_as_title', 'Set as')}
                    </Text>
                    <Text className="mt-1 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
                      {currentSong.title}
                    </Text>
                  </View>
                  <Pressable
                    className="rounded-full px-3 py-2"
                    onPress={requestCloseDefineAs}
                  >
                    <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                      {t('close', 'Close')}
                    </Text>
                  </Pressable>
                </View>

                <View className="mb-4 flex-row items-center rounded-[24px] px-3 py-3">
                  {currentSong.artwork ? (
                    <Image
                      source={{ uri: currentSong.artwork }}
                      className="mr-3 h-12 w-12 rounded-xl"
                      resizeMode="cover"
                      fadeDuration={0}
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
                    { label: t('tone_option_ringtone', 'Device tone'), value: 'ringtone' as ToneType, description: t('tone_option_ringtone_desc', 'Use as ringtone') },
                    { label: t('tone_option_alarm', 'Alarm tone'), value: 'alarm' as ToneType, description: t('tone_option_alarm_desc', 'Use as alarm') },
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
          </AppModal>
        ) : null}

        {miniPlayerMounted ? (
          <AppModal
            transparent
            visible={miniPlayerVisible && parentAnimationDone}
            animationType="fade"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={requestCloseMiniPlayer}
            onModalHide={() => {
              setMiniPlayerMounted(false);
              setMiniPlayerClosing(false);
            }}
          >
            <View className="flex-1 items-center justify-center px-6">
              <BlurView
                pointerEvents="none"
                intensity={90}
                tint="dark"
                style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
              />
              <LinearGradient
                pointerEvents="none"
                colors={[
                  withAlpha(gradientColors[0], 0.86),
                  withAlpha(gradientColors[1], 0.90),
                  withAlpha(gradientColors[2], 0.94),
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
              />
              {/*
                The backdrop is the FIRST child so it covers the full screen
                underneath the centered card. Wrapping the card content in a
                sibling <View> (instead of mixing absolute and centered children
                on the same parent) guarantees the Pressable receives taps
                anywhere outside the card on Android. We also stop propagation
                on the card container so a tap on the card never bubbles up to
                the backdrop.
              */}
              <Pressable
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}
                onPress={requestCloseMiniPlayer}
                android_disableSound
              />
              <Pressable
                onPress={() => { /* swallow taps on the card */ }}
                style={{ width: '100%', maxWidth: 380 }}
              >
                <View
                  className="rounded-[36px] p-6"
                  style={{
                    // Liquid glass: deep base with a soft tint, double outer shadow
                    // for a "floating" curved pane. The border is split into two
                    // layers via shadows so the top edge catches light while the
                    // bottom edge falls into shadow.
                    backgroundColor: 'rgba(14,14,16,0.42)',
                    borderColor: 'rgba(255,255,255,0.14)',
                    borderWidth: 1,
                    shadowColor: '#000',
                    shadowOpacity: 0.55,
                    shadowOffset: { width: 0, height: 18 },
                    shadowRadius: 32,
                    elevation: 18,
                    overflow: 'visible',
                  }}
                >
                  {/* Clipped glass body — keeps the gradient/blur inside the rounded shape */}
                  <View
                    pointerEvents="none"
                    className="overflow-hidden rounded-[36px]"
                    style={StyleSheet.absoluteFill}
                  >
                    {/* Base blur: provides the frosted backdrop */}
                    <BlurView
                      pointerEvents="none"
                      intensity={110}
                      tint="dark"
                      style={StyleSheet.absoluteFill}
                    />

                    {/* Tinted refraction: dominant color seeping through the top,
                        fading to deep black at the bottom to suggest depth. */}
                    <LinearGradient
                      pointerEvents="none"
                      colors={[
                        withAlpha(dominantColor, 0.42),
                        withAlpha(dominantColor, 0.18),
                        'rgba(0,0,0,0.55)',
                      ]}
                      locations={[0, 0.45, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />

                    {/* Specular highlight: bright curved sheen across the top edge */}
                    <LinearGradient
                      pointerEvents="none"
                      colors={[
                        'rgba(255,255,255,0.28)',
                        'rgba(255,255,255,0.06)',
                        'rgba(255,255,255,0)',
                      ]}
                      locations={[0, 0.35, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '55%',
                      }}
                    />

                    {/* Inner highlight stroke: simulates a thin glass rim */}
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 1,
                        left: 1,
                        right: 1,
                        bottom: 1,
                        borderRadius: 35,
                      }}
                    />
                  </View>

                  {/* Content layer sits on top of the clipped glass body */}
                  <View style={{ position: 'relative' }}>
                  {/* Artwork: own inset glass tile with subtle highlight */}
                  <View
                    className="aspect-square w-full items-center justify-center overflow-hidden rounded-[26px]"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      shadowColor: '#000',
                      shadowOpacity: 0.45,
                      shadowOffset: { width: 0, height: 6 },
                      shadowRadius: 14,
                    }}
                  >
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                      }}
                    >
                      <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                    {currentSong.artwork ? (
                      <Image
                        source={{ uri: currentSong.artwork }}
                        className="h-full w-full"
                        resizeMode="cover"
                        fadeDuration={0}
                        progressiveRenderingEnabled
                      />
                    ) : (
                      <Image source={DEFAULT_MUSIC_ARTWORK} className="h-full w-full" resizeMode="cover" fadeDuration={0} />
                    )}
                  </View>

                  <View className="mt-5 flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <AutoScrollingText
                        className="text-base font-bold"
                        style={{ color: 'rgba(255,255,255,0.98)' }}
                      >
                        {currentSong.title}
                      </AutoScrollingText>
                      <AutoScrollingText
                        className="mt-1 text-xs"
                        style={{ color: 'rgba(255,255,255,0.62)' }}
                      >
                        {normalizeValue(currentSong.artist, UNKNOWN_ARTIST)}
                      </AutoScrollingText>
                    </View>
                    <Pressable
                      onPress={handleToggleFavorite}
                      hitSlop={10}
                      style={({ pressed }) => [
                        {
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255,255,255,0.10)',
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.18)',
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      {isCurrentSongFavorite ? (
                        <FavoritedIcon size={20} color="#f5f5f5" />
                      ) : (
                        <UnfavoritedIcon size={20} color="#f5f5f5" />
                      )}
                    </Pressable>
                  </View>

                  <PlaybackProgressBar
                    seekTo={seekTo}
                    containerClassName="mt-5"
                    trackBackgroundColor="rgba(255,255,255,0.18)"
                    barClassName="relative h-2 justify-center rounded-full bg-white/15"
                    thumbClassName="absolute h-3.5 w-3.5 rounded-full bg-white"
                    thumbOffset={-7}
                  />

                  <View className="mt-6 flex-row items-center justify-center gap-7">
                    <Pressable
                      onPress={handlePrevious}
                      hitSlop={10}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.65 : 1,
                      })}
                    >
                      <BackwardIcon size={30} color="#f5f5f5" />
                    </Pressable>
                    <Pressable
                      onPress={handlePlayPause}
                      hitSlop={10}
                      style={({ pressed }) => ({
                        width: 68,
                        height: 68,
                        borderRadius: 34,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.16)',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.32)',
                        shadowColor: '#000',
                        shadowOpacity: 0.45,
                        shadowOffset: { width: 0, height: 6 },
                        shadowRadius: 14,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      })}
                    >
                      <Ionicons name={playing ? "pause" : "play"} size={36} color="#ffffff" />
                    </Pressable>
                    <Pressable
                      onPress={handleNext}
                      hitSlop={10}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.65 : 1,
                      })}
                    >
                      <ForwardIcon size={30} color="#f5f5f5" />
                    </Pressable>
                  </View>

                  <VolumeSlider setVolume={setVolume} />
                  </View>
                </View>
              </Pressable>
            </View>
          </AppModal>
        ) : null}

        {lockScreenMounted ? (
          <AppModal
            transparent
            visible={lockScreenVisible && parentAnimationDone}
            animationType="fade"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={requestCloseLockScreen}
            onModalHide={() => {
              setLockScreenMounted(false);
              setLockScreenClosing(false);
            }}
          >
            <View className="flex-1 px-6 pt-20">
              <LinearGradient
                pointerEvents="none"
                colors={[gradientColors[0], gradientColors[1], gradientColors[2]]}
                locations={[0, 0.5, 1]}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />

              {/*
                Transparent full-screen backdrop to dismiss the lock screen on
                tap. Sits behind the clock / artwork / controls because it is
                declared first in the parent <View flex-1>. The inner content
                uses pointerEvents="box-none" so any tap that does NOT hit a
                child control bubbles down to this Pressable.
              */}
              <Pressable
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                onPress={requestCloseLockScreen}
                android_disableSound
              />

              <View pointerEvents="box-none" className="flex-1">
                <View className="items-center">
                  <Text
                    className="text-3xl capitalize text-white/70"
                    style={{ fontFamily: LOCK_DATE_FONT }}
                  >
                    {lockScreenDate}
                  </Text>
                  <Text className="mt-1 text-6xl font-black tracking-[-2px] text-white">
                    {lockScreenTime}
                  </Text>
                </View>

                <View className="mt-10 aspect-square w-full items-center justify-center overflow-hidden rounded-[14px] bg-[#2a2a2a]">
                  {currentSong.artwork ? (
                    <Image
                      source={{ uri: currentSong.artwork }}
                      className="h-full w-full"
                      resizeMode="cover"
                      fadeDuration={0}
                      progressiveRenderingEnabled
                    />
                  ) : (
                    <Image source={DEFAULT_MUSIC_ARTWORK} className="h-full w-full" resizeMode="cover" fadeDuration={0} />
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
                      <Pressable onPress={handleToggleFavorite}>
                        {isCurrentSongFavorite ? (
                          <FavoritedIcon size={24} color="#f5f5f5" />
                        ) : (
                          <UnfavoritedIcon size={24} color="#f5f5f5" />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  <PlaybackProgressBar
                    seekTo={seekTo}
                    containerClassName="mt-5"
                    trackBackgroundColor="rgba(255,255,255,0.25)"
                    barClassName="relative h-2 justify-center rounded-full bg-white/25"
                    thumbClassName="absolute h-4 w-4 rounded-full bg-white"
                  />

                  <View className="mt-5 flex-row items-center justify-center gap-9">
                    
                    <Pressable onPress={handlePrevious}>
                      <BackwardIcon size={30} color="#f5f5f5" />
                    </Pressable>
                    <Pressable onPress={handlePlayPause}>
                      <Ionicons name={playing ? "pause" : "play"} size={44} color="#f5f5f5" />
                    </Pressable>
                    <Pressable onPress={handleNext}>
                      <ForwardIcon size={30} color="#f5f5f5" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </AppModal>
        ) : null}

        {equalizerMounted ? (
          <AppModal
            transparent
            visible={(equalizerVisible || equalizerClosing) && parentAnimationDone}
            animationType="fade"
            onRequestClose={requestCloseEqualizer}
            onModalHide={() => {
              setEqualizerMounted(false);
              setEqualizerClosing(false);
            }}
          >
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
                    {t('player_equalizer', 'Equalizer')}
                  </Text>
                  <Pressable
                    className="rounded-full px-3 py-2"
                    onPress={() => setEqualizerVisible(false)}
                  >
                    <Text className="text-base font-semibold" style={{ color: theme.text }}>
                      {t('close', 'Close')}
                    </Text>
                  </Pressable>
                </View>

                <View className="mb-4 flex-row items-center justify-between rounded-full border px-3 py-2" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                  <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                    {t('player_equalizer_enabled', 'Enabled')}
                  </Text>
                  <Pressable
                    onPress={() => { void toggleEqualizer(); }}
                    className="h-8 w-14 items-center justify-center rounded-full px-1"
                    style={{ backgroundColor: theme.background }}
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
                  {Object.keys(EQUALIZER_PRESETS).map(presetName => (
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
                        {equalizerPresetLabels[presetName] ?? presetName}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {equalizerLoading ? (
                  <Text className="py-6 text-center text-sm" style={{ color: theme.mutedText }}>
                    {t('player_equalizer_loading', 'Loading equalizer…')}
                  </Text>
                ) : equalizerBands.length ? (
                  <View className="flex-row items-end justify-between gap-1.5">
                    {equalizerBands.map(band => (
                      <EqualizerBandControl
                        key={band.index}
                        band={band}
                        activeColor={theme.accent}
                        onChange={handleEqualizerBandChange}
                      />
                    ))}
                  </View>
                ) : (
                  <Text className="py-6 text-center text-sm" style={{ color: theme.mutedText }}>
                    {t('player_equalizer_no_bands', 'No bands available for this audio.')}
                  </Text>
                )}
              </View>
            </View>
          </AppModal>
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
