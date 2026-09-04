import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrackSortDirection, TrackSortOption } from '../components/TopNavPistas';

export type SortPreference = {
  sort: TrackSortOption;
  direction: TrackSortDirection;
};

const SORT_PREFERENCES_STORAGE_KEY = '@fesa:sort-preferences';

const isSortOption = (value: unknown): value is TrackSortOption => (
  value === 'name' || value === 'date' || value === 'artist' || value === 'albums'
);

const isSortDirection = (value: unknown): value is TrackSortDirection => (
  value === 'asc' || value === 'desc'
);

export const loadSortPreference = async (
  screenKey: string,
  fallback: SortPreference
): Promise<SortPreference> => {
  try {
    const storedValue = await AsyncStorage.getItem(SORT_PREFERENCES_STORAGE_KEY);
    const preferences = storedValue ? JSON.parse(storedValue) : {};
    const preference = preferences?.[screenKey];

    return isSortOption(preference?.sort) && isSortDirection(preference?.direction)
      ? { sort: preference.sort, direction: preference.direction }
      : fallback;
  } catch (error) {
    console.warn('No se pudo cargar la ordenacion:', error);
    return fallback;
  }
};

export const saveSortPreference = async (screenKey: string, preference: SortPreference) => {
  try {
    const storedValue = await AsyncStorage.getItem(SORT_PREFERENCES_STORAGE_KEY);
    const preferences = storedValue ? JSON.parse(storedValue) : {};

    await AsyncStorage.setItem(
      SORT_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ ...preferences, [screenKey]: preference })
    );
  } catch (error) {
    console.warn('No se pudo guardar la ordenacion:', error);
  }
};

export const normalizeSortPreference = (value: unknown, fallback: SortPreference): SortPreference => {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<SortPreference>;
  const sort = candidate.sort;
  const direction = candidate.direction;

  return isSortOption(sort) && isSortDirection(direction)
    ? { sort, direction }
    : fallback;
};