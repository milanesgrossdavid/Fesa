import { useEffect, useRef, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

export type AppThemeId = 'fesa' | 'oceano' | 'uva' | 'rosa' | 'salvia' | 'grafito';
export type AppLanguageId = 'es' | 'en' | 'pt' | 'fr' | 'it';
export type TabId = 'Inicio' | 'Favoritos' | 'Playlist' | 'Pistas' | 'Álbumes' | 'Artistas' | 'Carpetas';

export type AppTheme = {
  id: AppThemeId;
  name: string;
  background: string;
  surface: string;
  accent: string;
  text: string;
  mutedText: string;
  border: string;
};

export type AppLanguage = {
  id: AppLanguageId;
  label: string;
  nativeName: string;
};

export type TabPreference = {
  id: TabId;
  enabled: boolean;
};

type PersistedAppSettings = {
  sleepTimerEndsAt: number | null;
  playbackRate: number;
  lockScreenControlsEnabled: boolean;
  skipSilenceBetweenTracks: boolean;
  themeId: AppThemeId;
  languageId: AppLanguageId;
  tabs: TabPreference[];
  termsAcceptedAt: number | null;
  hiddenSongIds: string[];
};

export type AppSettingsSnapshot = PersistedAppSettings & {
  theme: AppTheme;
  language: AppLanguage;
};

const APP_SETTINGS_STORAGE_KEY = '@fesa:app-settings';

export const APP_THEMES: AppTheme[] = [
  {
    id: 'fesa',
    name: 'Fesa',
    background: '#1d1d1f',
    surface: '#252525',
    accent: '#f5f5f5',
    text: '#ffffff',
    mutedText: '#b6b6b6',
    border: '#333333',
  },
  {
    id: 'oceano',
    name: 'Azul Nocturno',
    background: '#0f172a',
    surface: '#1e293b',
    accent: '#93c5fd',
    text: '#f8fafc',
    mutedText: '#94a3b8',
    border: '#334155',
  },
  {
    id: 'uva',
    name: 'Lavanda',
    background: '#f5f3ff',
    surface: '#ddd6fe',
    accent: '#7c3aed',
    text: '#251342',
    mutedText: '#6b5f88',
    border: '#c4b5fd',
  },
  {
    id: 'rosa',
    name: 'Arena',
    background: '#f6f1e8',
    surface: '#e7dccb',
    accent: '#7c5a36',
    text: '#2f2418',
    mutedText: '#756653',
    border: '#cdbfa9',
  },
  {
    id: 'salvia',
    name: 'Salvia',
    background: '#edf4ef',
    surface: '#d5e3d8',
    accent: '#3f6f5b',
    text: '#14231c',
    mutedText: '#5f7568',
    border: '#aebfac',
  },
  {
    id: 'grafito',
    name: 'Perla',
    background: '#f8fafc',
    surface: '#e2e8f0',
    accent: '#475569',
    text: '#0f172a',
    mutedText: '#64748b',
    border: '#cbd5e1',
  },
];

export const DEFAULT_TABS: TabPreference[] = [
  { id: 'Inicio', enabled: true },
  { id: 'Favoritos', enabled: true },
  { id: 'Playlist', enabled: true },
  { id: 'Pistas', enabled: true },
  { id: 'Álbumes', enabled: true },
  { id: 'Artistas', enabled: true },
  { id: 'Carpetas', enabled: true },
];

export const APP_LANGUAGES: AppLanguage[] = [
  { id: 'es', label: 'Español', nativeName: 'Español' },
  { id: 'en', label: 'English', nativeName: 'English' },
  { id: 'pt', label: 'Português', nativeName: 'Português' },
  { id: 'fr', label: 'Français', nativeName: 'Français' },
  { id: 'it', label: 'Italiano', nativeName: 'Italiano' },
];

const DEFAULT_SETTINGS: PersistedAppSettings = {
  sleepTimerEndsAt: null,
  playbackRate: 1,
  lockScreenControlsEnabled: true,
  skipSilenceBetweenTracks: true,
  themeId: 'fesa',
  languageId: 'es',
  tabs: DEFAULT_TABS,
  termsAcceptedAt: null,
  hiddenSongIds: [],
};

let hydrated = false;
let sleepTimerId: ReturnType<typeof setTimeout> | null = null;
let persistedState: PersistedAppSettings = DEFAULT_SETTINGS;
let snapshot: AppSettingsSnapshot = {
  ...DEFAULT_SETTINGS,
  theme: APP_THEMES[0],
  language: APP_LANGUAGES[0],
};

const listeners = new Set<() => void>();
const sleepTimerListeners = new Set<() => void>();

const getThemeById = (themeId: AppThemeId) => APP_THEMES.find(theme => theme.id === themeId) ?? APP_THEMES[0];
const getLanguageById = (languageId: AppLanguageId) => APP_LANGUAGES.find(language => language.id === languageId) ?? APP_LANGUAGES[0];

const VALID_TAB_IDS = new Set<TabId>(DEFAULT_TABS.map(tab => tab.id));

const resolveDeviceLanguageId = (): AppLanguageId => {
  const locales = 'getLocales' in Localization ? Localization.getLocales() : [];

  for (const locale of locales) {
    const rawLanguageCode = locale?.languageCode ?? locale?.languageTag ?? '';
    const normalizedLanguageCode = rawLanguageCode.toLowerCase();

    if (!normalizedLanguageCode) {
      continue;
    }

    const matchedLanguage = APP_LANGUAGES.find(language => {
      const languageId = language.id.toLowerCase();
      return normalizedLanguageCode === languageId || normalizedLanguageCode.startsWith(`${languageId}-`);
    });

    if (matchedLanguage) {
      return matchedLanguage.id;
    }
  }

  return DEFAULT_SETTINGS.languageId;
};

const normalizeTabs = (tabs?: TabPreference[]) => {
  const source = Array.isArray(tabs) ? tabs : DEFAULT_TABS;
  const seen = new Set<TabId>();
  const normalized: TabPreference[] = [];

  for (const tab of source) {
    if (!VALID_TAB_IDS.has(tab.id) || seen.has(tab.id)) {
      continue;
    }

    seen.add(tab.id);
    normalized.push({
      id: tab.id,
      enabled: Boolean(tab.enabled),
    });
  }

  for (const tab of DEFAULT_TABS) {
    if (!seen.has(tab.id)) {
      normalized.push({ ...tab });
    }
  }

  return normalized;
};

const updateSnapshot = () => {
  const tabs = normalizeTabs(persistedState.tabs);
  const theme = getThemeById(persistedState.themeId);
  const language = getLanguageById(persistedState.languageId);

  // Reuse the same snapshot reference when nothing observable changed so
  // useSyncExternalStore doesn't trigger re-renders in every consumer.
  if (
    snapshot.tabs === tabs
    && snapshot.theme === theme
    && snapshot.language === language
    && snapshot.sleepTimerEndsAt === persistedState.sleepTimerEndsAt
    && snapshot.playbackRate === persistedState.playbackRate
    && snapshot.lockScreenControlsEnabled === persistedState.lockScreenControlsEnabled
    && snapshot.skipSilenceBetweenTracks === persistedState.skipSilenceBetweenTracks
    && snapshot.themeId === persistedState.themeId
    && snapshot.languageId === persistedState.languageId
    && snapshot.termsAcceptedAt === persistedState.termsAcceptedAt
    && snapshot.hiddenSongIds === persistedState.hiddenSongIds
  ) {
    return;
  }

  snapshot = {
    ...persistedState,
    tabs,
    theme,
    language,
  };
};

const emit = () => {
  updateSnapshot();
  listeners.forEach(listener => listener());
};

const persist = async () => {
  try {
    await AsyncStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(persistedState));
  } catch (error) {
    console.warn('No se pudieron guardar los ajustes:', error);
  }
};

