import React from 'react';
import { useTranslation } from '../i18n/translations';
import { useAppSettingsLanguage } from '../settings/appSettings';
import TopNavSortFilter, { TrackSortDirection, TrackSortOption } from './TopNavSortFilter';

export type { TrackSortDirection, TrackSortOption };

interface TopNavFavoritosProps {
  selectedSort: TrackSortOption;
  selectedDirection: TrackSortDirection;
  onSortChange: (option: TrackSortOption, direction: TrackSortDirection) => void;
}

const TopNavFavoritos = (props: TopNavFavoritosProps) => {
  const language = useAppSettingsLanguage();
  const { t } = useTranslation(language.id);
  const SORT_OPTIONS: { label: string; value: TrackSortOption }[] = [
    { label: t('sort_name', 'Name'), value: 'name' },
    { label: t('sort_date', 'Date'), value: 'date' },
    { label: t('sort_artist', 'Artist'), value: 'artist' },
    { label: t('sort_albums', 'Albums'), value: 'albums' },
  ];

  return <TopNavSortFilter {...props} sortOptions={SORT_OPTIONS} />;
};

export default TopNavFavoritos;