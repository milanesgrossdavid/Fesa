import { EventEmitter, requireNativeModule } from 'expo-modules-core';
import { PermissionsAndroid, Platform } from 'react-native';
import type { Permission } from 'react-native/Libraries/PermissionsAndroid/PermissionsAndroid';
import { getAppSettingsSnapshot } from '../../src/settings/appSettings';

export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
  folder?: string | null;
  dateAdded?: number;
  dateModified?: number;
  artwork?: string | null;
};

export type ToneType = 'ringtone' | 'contact' | 'alarm';

export type MusicNotificationAction = 'previous' | 'next' | 'toggle' | 'seek' | 'rewind' | 'forward';

export type MusicNotificationState = {
  title: string;
  artist: string;
  artworkUri?: string | null;
  playing: boolean;
  positionMs: number;
  durationMs: number;
};

const LocalMusic = requireNativeModule('LocalMusic');
const localMusicEmitter = new EventEmitter(LocalMusic);

let audioFilesRequest: Promise<Song[]> | null = null;
let audioFilesRequestIncludeHidden = false;
let audioFilesLoadRequest: Promise<Song[]> | null = null;
let audioFilesCache: Song[] | null = null;
let audioFilesCacheTimestamp = 0;
let metadataWritePermissionStatus: 'unknown' | 'granted' | 'denied' = 'unknown';

const AUDIO_FILES_CACHE_TTL_MS = 30_000;

function invalidateAudioFilesCache() {
  audioFilesCache = null;
  audioFilesCacheTimestamp = 0;
  audioFilesRequest = null;
  audioFilesRequestIncludeHidden = false;
  audioFilesLoadRequest = null;
}

export async function getAudioFiles(includeHidden = false): Promise<Song[]> {
  if (!audioFilesCache || Date.now() - audioFilesCacheTimestamp > AUDIO_FILES_CACHE_TTL_MS) {
    if (!audioFilesLoadRequest) {
      audioFilesLoadRequest = (LocalMusic.getAudioFiles() as Promise<Song[]>)
        .then((result: Song[]) => {
          audioFilesCache = result as Song[];
          audioFilesCacheTimestamp = Date.now();
          return audioFilesCache;
        })
        .finally(() => {
          audioFilesLoadRequest = null;
        });
    }

    await audioFilesLoadRequest;
  }

  const songs = audioFilesCache as Song[];

  if (includeHidden) {
    return songs;
  }

  const hiddenSongIds = new Set(getAppSettingsSnapshot().hiddenSongIds ?? []);
  return songs.filter(song => !hiddenSongIds.has(song.id));
}

export async function getAudioFilesWithPermission(includeHidden = false): Promise<Song[]> {
  if (audioFilesRequest && audioFilesRequestIncludeHidden === includeHidden) {
    return audioFilesRequest;
  }

  audioFilesRequestIncludeHidden = includeHidden;
  audioFilesRequest = (async () => {
    try {
      let granted = false;

      if (Platform.OS === 'android') {
        const version = typeof Platform.Version === 'string'
          ? parseInt(Platform.Version, 10)
          : Platform.Version;

        const permission = version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

        const result = await PermissionsAndroid.request(permission);
        granted = result === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        granted = true;
      }

      if (granted) {
        return await getAudioFiles(includeHidden);
      }
      return [];
    } catch (error) {
      console.error('Error requesting permissions or fetching audio files:', error);
      return [];
    }
  })();

  try {
    return await audioFilesRequest;
  } finally {
    if (audioFilesRequestIncludeHidden === includeHidden) {
      audioFilesRequest = null;
    }
  }
}

export async function deleteAudioFile(songId: string): Promise<boolean> {
  const deleted = await LocalMusic.deleteAudioFile(songId);

  if (deleted) {
    invalidateAudioFilesCache();
  }

  return deleted;
}

export type EqualizerBandState = {
  index: number;
  frequency: number;
  level: number;
  minLevel: number;
  maxLevel: number;
};

export type EqualizerState = {
  enabled: boolean;
  bands: EqualizerBandState[];
};

export async function ensureAudioMetadataWritePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (metadataWritePermissionStatus === 'granted') {
    return true;
  }

  if (metadataWritePermissionStatus === 'denied') {
    return false;
  }

  const version = typeof Platform.Version === 'string'
    ? parseInt(Platform.Version, 10)
    : Platform.Version;

  const permissionsToRequest: Permission[] = [];

  if (version >= 33) {
    permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO);
  } else if (version >= 29) {
    permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
  } else {
    permissionsToRequest.push(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
  }

  if (!permissionsToRequest.length) {
    metadataWritePermissionStatus = 'granted';
    return true;
  }

  const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);
  const granted = permissionsToRequest.every((permission) => {
    const result = results[permission];
    return result === PermissionsAndroid.RESULTS.GRANTED;
  });

  metadataWritePermissionStatus = granted ? 'granted' : 'denied';
  return granted;
}

export async function updateAudioMetadata(_songId: string, _metadata: {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  artworkUri?: string | null;
}): Promise<boolean> {
  console.warn('Metadata editing is disabled because the Android media write path is unstable in this build.');
  return false;
}

export async function getEqualizerState(audioSessionId: number): Promise<EqualizerState | null> {
  return await LocalMusic.getEqualizerState(audioSessionId);
}

export async function setEqualizerState(
  audioSessionId: number,
  enabled: boolean,
  levels: number[]
): Promise<boolean> {
  return await LocalMusic.setEqualizerState(audioSessionId, enabled, levels);
}

export async function releaseEqualizer(audioSessionId: number): Promise<boolean> {
  return await LocalMusic.releaseEqualizer(audioSessionId);
}

export async function shareAudioFile(songId: string): Promise<void> {
  await LocalMusic.shareAudioFile(songId);
}

export async function setAudioAsTone(songId: string, type: ToneType): Promise<boolean> {
  return await LocalMusic.setAudioAsTone(songId, type);
}

export function showMusicNotification(state: MusicNotificationState): void {
  LocalMusic.showMusicNotification(
    state.title,
    state.artist,
    state.artworkUri ?? null,
    state.playing,
    Math.max(0, Math.floor(state.positionMs)),
    Math.max(0, Math.floor(state.durationMs))
  );
}

export function stopMusicNotification(): void {
  LocalMusic.stopMusicNotification();
}

export function addNotificationActionListener(
  listener: (action: MusicNotificationAction, positionMs?: number) => void
): { remove: () => void } {
  const subscription = (localMusicEmitter.addListener as any)('onNotificationAction', (event: {
    action: MusicNotificationAction;
    positionMs?: number;
  }) => {
    listener(event.action, event.positionMs);
  });
  return {
    remove: () => {
      subscription?.remove?.();
    },
  };
}
