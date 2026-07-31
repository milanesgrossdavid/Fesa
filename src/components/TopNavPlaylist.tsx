import React from 'react';
import { Pressable, Text } from 'react-native';
import TopNavSortFilter, { TrackSortDirection, TrackSortOption } from './TopNavSortFilter';
import { PlusIcon } from '../Icons';
import { useAppSettings } from '../settings/appSettings';

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
}: TopNavPlaylistProps) => {
  const { theme } = useAppSettings();

  return (
    <TopNavSortFilter
      selectedSort={selectedSort}
      selectedDirection={selectedDirection}
      onSortChange={onSortChange}
      sortOptions={SORT_OPTIONS}
      rightContent={onCreatePlaylist ? (
        <Pressable
          className="flex-row items-center gap-1.5 rounded-full px-2 py-2"
          style={{ backgroundColor: theme.text }}
          onPress={onCreatePlaylist}
        >
          <PlusIcon size={24} color={theme.background} />
          
        </Pressable>
      ) : null}
    />
  );
};

export default TopNavPlaylist;
