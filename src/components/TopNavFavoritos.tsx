import React from 'react';
import TopNavSortFilter, { TrackSortDirection, TrackSortOption } from './TopNavSortFilter';

export type { TrackSortDirection, TrackSortOption };

interface TopNavFavoritosProps {
  selectedSort: TrackSortOption;
  selectedDirection: TrackSortDirection;
  onSortChange: (option: TrackSortOption, direction: TrackSortDirection) => void;
}

const SORT_OPTIONS: { label: string; value: TrackSortOption }[] = [
  { label: 'Nombre', value: 'name' },
  { label: 'Fecha', value: 'date' },
  { label: 'Artista', value: 'artist' },
  { label: 'Albumes', value: 'albums' },
];

const TopNavFavoritos = (props: TopNavFavoritosProps) => (
  <TopNavSortFilter {...props} sortOptions={SORT_OPTIONS} />
);

export default TopNavFavoritos;