import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Song, ToneType } from '../../modules/local-music';

interface DefineAsModalProps {
  song: Song | null;
  onClose: () => void;
  onDefineAs: (song: Song, type: ToneType) => void;
}

const TONE_OPTIONS: { label: string; value: ToneType }[] = [
  { label: 'Tono del dispositivo', value: 'ringtone' },
  { label: 'Tono del contacto', value: 'contact' },
  { label: 'Tono de alarma', value: 'alarm' },
];

const DefineAsModal = ({ song, onClose, onDefineAs }: DefineAsModalProps) => (
  <Modal transparent visible={Boolean(song)} animationType="fade" onRequestClose={onClose}>
    <View className="flex-1 justify-end">
      <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
      {song ? (
        <View className="rounded-t-[32px] bg-[#252525] px-6 pb-8 pt-6">
          <Text className="text-xl font-bold text-white">Definir como</Text>
          <Text className="mt-2 text-sm text-[#707070]" numberOfLines={1}>
            {song.title}
          </Text>
          <View className="mt-5 gap-3">
            {TONE_OPTIONS.map(option => (
              <Pressable
                key={option.value}
                className="rounded-2xl bg-[#1d1d1f] px-4 py-4"
                onPress={() => onDefineAs(song, option.value)}
              >
                <Text className="text-base font-bold text-white">{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  </Modal>
);

export default DefineAsModal;