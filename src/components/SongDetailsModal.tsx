import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';
import { formatDuration } from '../utils/time';
import LibraryArtwork from './LibraryArtwork';

const UNKNOWN_ALBUM = 'Álbum Desconocido';
const UNKNOWN_ARTIST = 'Artista Desconocido';

interface SongDetailsModalProps {
  song: Song | null;
  onClose: () => void;
}

const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const cleanValue = value?.trim();

  return cleanValue || fallback;
};

const SongDetailsModal = ({ song, onClose }: SongDetailsModalProps) => (
  <Modal transparent visible={Boolean(song)} animationType="slide" onRequestClose={onClose}>
    <View className="flex-1 justify-end">
      <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
      {song ? (
        <View className="rounded-t-[32px] bg-[#252525] px-6 pb-8 pt-6">
          <View className="mb-5 items-center">
            <LibraryArtwork
              artwork={song.artwork}
              className="h-40 w-40 rounded-3xl"
              fallbackTextClassName="text-6xl font-bold text-[#b64400]"
            />
          </View>
          <Text className="text-center text-2xl font-bold text-white" numberOfLines={2}>
            {song.title}
          </Text>
          <Text className="mt-2 text-center text-base text-[#b64400]" numberOfLines={1}>
            {normalizeValue(song.artist, UNKNOWN_ARTIST)}
          </Text>
          <View className="mt-6 gap-3">
            <Text className="text-sm text-[#bdbdbd]">Álbum: {normalizeValue(song.album, UNKNOWN_ALBUM)}</Text>
            <Text className="text-sm text-[#bdbdbd]">Duración: {formatDuration(song.duration)}</Text>
            <Text className="text-sm text-[#bdbdbd]">Fecha añadida: {song.dateAdded ?? 'No disponible'}</Text>
            <Text className="text-sm text-[#bdbdbd]">Fecha modificada: {song.dateModified ?? 'No disponible'}</Text>
            <Text className="text-sm text-[#bdbdbd]" numberOfLines={2}>Ruta: {song.url}</Text>
          </View>
        </View>
      ) : null}
    </View>
  </Modal>
);

export default SongDetailsModal;