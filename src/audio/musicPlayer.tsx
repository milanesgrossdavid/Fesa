import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createAudioPlayer,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import type { Song } from '../../modules/local-music';
import {
  getAppSettingsSnapshot,
  hydrateAppSettings,
  registerSleepTimerListener,
  subscribeAppSettings,
} from '../settings/appSettings';

type PatchedAudioMetadata = {
  title?: string;
  artist?: string;
  albumTitle?: string;
  artworkUrl?: string;
  durationMs?: number;
};

type PatchedLockScreenOptions = {
  showSeekBackward?: boolean;
  showSeekForward?: boolean;
  isLiveStream?: boolean;
};

type PlaybackMode = 'linear' | 'repeat-all' | 'repeat-one';

type PatchedAudioPlayer = ReturnType<typeof createAudioPlayer> & {
  addListener?: (eventName: string, listener: (...args: any[]) => void) => { remove?: () => void };
  setActiveForLockScreen: (
    active: boolean,
    metadata?: PatchedAudioMetadata,
    options?: PatchedLockScreenOptions
  ) => void;
  setPlaybackRate?: (rate: number, pitchCorrectionQuality?: 'low' | 'medium' | 'high') => void;
  updateLockScreenMetadata: (metadata: PatchedAudioMetadata) => void;
  clearLockScreenControls?: () => void;
};

type MusicPlayerSnapshot = {
  queue: Song[];
  currentIndex: number;
  currentSong: Song | null;
  playing: boolean;
  currentTime: number;
  durationSeconds: number;
  volume: number;
  shuffleEnabled: boolean;
  playbackMode: PlaybackMode;
  favoriteSongIds: string[];
  selectionModeActive: boolean;
};

type PersistedPlaybackState = {
  queue: Song[];
  currentIndex: number;
};

const LAST_PLAYBACK_STORAGE_KEY = '@fesa:last-playback';
const MOST_PLAYED_SONGS_STORAGE_KEY = '@fesa:most-played-songs';
const FAVORITE_SONGS_STORAGE_KEY = '@fesa:favorite-songs';

const player = createAudioPlayer(null, {
  updateInterval: 500,
}) as PatchedAudioPlayer;

let initialized = false;
let hydratedLastSession = false;
let hydratedFavorites = false;
let sourceLoaded = false;
let queue: Song[] = [];
let currentIndex = -1;
let playing = false;
let currentTime = 0;
let durationSeconds = 0;
let volume = 1;
let shuffleEnabled = false;
let playbackMode: PlaybackMode = 'linear';
let favoriteSongIds: string[] = [];
let selectionModeActive = false;
let activeTransitionId = 0;
let proactivelySkippedTrackKey: string | null = null;
let cachedSnapshot: MusicPlayerSnapshot = {
  queue,
  currentIndex,
  currentSong: null,
  playing,
  currentTime,
  durationSeconds,
  volume,
  shuffleEnabled,
  playbackMode,
  favoriteSongIds,
  selectionModeActive,
};

const listeners = new Set<() => void>();
let settingsUnsubscribe: (() => void) | null = null;
let sleepTimerUnsubscribe: (() => void) | null = null;

const normalizeUri = (uri: string) => {
  if (!uri) {
    return uri;
  }

  if (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://')
  ) {
    return uri;
  }

  if (uri.startsWith('/')) {
    return `file://${uri}`;
  }

  return uri;
};

const getCurrentSong = () => {
  if (currentIndex < 0 || currentIndex >= queue.length) {
    return null;
  }

  return queue[currentIndex];
};

const updateSnapshot = () => {
  cachedSnapshot = {
    queue,
    currentIndex,
    currentSong: getCurrentSong(),
    playing,
    currentTime,
    durationSeconds,
    volume,
    shuffleEnabled,
    playbackMode,
    favoriteSongIds,
    selectionModeActive,
  };
};

const emit = () => {
  updateSnapshot();
  listeners.forEach(listener => listener());
};

