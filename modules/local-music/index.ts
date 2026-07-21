import { requireNativeModule } from 'expo-modules-core';

export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
};

const LocalMusic = requireNativeModule('LocalMusic');

export async function getAudioFiles(): Promise {
  return await LocalMusic.getAudioFiles();
}