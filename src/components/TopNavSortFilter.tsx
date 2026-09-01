import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { FilterIcon, SortAscIcon, SortDescIcon } from '../Icons';
import { getTranslation } from '../i18n/translations';
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
  const { theme, language } = useAppSettings();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel = sortOptions.find(option => option.value === selectedSort)?.label ?? t('sort_name', 'Name');

  const handleSelectSort = (option: TrackSortOption) => {
    const nextDirection = option === selectedSort && selectedDirection === 'asc' ? 'desc' : 'asc';

    onSortChange(option, nextDirection);
    setModalVisible(false);
  };

  return (
    <View
      className="px-4 pb-3 pt-4"
      style={{
        backgroundColor: theme.background,
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Pressable
          className="flex-row items-center gap-2 rounded-full border px-3 py-2.5"
          onPress={() => setModalVisible(true)}
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: '#000000',
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <FilterIcon size={14} color={theme.mutedText} />
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
        <View className="flex-1 items-center justify-center px-5">
          <Pressable className="absolute inset-0 bg-black/50" onPress={() => setModalVisible(false)} />
          <View
            className="w-full max-w-[420px] overflow-hidden rounded-[30px] border p-2"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: '#000000',
              shadowOpacity: 0.18,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 10 },
              elevation: 8,
            }}
          >
            <View className="px-4 pb-2 pt-3">
              <Text className="text-lg font-bold" style={{ color: theme.text }}>{t('sort_by', 'Sort by')}</Text>
              <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                {t('sort_toggle_hint', 'Tap again to switch between ascending and descending.')}
              </Text>
            </View>

            {sortOptions.map((option, index) => {
              const isSelected = option.value === selectedSort;

              return (
                <Pressable
                  key={option.value}
                  className="mx-2 flex-row items-center justify-between rounded-2xl border px-4 py-4"
                  style={{
                    backgroundColor: isSelected ? theme.background : 'transparent',
                    borderColor: isSelected ? theme.accent : 'transparent',
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
                      <SortDescIcon size={18} color={theme.accent} />
                    ) : (
                      <SortAscIcon size={18} color={theme.accent} />
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