const clearSleepTimer = () => {
  if (sleepTimerId) {
    clearTimeout(sleepTimerId);
    sleepTimerId = null;
  }
};

const notifySleepTimerExpired = () => {
  persistedState = {
    ...persistedState,
    sleepTimerEndsAt: null,
  };
  emit();
  void persist();
  sleepTimerListeners.forEach(listener => listener());
};

const scheduleSleepTimer = () => {
  clearSleepTimer();

  if (!persistedState.sleepTimerEndsAt) {
    return;
  }

  const remainingMs = persistedState.sleepTimerEndsAt - Date.now();

  if (remainingMs <= 0) {
    notifySleepTimerExpired();
    return;
  }

  sleepTimerId = setTimeout(() => {
    notifySleepTimerExpired();
  }, remainingMs);
};

export const subscribeAppSettings = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const getAppSettingsSnapshot = () => snapshot;

export const hydrateAppSettings = async () => {
  if (hydrated) {
    return;
  }

  hydrated = true;

  let shouldPersistDetectedLanguage = false;

  try {
    const storedValue = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);

    if (storedValue) {
      const parsed = JSON.parse(storedValue) as Partial<PersistedAppSettings>;

      const isValidLanguageId = Boolean(parsed.languageId && APP_LANGUAGES.some(lang => lang.id === parsed.languageId));
      const isValidThemeId = Boolean(parsed.themeId && APP_THEMES.some(theme => theme.id === parsed.themeId));
      const detectedLanguageId = resolveDeviceLanguageId();

      persistedState = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        tabs: normalizeTabs(parsed.tabs),
        themeId: isValidThemeId && parsed.themeId ? parsed.themeId : DEFAULT_SETTINGS.themeId,
        languageId: isValidLanguageId && parsed.languageId ? parsed.languageId : detectedLanguageId,
      };

      shouldPersistDetectedLanguage = !isValidLanguageId && detectedLanguageId !== DEFAULT_SETTINGS.languageId;
    } else {
      const detectedLanguageId = resolveDeviceLanguageId();
      persistedState = {
        ...DEFAULT_SETTINGS,
        languageId: detectedLanguageId,
      };
      shouldPersistDetectedLanguage = detectedLanguageId !== DEFAULT_SETTINGS.languageId;
    }
  } catch (error) {
    console.warn('No se pudieron cargar los ajustes:', error);
    persistedState = {
      ...DEFAULT_SETTINGS,
      languageId: resolveDeviceLanguageId(),
    };
    shouldPersistDetectedLanguage = true;
  }

  emit();
  scheduleSleepTimer();

  if (shouldPersistDetectedLanguage) {
    void persist();
  }
};

