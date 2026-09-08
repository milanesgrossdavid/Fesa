import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FilterIcon, SortAscIcon, SortDescIcon } from '../Icons';
import { useTranslation } from '../i18n/translations';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';

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
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const { t } = useTranslation(language.id);
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel = sortOptions.find(option => option.value === selectedSort)?.label ?? t('sort_name', 'Name');

  const handleSelectSort = (option: TrackSortOption) => {
    const nextDirection = option === selectedSort && selectedDirection === 'asc' ? 'desc' : 'asc';

    onSortChange(option, nextDirection);
    setModalVisible(false);
  };

  return (
    <View
      className="px-4 pb-3 pt-3"
      style={{
        backgroundColor: theme.background,
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Pressable
          className="flex-row items-center gap-2 rounded-[16px] border px-4 py-3"
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t('sort_by', 'Sort by')}: ${selectedLabel}`}
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: '#000000',
            shadowOpacity: 0.12,
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

      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end">
          <Pressable
            className="absolute inset-0 bg-black/70"
            onPress={() => setModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel={t('cancel', 'Cancel')}
          />
          <View
            className="max-h-[72%] w-full rounded-t-[28px] px-3 pb-2 pt-2"
            style={{
              backgroundColor: theme.background,
              shadowColor: '#000000',
              shadowOpacity: 0.25,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: -8 },
              elevation: 18,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          >
            <View className="mb-3 items-center">
              <View className="h-[5px] w-10 rounded-full" style={{ backgroundColor: `${theme.mutedText}55` }} />
            </View>

            <View className="mb-4 flex-row items-center justify-between px-2">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-bold" style={{ color: theme.text }}>{t('sort_by', 'Sort by')}</Text>
                <Text className="mt-1 text-xs" style={{ color: theme.mutedText }}>
                {t('sort_toggle_hint', 'Tap again to switch between ascending and descending.')}
                </Text>
              </View>
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.surface }}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('close', 'Close')}
              >
                <Text className="text-lg font-semibold" style={{ color: theme.accent }}>×</Text>
              </Pressable>
            </View>

            {sortOptions.map((option, index) => {
              const isSelected = option.value === selectedSort;

              return (
                <Pressable
                  key={option.value}
                  className="mx-1 flex-row items-center justify-between rounded-[20px] border px-4 py-3.5"
                  style={{
                    backgroundColor: isSelected ? theme.surface : 'transparent',
                    borderColor: isSelected ? theme.accent : theme.border,
                    marginBottom: index === sortOptions.length - 1 ? 8 : 6,
                  }}
                  onPress={() => handleSelectSort(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
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
