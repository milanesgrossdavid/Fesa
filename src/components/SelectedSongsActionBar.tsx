import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { DeleteIcon, PlayIcon, PlusIcon, ShareIcon } from '../Icons';

interface SelectedSongsActionBarProps {
  visible: boolean;
  onPlay: () => void;
  onAdd: () => void;
  onShare: () => void;
  onDelete: () => void;
}

const SelectedSongsActionBar = ({
  visible,
  onPlay,
  onAdd,
  onShare,
  onDelete,
}: SelectedSongsActionBarProps) => {
  if (!visible) {
    return null;
  }

  return (
    <View className="absolute bottom-5 left-5 right-5 rounded-3xl bg-[#252525] px-4 py-3 shadow-lg">
      <View className="flex-row items-center justify-between">
        <Pressable className="items-center gap-1" onPress={onPlay}>
          <PlayIcon size={24} color="#ffffff" />
          <Text className="text-xs font-bold text-white">Reproducir</Text>
        </Pressable>
        <Pressable className="items-center gap-1" onPress={onAdd}>
          <PlusIcon size={25} color="#ffffff" />
          <Text className="text-xs font-bold text-white">Añadir</Text>
        </Pressable>
        <Pressable className="items-center gap-1" onPress={onShare}>
          <ShareIcon size={24} color="#ffffff" />
          <Text className="text-xs font-bold text-white">Compartir</Text>
        </Pressable>
        <Pressable className="items-center gap-1" onPress={onDelete}>
          <DeleteIcon size={25} color="#ffffff" />
          <Text className="text-xs font-bold text-white">Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default SelectedSongsActionBar;