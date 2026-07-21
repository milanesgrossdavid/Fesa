import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useMusicPlayer } from '../audio/musicPlayer';
import { formatDuration } from '../utils/time';

interface PlayerScreenProps {
  onBack: () => void;
}

const PlayerScreen = ({ onBack }: PlayerScreenProps) => {
  const {
    currentSong,
    playing,
    playNext,
    playPrevious,
    togglePlayPause,
  } = useMusicPlayer();

  if (!currentSong) {
    return (
      <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onBack}>
        <View className="flex-1 items-center justify-center bg-[#1d1d1f] px-6">
          <Text className="mb-6 text-center text-base text-[#707070]">
            No hay ninguna canción seleccionada.
          </Text>

          <Pressable
            className="rounded-full bg-[#b64400] px-6 py-3"
            onPress={onBack}
          >
            <Text className="font-bold text-white">Volver a pistas</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onBack}>
      <View className="flex-1 bg-[#1d1d1f] px-6 py-5">
      <Pressable className="self-start py-3" onPress={onBack}>
        <Text className="text-base font-bold text-white">‹ Volver</Text>
      </Pressable>

      <View className="flex-1 items-center justify-center">
        <View className="mb-10 h-64 w-64 items-center justify-center rounded-3xl bg-[#333333]">
          <Text className="text-7xl text-[#b64400]">♪</Text>
        </View>

        <Text className="mb-2 text-center text-2xl font-bold text-white" numberOfLines={2}>
          {currentSong.title}
        </Text>

        <Text className="mb-1 text-center text-base text-[#b64400]" numberOfLines={1}>
          {currentSong.artist || 'Artista Desconocido'}
        </Text>

        <Text className="mb-8 text-center text-sm text-[#707070]" numberOfLines={1}>
          {currentSong.album || 'Álbum Desconocido'} • {formatDuration(currentSong.duration)}
        </Text>

        <View className="flex-row items-center justify-center gap-6">
          <Pressable
            className="h-14 w-14 items-center justify-center rounded-full bg-[#333333]"
            onPress={() => {
              void playPrevious();
            }}
          >
            <Text className="text-2xl font-bold text-white">‹‹</Text>
          </Pressable>

          <Pressable
            className="h-20 w-20 items-center justify-center rounded-full bg-[#b64400]"
            onPress={() => {
              void togglePlayPause();
            }}
          >
            <Text className="text-3xl font-bold text-white">
              {playing ? 'Ⅱ' : '▶'}
            </Text>
          </Pressable>

          <Pressable
            className="h-14 w-14 items-center justify-center rounded-full bg-[#333333]"
            onPress={() => {
              void playNext();
            }}
          >
            <Text className="text-2xl font-bold text-white">››</Text>
          </Pressable>
        </View>
      </View>
      </View>
    </Modal>
  );
};

export default PlayerScreen;