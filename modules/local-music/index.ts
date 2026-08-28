import { EventEmitter, requireNativeModule } from 'expo-modules-core';
import { PermissionsAndroid, Platform } from 'react-native';

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

export async function getAudioFiles(): Promise<Song[]> {
  return await LocalMusic.getAudioFiles();
}

export async function getAudioFilesWithPermission(): Promise<Song[]> {
  if (audioFilesRequest) {
    return audioFilesRequest;
  }

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
      return await getAudioFiles();
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
    audioFilesRequest = null;
  }
}

export async function deleteAudioFile(songId: string): Promise<boolean> {
  return await LocalMusic.deleteAudioFile(songId);
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
