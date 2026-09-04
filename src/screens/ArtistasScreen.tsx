import React from 'react';
import GroupedLibraryScreen from './GroupedLibraryScreen';
import { getTranslation } from '../i18n/translations';
import { useAppSettingsLanguage } from '../settings/appSettings';

const ArtistasScreen = () => {
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);

  return <GroupedLibraryScreen mode="artists" title={t('tab_artists', 'Artists')} />;
};

export default ArtistasScreen;