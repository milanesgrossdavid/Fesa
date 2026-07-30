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