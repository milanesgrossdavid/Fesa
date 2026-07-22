import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { FilterIcon, PlayIcon, ShuffleIcon, SortAscIcon, SortDescIcon } from '../Icons';

export type TrackSortOption = 'name' | 'date' | 'artist' | 'albums';
export type TrackSortDirection = 'asc' | 'desc';

interface TopNavPistasProps {
  selectedSort: TrackSortOption;
  selectedDirection: TrackSortDirection;
  onSortChange: (option: TrackSortOption, direction: TrackSortDirection) => void;
  onShufflePress: () => void;
  onPlayPress: () => void;
  disabled?: boolean;
}

const SORT_OPTIONS: { label: string; value: TrackSortOption }[] = [
  { label: 'Nombre', value: 'name' },
  { label: 'Fecha', value: 'date' },
  { label: 'Artista', value: 'artist' },
  { label: 'Albumes', value: 'albums' },
];

const TopNavPistas = ({
  selectedSort,
  selectedDirection,
  onSortChange,
  onShufflePress,
  onPlayPress,
  disabled = false,
}: TopNavPistasProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel = SORT_OPTIONS.find(option => option.value === selectedSort)?.label ?? 'Nombre';

  const handleSelectSort = (option: TrackSortOption) => {
    const nextDirection = option === selectedSort && selectedDirection === 'asc' ? 'desc' : 'asc';

    onSortChange(option, nextDirection);
    setModalVisible(false);
  };

  return (
    <View className="bg-[#1d1d1f] px-5 py-4 flex-row items-center justify-between">
      <Pressable className="flex-row items-center gap-2" onPress={() => setModalVisible(true)}>
        <FilterIcon size={24} color="white" />
        <Text className="text-white text-base font-bold">{selectedLabel}</Text>
      </Pressable>

      <View className="flex-row items-center gap-3">
        <Pressable
          className={`h-10 w-10 items-center justify-center rounded-full ${disabled ? 'bg-[#252525]' : 'bg-[#333333]'}`}
          disabled={disabled}
          onPress={onShufflePress}
        >
          <ShuffleIcon size={20} color={disabled ? '#707070' : 'white'} />
        </Pressable>

        <Pressable
          className={`h-10 w-10 items-center justify-center rounded-full ${disabled ? 'bg-[#252525]' : 'bg-[#b64400]'}`}
          disabled={disabled}
          onPress={onPlayPress}
        >
          <PlayIcon size={20} color={disabled ? '#707070' : 'white'} />
        </Pressable>
      </View>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-center px-6">
          <Pressable className="absolute inset-0 bg-black/60" onPress={() => setModalVisible(false)} />
          <View className="overflow-hidden rounded-2xl bg-[#252525]">
            {SORT_OPTIONS.map(option => {
              const isSelected = option.value === selectedSort;

              return (
                <Pressable
                  key={option.value}
                  className="flex-row items-center justify-between px-5 py-4"
                  onPress={() => handleSelectSort(option.value)}
                >
                  <Text className={`text-base font-bold ${isSelected ? 'text-[#b64400]' : 'text-white'}`}>
                    {option.label}
                  </Text>
                  {isSelected ? (
                    selectedDirection === 'desc' ? (
                      <SortDescIcon size={18} color="#b64400" />
                    ) : (
                      <SortAscIcon size={18} color="#b64400" />
                    )
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TopNavPistas;