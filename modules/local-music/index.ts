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

const LocalMusic = requireNativeModule('LocalMusic');

export async function getAudioFiles(): Promise<Song[]> {
  return await LocalMusic.getAudioFiles();
}