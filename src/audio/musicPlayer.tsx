import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createAudioPlayer,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import type { Song } from '../../modules/local-music';
import {
  addNotificationActionListener,
  setEqualizerState,
  showMusicNotification,
  stopMusicNotification,
} from '../../modules/local-music';
import {
  getAppSettingsSnapshot,
  hydrateAppSettings,
  registerSleepTimerListener,
  subscribeAppSettings,
} from '../settings/appSettings';
import { getTranslation } from '../i18n/translations';

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
  listeningStatsVersion: number;
  selectionModeActive: boolean;
  showPlayerRequested: boolean;
};

type MusicPlayerUiSnapshot = Omit<MusicPlayerSnapshot, 'currentTime' | 'durationSeconds' | 'volume'>;

type PlaybackProgressSnapshot = Pick<MusicPlayerSnapshot, 'currentTime' | 'durationSeconds'>;

type PersistedPlaybackState = {
  queue: Song[];
  currentIndex: number;
  currentTime?: number;
};

const LAST_PLAYBACK_STORAGE_KEY = '@fesa:last-playback';
const MOST_PLAYED_SONGS_STORAGE_KEY = '@fesa:most-played-songs';
const FAVORITE_SONGS_STORAGE_KEY = '@fesa:favorite-songs';

let player = createAudioPlayer(null, {
  updateInterval: 1000,
}) as PatchedAudioPlayer;

let initialized = false;
let initializationPromise: Promise<void> | null = null;
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
let listeningStatsVersion = 0;
let selectionModeActive = false;
let showPlayerRequested = false;
let restoredPositionSeconds: number | null = null;
let proactivelySkippedTrackKey: string | null = null;
let playbackHistory: string[] = [];
let trackTransitionInFlight = false;
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
  listeningStatsVersion,
  selectionModeActive,
  showPlayerRequested: false,
};
let cachedUiSnapshot: MusicPlayerUiSnapshot = {
  queue,
  currentIndex,
  currentSong: null,
  playing,
  shuffleEnabled,
  playbackMode,
  favoriteSongIds,
  listeningStatsVersion,
  selectionModeActive,
  showPlayerRequested: false,
};
let cachedProgressSnapshot: PlaybackProgressSnapshot = {
  currentTime,
  durationSeconds,
};
let cachedVolume = volume;

const listeners = new Set<() => void>();
let settingsUnsubscribe: (() => void) | null = null;
let sleepTimerUnsubscribe: (() => void) | null = null;
let notificationActionUnsubscribe: (() => void) | null = null;

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
  const currentSong = getCurrentSong();
  cachedSnapshot = {
    queue,
    currentIndex,
    currentSong,
    playing,
    currentTime,
    durationSeconds,
    volume,
    shuffleEnabled,
    playbackMode,
    favoriteSongIds,
    listeningStatsVersion,
    selectionModeActive,
    showPlayerRequested,
  };

  if (
    cachedUiSnapshot.queue !== queue ||
    cachedUiSnapshot.currentIndex !== currentIndex ||
    cachedUiSnapshot.currentSong !== currentSong ||
    cachedUiSnapshot.playing !== playing ||
    cachedUiSnapshot.shuffleEnabled !== shuffleEnabled ||
    cachedUiSnapshot.playbackMode !== playbackMode ||
    cachedUiSnapshot.favoriteSongIds !== favoriteSongIds ||
    cachedUiSnapshot.listeningStatsVersion !== listeningStatsVersion ||
    cachedUiSnapshot.selectionModeActive !== selectionModeActive ||
    cachedUiSnapshot.showPlayerRequested !== showPlayerRequested
  ) {
    cachedUiSnapshot = {
      queue,
      currentIndex,
      currentSong,
      playing,
      shuffleEnabled,
      playbackMode,
      favoriteSongIds,
      listeningStatsVersion,
      selectionModeActive,
      showPlayerRequested,
    };
  }

  if (
    cachedProgressSnapshot.currentTime !== currentTime ||
    cachedProgressSnapshot.durationSeconds !== durationSeconds
  ) {
    cachedProgressSnapshot = { currentTime, durationSeconds };
  }
};

const emit = () => {
  updateSnapshot();
  listeners.forEach(listener => listener());
};

const getSnapshot = (): MusicPlayerSnapshot => cachedSnapshot;
const getUiSnapshot = (): MusicPlayerUiSnapshot => cachedUiSnapshot;
const getProgressSnapshot = (): PlaybackProgressSnapshot => cachedProgressSnapshot;
const getVolumeSnapshot = (): number => cachedVolume;