const updatePersistedState = (partialState: Partial<PersistedAppSettings>) => {
  const nextState = {
    ...persistedState,
    ...partialState,
  };

  if (
    persistedState.sleepTimerEndsAt === nextState.sleepTimerEndsAt
    && persistedState.playbackRate === nextState.playbackRate
    && persistedState.lockScreenControlsEnabled === nextState.lockScreenControlsEnabled
    && persistedState.skipSilenceBetweenTracks === nextState.skipSilenceBetweenTracks
    && persistedState.themeId === nextState.themeId
    && persistedState.languageId === nextState.languageId
    && persistedState.termsAcceptedAt === nextState.termsAcceptedAt
    && persistedState.tabs === nextState.tabs
    && persistedState.hiddenSongIds === nextState.hiddenSongIds
  ) {
    return;
  }

  persistedState = nextState;
  emit();
  void persist();
};

export const setSleepTimer = (minutes: number | null) => {
  updatePersistedState({
    sleepTimerEndsAt: minutes ? Date.now() + minutes * 60 * 1000 : null,
  });
  scheduleSleepTimer();
};

export const setPlaybackRate = (playbackRate: number) => {
  updatePersistedState({ playbackRate });
};

export const setLockScreenControlsEnabled = (lockScreenControlsEnabled: boolean) => {
  updatePersistedState({ lockScreenControlsEnabled });
};

export const setThemeId = (themeId: AppThemeId) => {
  updatePersistedState({ themeId });
};

export const setLanguageId = (languageId: AppLanguageId) => {
  updatePersistedState({ languageId });
};

