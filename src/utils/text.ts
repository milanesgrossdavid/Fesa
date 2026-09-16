import { getTranslation } from '../i18n/translations';
import { getAppSettingsSnapshot } from '../settings/appSettings';

const getLocalizedFallback = (key: string, fallback: string) =>
  getTranslation(getAppSettingsSnapshot().languageId, key, fallback);

export const getUnknownAlbum = () => getLocalizedFallback('unknown_album', 'Unknown Album');
export const getUnknownArtist = () => getLocalizedFallback('unknown_artist', 'Unknown Artist');
export const getUnknownFolder = () => getLocalizedFallback('unknown_folder', 'Unknown Folder');

export const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const cleanValue = value?.trim();
  return cleanValue || fallback;
};

export const formatDateValue = (value?: number | string | null, fallbackLabel = getLocalizedFallback('not_available', 'Not available')) => {
  if (value == null || value === '') {
    return fallbackLabel;
  }

  if (typeof value === 'number') {
    const millis = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(millis).toLocaleString('es-ES');
  }

  return String(value);
};