export const getAudioSessionId = () => {
  const candidate = (player as any)?.audioSessionId ?? (player as any)?.getAudioSessionId?.();

  if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
    return candidate;
  }

  return Platform.OS === 'android' ? 0 : null;
};

/**
 * Persist the latest equalizer band levels at module scope so we can
 * re-apply them automatically after each track change. expo-audio replaces
 * the underlying MediaPlayer on every `replace()`, which silently detaches
 * any previously attached audio effects; re-applying from module scope
 * keeps the EQ active across the whole session.
 */
export const setEqualizerLevels = (levels: number[]) => {
  equalizerBandLevels = levels;
  const sessionId = getAudioSessionId() ?? 0;
  if (sessionId >= 0) {
    void setEqualizerState(sessionId, equalizerEnabled, levels);
  }
};

export const setEqualizerEnabled = (enabled: boolean) => {
  equalizerEnabled = enabled;
  const sessionId = getAudioSessionId() ?? 0;
  if (sessionId >= 0) {
    void setEqualizerState(sessionId, enabled, equalizerBandLevels);
  }
};

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

const buildMetadata = (song: Song): PatchedAudioMetadata => {
  const { language } = getAppSettingsSnapshot();

  return {
    title: song.title,
    artist: song.artist || getTranslation(language.id as any, 'unknown_artist', 'Unknown Artist'),
    albumTitle: song.album || getTranslation(language.id as any, 'unknown_album', 'Unknown Album'),
    artworkUrl: buildLockScreenArtworkUrl(song.artwork),
    durationMs: song.duration,
  };
};

const publishAndroidNotification = (song: Song, positionSeconds: number, isPlaying: boolean) => {
  if (Platform.OS !== 'android' || !getAppSettingsSnapshot().lockScreenControlsEnabled) {
    return;
  }

  const { language } = getAppSettingsSnapshot();

  showMusicNotification({
    title: song.title,
    artist: song.artist || getTranslation(language.id as any, 'unknown_artist', 'Unknown Artist'),
    artworkUri: song.artwork ?? null,
    playing: isPlaying,
    positionMs: Math.floor(Math.max(0, positionSeconds) * 1000),
    durationMs: song.duration > 0 ? song.duration : Math.floor(durationSeconds * 1000),
  });
};

let lastPlaybackPersistMs = 0;
let playbackPersistRevision = 0;
let playbackPersistInFlight = false;
const persistPlaybackState = async (
  force = false,
  override?: { currentIndex: number; currentTime: number },
) => {
  const stateIndex = override?.currentIndex ?? currentIndex;
  if (!queue.length || stateIndex < 0 || stateIndex >= queue.length) {
    return;
  }

  const now = Date.now();
  if (!force && now - lastPlaybackPersistMs < 1000) {
    return;
  }
  lastPlaybackPersistMs = now;
  const persistRevision = ++playbackPersistRevision;

  const playbackState: PersistedPlaybackState = {
    queue,
    currentIndex: stateIndex,
    currentTime: override?.currentTime ?? currentTime,
  };

  // Single in-flight write per revision. Coalesce rapid calls into the
  // latest state — earlier revs bail out. Avoids unbounded promise-chain
  // growth on long playback sessions.
  if (playbackPersistInFlight) return;
  playbackPersistInFlight = true;
  try {
    await AsyncStorage.setItem(LAST_PLAYBACK_STORAGE_KEY, JSON.stringify(playbackState));
    if (persistRevision === playbackPersistRevision) return;
  } catch (error) {
    console.warn('No se pudo guardar la última canción:', error);
  } finally {
    playbackPersistInFlight = false;
  }
};

const activateLockScreen = (song: Song) => {
  if (Platform.OS === 'android') {
    // On Android we drive the notification/lock screen ourselves via
    // the local-music native module (RemoteViews). Make sure expo-audio's
    // MediaSession notification is off so the two don't compete.
    player.clearLockScreenControls?.();
    publishAndroidNotification(song, currentTime, playing);
    return;
  }

  const metadata = buildMetadata(song);
  // setActiveForLockScreen already receives the metadata; no need to call
  // updateLockScreenMetadata separately — that was duplicating the bridge roundtrip.
  player.setActiveForLockScreen(
    true,
    metadata,
    {
      isLiveStream: false,
      showSeekBackward: false,
      showSeekForward: false,
    }
  );
};

const syncLockScreenState = (song?: Song | null) => {
  if (!getAppSettingsSnapshot().lockScreenControlsEnabled || !song) {
    player.clearLockScreenControls?.();
    if (Platform.OS === 'android') {
      stopMusicNotification();
    }
    return;
  }

  activateLockScreen(song);
};

