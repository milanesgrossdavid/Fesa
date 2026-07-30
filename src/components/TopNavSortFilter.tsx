import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { FilterIcon, SortAscIcon, SortDescIcon } from '../Icons';

export type TrackSortOption = 'name' | 'date' | 'artist' | 'albums';
export type TrackSortDirection = 'asc' | 'desc';

export type SortFilterOption = {
  label: string;
  value: TrackSortOption;
};

interface TopNavSortFilterProps {
  selectedSort: TrackSortOption;
  selectedDirection: TrackSortDirection;
  sortOptions: SortFilterOption[];
  onSortChange: (option: TrackSortOption, direction: TrackSortDirection) => void;
  rightContent?: React.ReactNode;
}

const TopNavSortFilter = ({
  selectedSort,
  selectedDirection,
  sortOptions,
  onSortChange,
  rightContent,
}: TopNavSortFilterProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel = sortOptions.find(option => option.value === selectedSort)?.label ?? 'Nombre';

  const handleSelectSort = (option: TrackSortOption) => {
    const nextDirection = option === selectedSort && selectedDirection === 'asc' ? 'desc' : 'asc';

    onSortChange(option, nextDirection);
    setModalVisible(false);
  };

  return (
    <View className="bg-[#1d1d1f] px-5 py-4">
      <View className="flex-row items-center justify-between">
        <Pressable className="flex-row items-center gap-2" onPress={() => setModalVisible(true)}>
          <FilterIcon size={24} color="white" />
          <Text className="text-base font-bold text-white">{selectedLabel}</Text>
        </Pressable>

        {rightContent}
      </View>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-center px-6">
          <Pressable className="absolute inset-0 bg-black/60" onPress={() => setModalVisible(false)} />
          <View className="overflow-hidden rounded-2xl bg-[#252525]">
            {sortOptions.map(option => {
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

export default TopNavSortFilter;