const getSnapshot = (): MusicPlayerSnapshot => cachedSnapshot;

const buildLockScreenArtworkUrl = (artwork?: string | null) => {
  if (!artwork) {
    return undefined;
  }

  const normalizedArtwork = normalizeUri(artwork);

  if (
    normalizedArtwork.startsWith('http://') ||
    normalizedArtwork.startsWith('https://') ||
    normalizedArtwork.startsWith('file://')
  ) {
    return normalizedArtwork;
  }

  return undefined;
};

const buildMetadata = (song: Song): PatchedAudioMetadata => ({
  title: song.title,
  artist: song.artist || 'Artista Desconocido',
  albumTitle: song.album || 'Álbum Desconocido',
  artworkUrl: buildLockScreenArtworkUrl(song.artwork),
  durationMs: song.duration,
});

const wait = (milliseconds: number) => new Promise(resolve => {
  setTimeout(resolve, milliseconds);
});

const persistPlaybackState = async () => {
  if (!queue.length || currentIndex < 0 || currentIndex >= queue.length) {
    return;
  }

  const playbackState: PersistedPlaybackState = {
    queue,
    currentIndex,
  };

  try {
    await AsyncStorage.setItem(LAST_PLAYBACK_STORAGE_KEY, JSON.stringify(playbackState));
  } catch (error) {
    console.warn('No se pudo guardar la última canción:', error);
  }
};

const activateLockScreen = (song: Song) => {
  const metadata = buildMetadata(song);

  player.setActiveForLockScreen(
    true,
    metadata,
    {
      isLiveStream: false,
      showSeekBackward: false,
      showSeekForward: false,
    }
  );
  player.updateLockScreenMetadata(metadata);
};

const syncLockScreenState = (song?: Song | null) => {
  if (!getAppSettingsSnapshot().lockScreenControlsEnabled || !song) {
    player.clearLockScreenControls?.();
    return;
  }

  activateLockScreen(song);
};

const applyRuntimeSettings = () => {
  const settings = getAppSettingsSnapshot();

  if (player.setPlaybackRate) {
    player.setPlaybackRate(settings.playbackRate, 'medium');
  } else {
    try {
      player.playbackRate = settings.playbackRate;
    } catch (error) {
      console.warn('No se pudo aplicar la velocidad de reproducción:', error);
    }
  }

  player.shouldCorrectPitch = true;

  if (!settings.lockScreenControlsEnabled) {
    player.clearLockScreenControls?.();
  }
};

const prepareCurrentSong = () => {
  const song = getCurrentSong();

  if (!song) {
    return null;
  }

  player.replace({
    uri: normalizeUri(song.url),
    name: song.title,
  });
  applyRuntimeSettings();
  currentTime = 0;
  durationSeconds = song.duration ? song.duration / 1000 : 0;
  sourceLoaded = true;

  return song;
};

const trackSongPlayback = async (song: Song) => {
  try {
    const mostPlayedSongs = await AsyncStorage.getItem(MOST_PLAYED_SONGS_STORAGE_KEY);
    const parsedMostPlayedSongs = mostPlayedSongs ? JSON.parse(mostPlayedSongs) : {};

    const currentCount = parsedMostPlayedSongs[song.id] || 0;
    parsedMostPlayedSongs[song.id] = currentCount + 1;

    await AsyncStorage.setItem(MOST_PLAYED_SONGS_STORAGE_KEY, JSON.stringify(parsedMostPlayedSongs));
  } catch (error) {
    console.warn('No se pudo rastrear la reproduccion de la cancion:', error);
  }
};

const fadePlayerVolume = async (from: number, to: number, durationMs: number, transitionId: number) => {
  if (durationMs <= 0) {
    player.volume = to;
    return;
  }

  const steps = Math.max(Math.floor(durationMs / 45), 1);
  const delay = durationMs / steps;

  player.volume = from;

  for (let step = 1; step <= steps; step += 1) {
    await wait(delay);

    if (transitionId !== activeTransitionId) {
      return;
    }

    player.volume = from + ((to - from) * step) / steps;
  }
};