let lastNotificationUpdateMs = 0;
// Module-scope equalizer state so we can re-apply it after every track change
// or after the first playback (expo-audio resets the audio session on each
// replace / first play, which silently detaches audio effects).
let equalizerEnabled = true;
let equalizerBandLevels: number[] = [];
const updateAndroidNotification = (force = false) => {
  if (Platform.OS !== 'android') {
    return;
  }
  if (!getAppSettingsSnapshot().lockScreenControlsEnabled) {
    return;
  }
  const song = getCurrentSong();
  if (!song) {
    return;
  }
  const now = Date.now();
  if (!force && now - lastNotificationUpdateMs < 950) {
    return;
  }
  lastNotificationUpdateMs = now;
  publishAndroidNotification(song, currentTime, playing);
};

const applyRuntimeSettings = (targetPlayer: PatchedAudioPlayer = player) => {
  const settings = getAppSettingsSnapshot();

  if (targetPlayer.setPlaybackRate) {
    targetPlayer.setPlaybackRate(settings.playbackRate, 'medium');
  } else {
    try {
      targetPlayer.playbackRate = settings.playbackRate;
    } catch (error) {
      console.warn('No se pudo aplicar la velocidad de reproducción:', error);
    }
  }

  targetPlayer.shouldCorrectPitch = true;

  if (!settings.lockScreenControlsEnabled) {
    targetPlayer.clearLockScreenControls?.();
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
    listeningStatsVersion += 1;
    // Defer emit so it doesn't coincide with the transition animation frame.
    setImmediate(() => emit());
  } catch (error) {
    console.warn('No se pudo rastrear la reproduccion de la cancion:', error);
  }
};


const recordCurrentTrack = (nextSongId: string) => {
  const currentSong = getCurrentSong();

  if (!currentSong || currentSong.id === nextSongId) {
    return;
  }

  playbackHistory = [...playbackHistory.slice(-99), currentSong.id];
};

