import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { FilterIcon, SortAscIcon, SortDescIcon } from '../Icons';
import { useAppSettings } from '../settings/appSettings';

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
  const { theme } = useAppSettings();
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel = sortOptions.find(option => option.value === selectedSort)?.label ?? 'Nombre';

  const handleSelectSort = (option: TrackSortOption) => {
    const nextDirection = option === selectedSort && selectedDirection === 'asc' ? 'desc' : 'asc';

    onSortChange(option, nextDirection);
    setModalVisible(false);
  };

  return (
    <View className="px-5 py-4" style={{ backgroundColor: theme.background }}>
      <View className="flex-row items-center justify-between">
        <Pressable
          className="flex-row items-center gap-2 rounded-full px-3 py-2"
          style={{ backgroundColor: theme.surface }}
          onPress={() => setModalVisible(true)}
        >
          <FilterIcon size={18} color={theme.text} />
          <Text className="text-sm font-bold" style={{ color: theme.text }}>{selectedLabel}</Text>
          {selectedDirection === 'desc' ? (
            <SortDescIcon size={16} color={theme.mutedText} />
          ) : (
            <SortAscIcon size={16} color={theme.mutedText} />
          )}
        </Pressable>

        {rightContent}
      </View>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 items-center justify-center px-6">
          <Pressable className="absolute inset-0 bg-black/70" onPress={() => setModalVisible(false)} />
          <View
            className="w-full max-w-[400px] overflow-hidden rounded-[28px] p-2"
            style={{ backgroundColor: theme.surface }}
          >
            <View className="px-4 pb-2 pt-3">
              <Text className="text-lg font-bold" style={{ color: theme.text }}>Ordenar por</Text>
              <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                Toca de nuevo para cambiar entre ascendente y descendente.
              </Text>
            </View>

            {sortOptions.map((option, index) => {
              const isSelected = option.value === selectedSort;

              return (
                <Pressable
                  key={option.value}
                  className="mx-2 mb-1 flex-row items-center justify-between rounded-2xl px-4 py-4"
                  style={{
                    backgroundColor: isSelected ? theme.background : 'transparent',
                    marginBottom: index === sortOptions.length - 1 ? 8 : 4,
                  }}
                  onPress={() => handleSelectSort(option.value)}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: isSelected ? theme.text : theme.mutedText }}
                  >
                    {option.label}
                  </Text>
                  {isSelected ? (
                    selectedDirection === 'desc' ? (
                      <SortDescIcon size={18} color={theme.text} />
                    ) : (
                      <SortAscIcon size={18} color={theme.text} />
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