const loadAndPlay = async (index: number, withTransition = false) => {
  if (!queue.length || index < 0 || index >= queue.length) {
    return;
  }

  const transitionId = ++activeTransitionId;
  const shouldUseTransition = withTransition && getAppSettingsSnapshot().crossfadeEnabled && sourceLoaded;

  if (shouldUseTransition) {
    await fadePlayerVolume(player.volume || 1, 0, 220, transitionId);
  }

  currentIndex = index;
  proactivelySkippedTrackKey = null;
  const song = prepareCurrentSong();

  if (!song) {
    return;
  }

  syncLockScreenState(song);
  player.volume = shouldUseTransition ? 0 : volume;
  player.play();
  void trackSongPlayback(song);
  applyRuntimeSettings();

  playing = true;
  void persistPlaybackState();
  emit();

  if (shouldUseTransition) {
    await fadePlayerVolume(0, volume, 260, transitionId);
  }
};

const getRandomQueueIndex = () => {
  if (queue.length <= 1) {
    return currentIndex;
  }

  let nextIndex = currentIndex;

  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * queue.length);
  }

  return nextIndex;
};

const playNext = async () => {
  if (!queue.length) {
    return;
  }

  if (playbackMode === 'repeat-one') {
    await loadAndPlay(currentIndex, true);
    return;
  }

  const nextIndex = shuffleEnabled
    ? getRandomQueueIndex()
    : currentIndex + 1;

  if (nextIndex >= queue.length) {
    if (playbackMode !== 'repeat-all') {
      pause();
      return;
    }

    await loadAndPlay(0, true);
    return;
  }

  await loadAndPlay(nextIndex, true);
};

const playPrevious = async () => {
  if (!queue.length) {
    return;
  }

  if (playbackMode === 'repeat-one') {
    await loadAndPlay(currentIndex, true);
    return;
  }

  const previousIndex = shuffleEnabled
    ? getRandomQueueIndex()
    : currentIndex - 1;

  if (previousIndex < 0) {
    await loadAndPlay(playbackMode === 'repeat-all' ? queue.length - 1 : 0, true);
    return;
  }

  await loadAndPlay(previousIndex, true);
};