const loadAndPlay = async (index: number, recordHistory = true) => {
  if (!queue.length || index < 0 || index >= queue.length) {
    return;
  }

  const nextSong = queue[index];
  if (recordHistory) {
    recordCurrentTrack(nextSong.id);
  }

  currentIndex = index;
  proactivelySkippedTrackKey = null;
  const song = prepareCurrentSong();

  if (!song) {
    return;
  }

  const startPosition = restoredPositionSeconds;
  restoredPositionSeconds = null;
  if (startPosition !== null && startPosition > 0) {
    player.seekTo(startPosition);
    currentTime = startPosition;
  }

  player.volume = volume;
  player.play();
  playing = true;

  // Re-apply the equalizer immediately after a source change. expo-audio
  // replaces the underlying MediaPlayer/AudioTrack on every replace(), which
  // invalidates any attached audio effects; without re-applying, the EQ
  // silently stops working after the first track change.
  const sessionId = getAudioSessionId() ?? 0;
  if (equalizerBandLevels.length && sessionId >= 0) {
    void setEqualizerState(sessionId, equalizerEnabled, equalizerBandLevels);
  }

  // Fire-and-forget heavy side effects so the UI thread isn't blocked at
  // transition time (avoids the "stutter" between tracks).
  // 1) AsyncStorage write for most-played stats.
  setImmediate(() => {
    void trackSongPlayback(song);
  });
  // 2) Lock screen / notification refresh.
  setImmediate(() => {
    syncLockScreenState(song);
  });
  // 3) Persisted last-playback write.
  setImmediate(() => {
    void persistPlaybackState();
  });
  // applyRuntimeSettings() already ran inside prepareCurrentSong(); skip duplicate.

  // The first playbackStatusUpdate will emit() within ms — avoid double render.
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

const getNextTrackIndex = () => {
  if (playbackMode === 'repeat-one') {
    return currentIndex;
  }

  const nextIndex = shuffleEnabled
    ? getRandomQueueIndex()
    : currentIndex + 1;

  if (nextIndex >= queue.length) {
    return playbackMode === 'repeat-all' ? 0 : null;
  }

  return nextIndex;
};

const playNext = async (manual = true) => {
  if (!queue.length || trackTransitionInFlight) {
    return;
  }

  trackTransitionInFlight = true;

  try {
    const nextIndex = getNextTrackIndex();

    if (nextIndex === null) {
      pause();
      return;
    }

    await loadAndPlay(nextIndex);
  } finally {
    trackTransitionInFlight = false;
  }
};

const playPrevious = async () => {
  if (!queue.length) {
    return;
  }

  if (playbackMode === 'repeat-one') {
    await loadAndPlay(currentIndex);
    return;
  }

  if (shuffleEnabled && playbackHistory.length) {
    while (playbackHistory.length) {
      const previousId = playbackHistory.pop();
      const previousIndex = queue.findIndex(song => song.id === previousId);

      if (previousIndex >= 0) {
        await loadAndPlay(previousIndex, false);
        return;
      }
    }
  }

  const previousIndex = shuffleEnabled
    ? currentIndex
    : currentIndex - 1;

  if (previousIndex < 0) {
    await loadAndPlay(playbackMode === 'repeat-all' ? queue.length - 1 : 0);
    return;
  }

  await loadAndPlay(previousIndex);
};

const handlePlaybackStatus = (status: any, sourcePlayer: PatchedAudioPlayer) => {
  if (sourcePlayer !== player) {
    return;
  }

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
    Math.abs(nextCurrentTime - currentTime) >= 0.5 ||
    Math.abs(nextDurationSeconds - durationSeconds) >= 0.2;
  const currentTrackKey = currentSong ? `${currentSong.id}:${currentIndex}` : null;

  currentTime = nextCurrentTime;
  durationSeconds = nextDurationSeconds;

  if (progressChanged) {
    void persistPlaybackState();
  }

  if (
    currentTrackKey &&
    getAppSettingsSnapshot().skipSilenceBetweenTracks &&
    status?.playing &&
    status.duration > 0 &&
    status.duration - status.currentTime <= 0.12 &&
    proactivelySkippedTrackKey !== currentTrackKey
  ) {
    proactivelySkippedTrackKey = currentTrackKey;
    void playNext(false);
    return;
  }

  if (status?.didJustFinish) {
    proactivelySkippedTrackKey = null;
    void playNext(false);
    return;
  }

  const playingChanged = playing !== nextPlaying;
  if (playingChanged || progressChanged) {
    playing = nextPlaying;
    updateAndroidNotification(playingChanged);
    emit();
  } else {
    updateAndroidNotification();
  }
};

const wirePlaybackListeners = () => {
  player.addListener?.('playbackStatusUpdate', (status: any) => {
    handlePlaybackStatus(status, player);
  });
};

const ensureInitialized = async () => {
  if (initialized) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
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
        toggleShuffle();
      });

      player.addListener?.('remoteRepeat', () => {
        cyclePlaybackMode();
      });

      wirePlaybackListeners();

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

      if (Platform.OS === 'android' && !notificationActionUnsubscribe) {
        const subscription = addNotificationActionListener((action, positionMs) => {
          if (action === 'previous') {
            void playPrevious();
          } else if (action === 'next') {
            void playNext();
          } else if (action === 'toggle') {
            void togglePlayPause();
          } else if (action === 'rewind') {
            seekTo(currentTime - 10);
          } else if (action === 'forward') {
            seekTo(currentTime + 10);
          } else if (action === 'seek' && positionMs !== undefined) {
            seekTo(positionMs / 1000);
          }
        });
        notificationActionUnsubscribe = () => subscription.remove();
      }

      initialized = true;
    })().catch(error => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
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
    currentTime = Number.isFinite(parsedPlaybackState.currentTime)
      ? Math.max(parsedPlaybackState.currentTime ?? 0, 0)
      : 0;
    durationSeconds = queue[currentIndex]?.duration
      ? queue[currentIndex].duration / 1000
      : 0;
    restoredPositionSeconds = currentTime;
    emit();
  } catch (error) {
    console.warn('No se pudo restaurar la última canción:', error);
  }
};

const playSong = async (songs: Song[], index: number) => {
  await ensureInitialized();

  const selectedSong = songs[index];
  const currentSong = getCurrentSong();
  if (sourceLoaded && selectedSong?.id === currentSong?.id) {
    queue = songs;
    currentIndex = index;
    void persistPlaybackState(true);
    emit();
    return;
  }

  queue = songs;
  if (selectedSong?.id !== currentSong?.id || restoredPositionSeconds === null) {
    restoredPositionSeconds = null;
  }
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

    if (!sourceLoaded && restoredPositionSeconds !== null && restoredPositionSeconds > 0) {
      player.seekTo(restoredPositionSeconds);
      currentTime = restoredPositionSeconds;
      restoredPositionSeconds = null;
    }

    applyRuntimeSettings();
    syncLockScreenState(song);
    player.volume = volume;
    player.play();
    playing = true;
    void persistPlaybackState();

    // First-play path: the EQ must be re-attached after prepareCurrentSong
    // because expo-audio creates a new audio session the first time it plays.
    const sessionId = getAudioSessionId() ?? 0;
    if (equalizerBandLevels.length && sessionId >= 0) {
      void setEqualizerState(sessionId, equalizerEnabled, equalizerBandLevels);
    }
  }

  void persistPlaybackState(true);
  updateAndroidNotification(true);
  emit();
};