export const moveTab = (tabId: TabId, direction: 'left' | 'right') => {
  const nextTabs = [...normalizeTabs(persistedState.tabs)];
  const currentIndex = nextTabs.findIndex(tab => tab.id === tabId);

  if (currentIndex === -1) {
    return;
  }

  const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= nextTabs.length) {
    return;
  }

  [nextTabs[currentIndex], nextTabs[targetIndex]] = [nextTabs[targetIndex], nextTabs[currentIndex]];
  updatePersistedState({ tabs: nextTabs });
};

export const reorderTabs = (orderedIds: TabId[]) => {
  const currentTabs = normalizeTabs(persistedState.tabs);
  const byId = new Map(currentTabs.map(tab => [tab.id, tab]));
  const nextTabs: TabPreference[] = [];

  for (const id of orderedIds) {
    const tab = byId.get(id);

    if (!tab) {
      continue;
    }

    nextTabs.push(tab);
    byId.delete(id);
  }

  byId.forEach(tab => nextTabs.push(tab));
  updatePersistedState({ tabs: nextTabs });
};

export const setTabEnabled = (tabId: TabId, enabled: boolean) => {
  const currentTabs = normalizeTabs(persistedState.tabs);
  const enabledCount = currentTabs.filter(tab => tab.enabled).length;

  if (!enabled && enabledCount <= 1) {
    return false;
  }

  const nextTabs = currentTabs.map(tab => (
    tab.id === tabId ? { ...tab, enabled } : tab
  ));

  updatePersistedState({ tabs: nextTabs });
  return true;
};

export const acceptTerms = () => {
  updatePersistedState({ termsAcceptedAt: Date.now() });
};

export const getHiddenSongIds = () => [...persistedState.hiddenSongIds];

export const isSongHidden = (songId: string) => persistedState.hiddenSongIds.includes(songId);

export const toggleHiddenSongId = (songId: string) => {
  const nextHiddenSongIds = persistedState.hiddenSongIds.includes(songId)
    ? persistedState.hiddenSongIds.filter(id => id !== songId)
    : [...persistedState.hiddenSongIds, songId];

  updatePersistedState({ hiddenSongIds: nextHiddenSongIds });
  return nextHiddenSongIds;
};

export const registerSleepTimerListener = (listener: () => void) => {
  sleepTimerListeners.add(listener);

  return () => {
    sleepTimerListeners.delete(listener);
  };
};

export const useAppSettings = () => {
  const currentSnapshot = useSyncExternalStore(subscribeAppSettings, getAppSettingsSnapshot, getAppSettingsSnapshot);

  useEffect(() => {
    void hydrateAppSettings();
  }, []);

  return currentSnapshot;
};

const shallowEqual = (a: any, b: any) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

const useSettingsSlice = <T,>(selector: (s: AppSettingsSnapshot) => T): T => {
  const sliceRef = useRef<T>(undefined as unknown as T);
  const subscribeWithSelector = (listener: () => void) => subscribeAppSettings(listener);
  const getSelected = () => {
    const next = selector(getAppSettingsSnapshot());
    if (typeof next === 'object' && next !== null && !Array.isArray(next)) {
      if (shallowEqual(sliceRef.current as any, next as any)) {
        return sliceRef.current;
      }
    } else if (sliceRef.current === next) {
      return sliceRef.current;
    }
    sliceRef.current = next;
    return next;
  };
  return useSyncExternalStore(subscribeWithSelector, getSelected, getSelected);
};

export const useAppSettingsTheme = () => useSettingsSlice(s => s.theme);
export const useAppSettingsLanguage = () => useSettingsSlice(s => s.language);
export const useAppSettingsTabs = () => useSettingsSlice(s => s.tabs);
export const useAppSettingsHiddenSongIds = () => useSettingsSlice(s => s.hiddenSongIds);
export const useAppSettingsPlaybackRate = () => useSettingsSlice(s => s.playbackRate);
export const useAppSettingsSleepTimerEndsAt = () => useSettingsSlice(s => s.sleepTimerEndsAt);
export const useAppSettingsLockScreenControls = () => useSettingsSlice(s => s.lockScreenControlsEnabled);
export const useAppSettingsSkipSilence = () => useSettingsSlice(s => s.skipSilenceBetweenTracks);
export const useAppSettingsTermsAccepted = () => useSettingsSlice(s => s.termsAcceptedAt);
