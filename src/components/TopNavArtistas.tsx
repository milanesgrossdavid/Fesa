import React from 'react';
import { getTranslation } from '../i18n/translations';
import { useAppSettings } from '../settings/appSettings';
import TopNavSortFilter, { TrackSortDirection, TrackSortOption } from './TopNavSortFilter';

export type { TrackSortDirection, TrackSortOption };

interface TopNavArtistasProps {
  selectedSort: TrackSortOption;
  selectedDirection: TrackSortDirection;
  onSortChange: (option: TrackSortOption, direction: TrackSortDirection) => void;
}

const TopNavArtistas = (props: TopNavArtistasProps) => {
  const { language } = useAppSettings();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const SORT_OPTIONS: { label: string; value: TrackSortOption }[] = [
    { label: t('sort_name', 'Name'), value: 'name' },
    { label: t('sort_date', 'Date'), value: 'date' },
    { label: t('sort_albums', 'Albums'), value: 'albums' },
  ];

  return <TopNavSortFilter {...props} sortOptions={SORT_OPTIONS} />;
};

export default TopNavArtistas;