const pause = () => {
  player.pause();
  playing = false;
  void persistPlaybackState(true);
  updateAndroidNotification(true);
  emit();
};

const seekTo = (seconds: number) => {
  const nextTime = Math.max(0, Math.min(seconds, durationSeconds || seconds));
  player.seekTo(nextTime);
  currentTime = nextTime;
  void persistPlaybackState(true);
  updateAndroidNotification(true);
  emit();
};

const setVolume = (nextVolume: number) => {
  volume = Math.min(Math.max(nextVolume, 0), 1);
  cachedVolume = volume;
  player.volume = volume;
  emit();
};

const setShuffleEnabled = (enabled: boolean) => {
  if (shuffleEnabled === enabled) {
    return;
  }

  shuffleEnabled = enabled;
  emit();
};

const toggleShuffle = () => {
  setShuffleEnabled(!shuffleEnabled);
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

const requestShowPlayer = () => {
  if (showPlayerRequested) return;
  showPlayerRequested = true;
  emit();
};

const clearShowPlayerRequest = () => {
  if (!showPlayerRequested) return;
  showPlayerRequested = false;
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

const moveQueueSong = (fromIndex: number, toIndex: number) => {
  if (!queue.length) return;
  if (fromIndex < 0 || fromIndex >= queue.length) return;
  if (toIndex < 0 || toIndex >= queue.length) return;
  if (fromIndex === toIndex) return;

  const currentId = queue[currentIndex]?.id;
  const [moved] = queue.splice(fromIndex, 1);
  queue.splice(toIndex, 0, moved);

  let newIndex = currentIndex;
  if (currentId) {
    const idx = queue.findIndex(s => s.id === currentId);
    if (idx >= 0) newIndex = idx;
  }
  currentIndex = newIndex;

  void persistPlaybackState();
  emit();
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
  toggleShuffle,
  setPlaybackMode,
  setSelectionModeActive,
  cyclePlaybackMode,
  hydrateFavorites,
  isFavoriteSong,
  toggleFavoriteSong,
  restoreLastSession,
  getMostPlayedSongs,
  getMostPlayedArtists,
  moveQueueSong,
  requestShowPlayer,
  clearShowPlayerRequest,
  getAudioSessionId,
  setEqualizerLevels,
  setEqualizerEnabled,
};

export const useMusicPlayer = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void hydrateFavorites();
    void restoreLastSession();
  }, []);

  return useMemo(
    () => ({
      ...snapshot,
      playSong,
      playNext,
      playPrevious,
      togglePlayPause,
      pause,
      seekTo,
      setVolume,
      setShuffleEnabled,
      toggleShuffle,
      setPlaybackMode,
      setSelectionModeActive,
      cyclePlaybackMode,
      hydrateFavorites,
      isFavoriteSong,
      toggleFavoriteSong,
      restoreLastSession,
      moveQueueSong,
      requestShowPlayer,
      clearShowPlayerRequest,
    }),
    [snapshot]
  );
};

export const useMusicPlayerUi = () => {
  const snapshot = useSyncExternalStore(subscribe, getUiSnapshot, getUiSnapshot);

  useEffect(() => {
    void hydrateFavorites();
    void restoreLastSession();
  }, []);

  return useMemo(
    () => ({
      ...snapshot,
      playSong,
      playNext,
      playPrevious,
      togglePlayPause,
      pause,
      seekTo,
      setVolume,
      setShuffleEnabled,
      toggleShuffle,
      setPlaybackMode,
      setSelectionModeActive,
      cyclePlaybackMode,
      hydrateFavorites,
      isFavoriteSong,
      toggleFavoriteSong,
      restoreLastSession,
      moveQueueSong,
      requestShowPlayer,
      clearShowPlayerRequest,
    }),
    [snapshot]
  );
};

export const usePlaybackProgress = () =>
  useSyncExternalStore(subscribe, getProgressSnapshot, getProgressSnapshot);

export const usePlayerVolume = () =>
  useSyncExternalStore(subscribe, getVolumeSnapshot, getVolumeSnapshot);
