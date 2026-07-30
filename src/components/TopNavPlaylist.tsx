import React from 'react';
import { Pressable, Text } from 'react-native';
import TopNavSortFilter, { TrackSortDirection, TrackSortOption } from './TopNavSortFilter';
import { PlusIcon } from '../Icons';

export type { TrackSortDirection, TrackSortOption };

interface TopNavPlaylistProps {
  selectedSort: TrackSortOption;
  selectedDirection: TrackSortDirection;
  onSortChange: (option: TrackSortOption, direction: TrackSortDirection) => void;
  onCreatePlaylist?: () => void;
}

const SORT_OPTIONS: { label: string; value: TrackSortOption }[] = [
  { label: 'Nombre', value: 'name' },
  { label: 'Fecha', value: 'date' },
];

const TopNavPlaylist = ({
  selectedSort,
  selectedDirection,
  onSortChange,
  onCreatePlaylist,
}: TopNavPlaylistProps) => (
  <TopNavSortFilter
    selectedSort={selectedSort}
    selectedDirection={selectedDirection}
    onSortChange={onSortChange}
    sortOptions={SORT_OPTIONS}
    rightContent={onCreatePlaylist ? (
      <Pressable className="rounded-full flex-row gap-1 items-center bg-[#f5f5f5] px-4 py-2" onPress={onCreatePlaylist}>
        <Text className="text-lg font-bold text-black">Crear</Text>
        <PlusIcon size={24} color='#000000'/>
      </Pressable>
    ) : null}
  />
);

export default TopNavPlaylist;