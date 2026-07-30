import React from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

interface CreatePlaylistModalProps {
  visible: boolean;
  playlistName: string;
  onChangePlaylistName: (name: string) => void;
  onClose: () => void;
  onNext: () => void;
}

const CreatePlaylistModal = ({
  visible,
  playlistName,
  onChangePlaylistName,
  onClose,
  onNext,
}: CreatePlaylistModalProps) => (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View className="flex-1 justify-center px-6">
      <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
      <View className="rounded-3xl bg-[#252525] p-5">
        <Text className="text-xl font-bold text-white">Crear lista nueva</Text>
        <Text className="mt-2 text-sm text-[#707070]">Ponle un nombre a tu nueva playlist.</Text>
        <TextInput
          className="mt-5 rounded-2xl bg-[#1d1d1f] px-4 py-3 text-base text-white"
          placeholder="Nombre de la lista"
          placeholderTextColor="#707070"
          value={playlistName}
          onChangeText={onChangePlaylistName}
        />
        <View className="mt-5 flex-row justify-end gap-3">
          <Pressable className="rounded-full px-4 py-3" onPress={onClose}>
            <Text className="font-bold text-[#707070]">Cancelar</Text>
          </Pressable>
          <Pressable className="rounded-full bg-[#b64400] px-5 py-3" onPress={onNext}>
            <Text className="font-bold text-white">Siguiente</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

export default CreatePlaylistModal;