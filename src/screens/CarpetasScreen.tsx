import React from 'react';
import GroupedLibraryScreen from './GroupedLibraryScreen';
import { getTranslation } from '../i18n/translations';
import { useAppSettingsLanguage } from '../settings/appSettings';

const CarpetasScreen = () => {
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);

  return <GroupedLibraryScreen mode="folders" title={t('tab_folders', 'Folders')} />;
};

export default CarpetasScreen;