import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import {
  createAudioPlayer,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import type { Song } from '../../modules/local-music';

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
  showSkipPrevious?: boolean;
  showSkipNext?: boolean;
};

type PatchedAudioPlayer = ReturnType<typeof createAudioPlayer> & {
  addListener?: (eventName: string, listener: (...args: any[]) => void) => { remove?: () => void };
  setActiveForLockScreen: (
    active: boolean,
    metadata?: PatchedAudioMetadata,
    options?: PatchedLockScreenOptions
  ) => void;
  updateLockScreenMetadata: (metadata: PatchedAudioMetadata) => void;
};

type MusicPlayerSnapshot = {
  queue: Song[];
  currentIndex: number;
  currentSong: Song | null;
  playing: boolean;
};

const player = createAudioPlayer(null, {
  updateInterval: 500,
}) as PatchedAudioPlayer;

let initialized = false;
let queue: Song[] = [];
let currentIndex = -1;
let playing = false;
let cachedSnapshot: MusicPlayerSnapshot = {
  queue,
  currentIndex,
  currentSong: null,
  playing,
};

const listeners = new Set<() => void>();

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
  };
};

const emit = () => {
  updateSnapshot();
  listeners.forEach(listener => listener());
};

const getSnapshot = (): MusicPlayerSnapshot => cachedSnapshot;

const buildMetadata = (song: Song): PatchedAudioMetadata => ({
  title: song.title,
  artist: song.artist || 'Artista Desconocido',
  albumTitle: song.album || 'Álbum Desconocido',
  durationMs: song.duration,
});

const activateLockScreen = (song: Song) => {
  player.setActiveForLockScreen(
    true,
    buildMetadata(song),
    {
      isLiveStream: false,
      showSeekBackward: true,
      showSeekForward: true,
      showSkipPrevious: true,
      showSkipNext: true,
    }
  );
};

const loadAndPlay = async (index: number) => {
  if (!queue.length || index < 0 || index >= queue.length) {
    return;
  }

  currentIndex = index;
  const song = queue[currentIndex];

  player.replace({
    uri: normalizeUri(song.url),
    name: song.title,
  });

  activateLockScreen(song);
  player.play();

  playing = true;
  emit();
};

const playNext = async () => {
  if (!queue.length) {
    return;
  }

  const nextIndex = currentIndex >= queue.length - 1 ? 0 : currentIndex + 1;
  await loadAndPlay(nextIndex);
};

const playPrevious = async () => {
  if (!queue.length) {
    return;
  }

  const previousIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
  await loadAndPlay(previousIndex);
};

const ensureInitialized = async () => {
  if (initialized) {
    return;
  }

  initialized = true;

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

  player.addListener?.('playbackStatusUpdate', status => {
    const nextPlaying = Boolean(status?.playing);

    if (status?.didJustFinish) {
      void playNext();
      return;
    }

    if (playing !== nextPlaying) {
      playing = nextPlaying;
      emit();
    }
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
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
    activateLockScreen(getCurrentSong()!);
    player.play();
    playing = true;
  }

  emit();
};

const pause = () => {
  player.pause();
  playing = false;
  emit();
};

const seekTo = (seconds: number) => {
  player.seekTo(seconds);
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
};

export const useMusicPlayer = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    playSong,
    playNext,
    playPrevious,
    togglePlayPause,
    pause,
    seekTo,
  };
};