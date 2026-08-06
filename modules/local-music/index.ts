import { requireNativeModule } from 'expo-modules-core';

export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
  dateAdded?: number;
  dateModified?: number;
  artwork?: string | null;
};

export type ToneType = 'ringtone' | 'contact' | 'alarm';

export type MusicNotificationAction = 'previous' | 'next' | 'toggle';

export type MusicNotificationState = {
  title: string;
  artist: string;
  artworkUri?: string | null;
  playing: boolean;
  positionMs: number;
  durationMs: number;
};

const LocalMusic = requireNativeModule('LocalMusic');

export async function getAudioFiles(): Promise<Song[]> {
  return await LocalMusic.getAudioFiles();
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
  listener: (action: MusicNotificationAction) => void
): { remove: () => void } {
  const subscription = LocalMusic.addListener('onNotificationAction', (event: { action: MusicNotificationAction }) => {
    listener(event.action);
  });
  return {
    remove: () => {
      subscription?.remove?.();
    },
  };
}