const ensureInitialized = async () => {
  if (initialized) {
    return;
  }

  initialized = true;
  await hydrateAppSettings();
  applyRuntimeSettings();

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });

  if (Platform.OS === 'android') {
    try {
      await requestNotificationPermissionsAsync();
    } catch {
      // En Android < 13 puede no hacer falta pedir permiso de notificaciones.
    }
  }

  player.addListener?.('remoteNext', () => {
    void playNext();
  });

  player.addListener?.('remotePrevious', () => {
    void playPrevious();
  });

  player.addListener?.('remotePlay', () => {
    if (!playing) {
      void togglePlayPause();
    }
  });

  player.addListener?.('remotePause', () => {
    if (playing) {
      void togglePlayPause();
    }
  });

  player.addListener?.('remoteTogglePlayPause', () => {
    void togglePlayPause();
  });

  player.addListener?.('remoteShuffle', () => {
    setShuffleEnabled(!shuffleEnabled);
  });

  player.addListener?.('remoteRepeat', () => {
    cyclePlaybackMode();
  });

  player.addListener?.('playbackStatusUpdate', status => {
    const nextPlaying = Boolean(status?.playing);
    const currentSong = getCurrentSong();
    const nextCurrentTime = Number.isFinite(status?.currentTime)
      ? Math.max(status.currentTime, 0)
      : currentTime;
    const nextDurationSeconds = status?.duration > 0
      ? status.duration
      : currentSong?.duration
        ? currentSong.duration / 1000
        : durationSeconds;
    const progressChanged =
      Math.abs(nextCurrentTime - currentTime) >= 0.2 ||
      Math.abs(nextDurationSeconds - durationSeconds) >= 0.2;
    const currentTrackKey = currentSong ? `${currentSong.id}:${currentIndex}` : null;

    currentTime = nextCurrentTime;
    durationSeconds = nextDurationSeconds;

    if (
      currentTrackKey &&
      getAppSettingsSnapshot().skipSilenceBetweenTracks &&
      status?.playing &&
      status.duration > 0 &&
      status.duration - status.currentTime <= 0.12 &&
      proactivelySkippedTrackKey !== currentTrackKey
    ) {
      proactivelySkippedTrackKey = currentTrackKey;
      void playNext();
      return;
    }

    if (status?.didJustFinish) {
      proactivelySkippedTrackKey = null;
      void playNext();
      return;
    }

    if (playing !== nextPlaying || progressChanged) {
      playing = nextPlaying;
      emit();
    }
  });

  if (!settingsUnsubscribe) {
    settingsUnsubscribe = subscribeAppSettings(() => {
      applyRuntimeSettings();
      syncLockScreenState(getCurrentSong());
      emit();
    });
  }

  if (!sleepTimerUnsubscribe) {
    sleepTimerUnsubscribe = registerSleepTimerListener(() => {
      pause();
    });
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const hydrateFavorites = async () => {
  if (hydratedFavorites) {
    return;
  }

  hydratedFavorites = true;

  try {
    const storedFavorites = await AsyncStorage.getItem(FAVORITE_SONGS_STORAGE_KEY);
    const parsedFavorites = storedFavorites ? JSON.parse(storedFavorites) : [];

    if (Array.isArray(parsedFavorites)) {
      favoriteSongIds = parsedFavorites.filter(id => typeof id === 'string');
      emit();
    }
  } catch (error) {
    console.warn('No se pudieron cargar los favoritos:', error);
  }
};

const persistFavorites = async () => {
  try {
    await AsyncStorage.setItem(FAVORITE_SONGS_STORAGE_KEY, JSON.stringify(favoriteSongIds));
  } catch (error) {
    console.warn('No se pudieron guardar los favoritos:', error);
  }
};

const isFavoriteSong = (songId: string) => favoriteSongIds.includes(songId);

const toggleFavoriteSong = async (songId: string) => {
  await hydrateFavorites();

  favoriteSongIds = isFavoriteSong(songId)
    ? favoriteSongIds.filter(id => id !== songId)
    : [songId, ...favoriteSongIds];

  emit();
  await persistFavorites();
};

const restoreLastSession = async () => {
  if (hydratedLastSession || queue.length) {
    return;
  }

  hydratedLastSession = true;

  try {
    const storedPlaybackState = await AsyncStorage.getItem(LAST_PLAYBACK_STORAGE_KEY);

    if (!storedPlaybackState) {
      return;
    }

    const parsedPlaybackState = JSON.parse(storedPlaybackState) as PersistedPlaybackState;

    if (!Array.isArray(parsedPlaybackState.queue) || !parsedPlaybackState.queue.length) {
      return;
    }

    if (parsedPlaybackState.currentIndex < 0 || parsedPlaybackState.currentIndex >= parsedPlaybackState.queue.length) {
      return;
    }

    queue = parsedPlaybackState.queue;
    currentIndex = parsedPlaybackState.currentIndex;
    playing = false;
    sourceLoaded = false;
    emit();
  } catch (error) {
    console.warn('No se pudo restaurar la última canción:', error);
  }
};

const playSong = async (songs: Song[], index: number) => {
  await ensureInitialized();

  queue = songs;
  await loadAndPlay(index);
};

const togglePlayPause = async () => {
  await ensureInitialized();

  if (!getCurrentSong()) {
    return;
  }

  if (playing) {
    player.pause();
    playing = false;
  } else {
    const song = sourceLoaded ? getCurrentSong() : prepareCurrentSong();

    if (!song) {
      return;
    }

    applyRuntimeSettings();
    syncLockScreenState(song);
    player.volume = volume;
    player.play();
    playing = true;
    void persistPlaybackState();
  }

  emit();
};

const pause = () => {
  player.pause();
  playing = false;
  emit();
};

const seekTo = (seconds: number) => {
  const nextTime = Math.max(0, Math.min(seconds, durationSeconds || seconds));
  player.seekTo(nextTime);
  currentTime = nextTime;
  emit();
};

const setVolume = (nextVolume: number) => {
  volume = Math.min(Math.max(nextVolume, 0), 1);
  player.volume = volume;
  emit();
};

const setShuffleEnabled = (enabled: boolean) => {
  shuffleEnabled = enabled;
  emit();
};

const setPlaybackMode = (mode: PlaybackMode) => {
  playbackMode = mode;
  player.loop = mode === 'repeat-one';
  emit();
};

const setSelectionModeActive = (active: boolean) => {
  if (selectionModeActive === active) {
    return;
  }

  selectionModeActive = active;
  emit();
};

const cyclePlaybackMode = () => {
  if (playbackMode === 'linear') {
    setPlaybackMode('repeat-all');
    return;
  }

  if (playbackMode === 'repeat-all') {
    setPlaybackMode('repeat-one');
    return;
  }

  setPlaybackMode('linear');
};

const getMostPlayedSongs = async (limit: number) => {
  try {
    const mostPlayedSongs = await AsyncStorage.getItem(MOST_PLAYED_SONGS_STORAGE_KEY);
    const parsedMostPlayedSongs = mostPlayedSongs ? JSON.parse(mostPlayedSongs) : {};

    const sortedSongs = Object.keys(parsedMostPlayedSongs)
      .sort((a, b) => parsedMostPlayedSongs[b] - parsedMostPlayedSongs[a])
      .slice(0, limit);

    return sortedSongs;
  } catch (error) {
    console.warn('No se pudieron obtener las canciones mas escuchadas:', error);
    return [];
  }
};

const getMostPlayedArtists = async (limit: number) => {
  try {
    const mostPlayedSongs = await AsyncStorage.getItem(MOST_PLAYED_SONGS_STORAGE_KEY);
    const parsedMostPlayedSongs = mostPlayedSongs ? JSON.parse(mostPlayedSongs) : {};

    const artistPlayCounts = queue.reduce((acc, song) => {
      if (parsedMostPlayedSongs[song.id]) {
        const artist = song.artist || 'Artista Desconocido';
        acc[artist] = (acc[artist] || 0) + parsedMostPlayedSongs[song.id];
      }
      return acc;
    }, {} as { [key: string]: number });

    const sortedArtists = Object.keys(artistPlayCounts)
      .sort((a, b) => artistPlayCounts[b] - artistPlayCounts[a])
      .slice(0, limit);

    return sortedArtists;
  } catch (error) {
    console.warn('No se pudieron obtener los artistas mas escuchados:', error);
    return [];
  }
};

export const musicPlayer = {
  subscribe,
  getSnapshot,
  playSong,
  playNext,
  playPrevious,
  togglePlayPause,
  pause,
  seekTo,
  setVolume,
  setShuffleEnabled,
  setPlaybackMode,
  setSelectionModeActive,
  cyclePlaybackMode,
  hydrateFavorites,
  isFavoriteSong,
  toggleFavoriteSong,
  restoreLastSession,
  getMostPlayedSongs,
  getMostPlayedArtists,
};

export const useMusicPlayer = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void hydrateFavorites();
    void restoreLastSession();
  }, []);

  return {
    ...snapshot,
    playSong,
    playNext,
    playPrevious,
    togglePlayPause,
    pause,
    seekTo,
    setVolume,
    setShuffleEnabled,
    setPlaybackMode,
    setSelectionModeActive,
    cyclePlaybackMode,
    hydrateFavorites,
    isFavoriteSong,
    toggleFavoriteSong,
    restoreLastSession,
  };
};
