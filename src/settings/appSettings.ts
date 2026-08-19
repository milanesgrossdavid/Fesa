import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppThemeId = 'fesa' | 'oceano' | 'uva' | 'rosa';
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

export type TabPreference = {
  id: TabId;
  enabled: boolean;
};

type PersistedAppSettings = {
  sleepTimerEndsAt: number | null;
  playbackRate: number;
  crossfadeEnabled: boolean;
  lockScreenControlsEnabled: boolean;
  themeId: AppThemeId;
  tabs: TabPreference[];
  termsAcceptedAt: number | null;
};

export type AppSettingsSnapshot = PersistedAppSettings & {
  theme: AppTheme;
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
    name: 'Océano',
    background: '#eff3ff',
    surface: '#bdd7e7',
    accent: '#2171b5',
    text: '#102240',
    mutedText: '#4f6c88',
    border: '#7d99b9',
  },
  {
    id: 'uva',
    name: 'Uva',
    background: '#fc9af5',
    surface: '#c56ebf',
    accent: '#68245f',
    text: '#2a0a2e',
    mutedText: '#6f4f7d',
    border: '#8f6f9a',
  },
  {
    id: 'rosa',
    name: 'Rosa',
    background: '#f8f4f2',
    surface: '#e6d2d9',
    accent: '#5c2334',
    text: '#2c1721',
    mutedText: '#6c4e61',
    border: '#b897a2',
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

const DEFAULT_SETTINGS: PersistedAppSettings = {
  sleepTimerEndsAt: null,
  playbackRate: 1,
  crossfadeEnabled: false,
  lockScreenControlsEnabled: true,
  themeId: 'fesa',
  tabs: DEFAULT_TABS,
  termsAcceptedAt: null,
};

let hydrated = false;
let sleepTimerId: ReturnType<typeof setTimeout> | null = null;
let persistedState: PersistedAppSettings = DEFAULT_SETTINGS;
let snapshot: AppSettingsSnapshot = {
  ...DEFAULT_SETTINGS,
  theme: APP_THEMES[0],
};

const listeners = new Set<() => void>();
const sleepTimerListeners = new Set<() => void>();

const getThemeById = (themeId: AppThemeId) => APP_THEMES.find(theme => theme.id === themeId) ?? APP_THEMES[0];

const VALID_TAB_IDS = new Set<TabId>(DEFAULT_TABS.map(tab => tab.id));

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
  snapshot = {
    ...persistedState,
    tabs: normalizeTabs(persistedState.tabs),
    theme: getThemeById(persistedState.themeId),
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

  try {
    const storedValue = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);

    if (storedValue) {
      const parsed = JSON.parse(storedValue) as Partial<PersistedAppSettings>;
      persistedState = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        tabs: normalizeTabs(parsed.tabs),
        themeId: parsed.themeId && getThemeById(parsed.themeId).id ? parsed.themeId : DEFAULT_SETTINGS.themeId,
      };
    }
  } catch (error) {
    console.warn('No se pudieron cargar los ajustes:', error);
  }

  emit();
  scheduleSleepTimer();
};

const updatePersistedState = (partialState: Partial<PersistedAppSettings>) => {
  persistedState = {
    ...persistedState,
    ...partialState,
  };
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

export const setCrossfadeEnabled = (crossfadeEnabled: boolean) => {
  updatePersistedState({ crossfadeEnabled });
};

export const setLockScreenControlsEnabled = (lockScreenControlsEnabled: boolean) => {
  updatePersistedState({ lockScreenControlsEnabled });
};

export const setThemeId = (themeId: AppThemeId) => {
  updatePersistedState({ themeId });
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
