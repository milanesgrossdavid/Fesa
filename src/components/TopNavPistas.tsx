import React from 'react';
import { Pressable, View } from 'react-native';
import { PlayIcon, ShuffleIcon } from '../Icons';
import TopNavSortFilter, { TrackSortDirection, TrackSortOption } from './TopNavSortFilter';

export type { TrackSortDirection, TrackSortOption };

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
}: TopNavPistasProps) => (
  <TopNavSortFilter
    selectedSort={selectedSort}
    selectedDirection={selectedDirection}
    onSortChange={onSortChange}
    sortOptions={SORT_OPTIONS}
    rightContent={(
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
    )}
  />
);

export default TopNavPistas;