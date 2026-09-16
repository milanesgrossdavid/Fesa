import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song } from '../../modules/local-music';

type LyricsSong = Pick<Song, 'id' | 'title' | 'artist' | 'album'>;

const inFlightLookups = new Map<string, Promise<string | null>>();

const normalizeValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const getStorageKey = (song: LyricsSong) => {
  const metadataKey = [song.artist, song.title, song.album]
    .map(value => normalizeValue(value || ''))
    .filter(Boolean)
    .join(':');

  return `@fesa:lyrics:${metadataKey || song.id}`;
};

const getStoredLyrics = async (song: LyricsSong) => (
  (await AsyncStorage.getItem(getStorageKey(song))) ??
  (await AsyncStorage.getItem(`@lyrics:${song.id}`))
);

const getLyricsText = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown>;
  for (const candidate of [data.syncedLyrics, data.plainLyrics, data.lyrics]) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return null;
};

const fetchJson = async (url: string, signal: AbortSignal) => {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<unknown>;
};

const lookupLyrics = async (song: LyricsSong): Promise<string | null> => {
  const storedLyrics = await getStoredLyrics(song);
  if (storedLyrics) {
    return storedLyrics;
  }

  const artist = (song.artist || '').replace(/\s*\/\s*/g, ', ').replace(/\s+/g, ' ').trim();
  const primaryArtist = (song.artist || '').split('/')[0].trim() || artist;
  const title = (song.title || '').trim();
  const album = (song.album || '').trim();
  const attempts = [
    [artist, ''],
    [primaryArtist, ''],
    [artist, album],
    [primaryArtist, album],
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    for (const [attemptArtist, attemptAlbum] of attempts) {
      if (!attemptArtist || !title) {
        continue;
      }

      const params = new URLSearchParams({
        artist_name: attemptArtist,
        track_name: title,
      });
      if (attemptAlbum) {
        params.set('album_name', attemptAlbum);
      }

      const result = await fetchJson(`https://lrclib.net/api/get?${params}`, controller.signal);
      const lyrics = getLyricsText(result);
      if (lyrics) {
        await AsyncStorage.setItem(getStorageKey(song), lyrics);
        return lyrics;
      }
    }

    const search = await fetchJson(
      `https://lrclib.net/api/search?${new URLSearchParams({ q: `${artist} ${title}` })}`,
      controller.signal,
    );
    if (Array.isArray(search)) {
      for (const item of search) {
        const lyrics = getLyricsText(item);
        if (lyrics) {
          await AsyncStorage.setItem(getStorageKey(song), lyrics);
          return lyrics;
        }
      }
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const preloadLyrics = (song: LyricsSong): Promise<string | null> => {
  const key = getStorageKey(song);
  const existing = inFlightLookups.get(key);
  if (existing) {
    return existing;
  }

  const request = lookupLyrics(song)
    .catch(error => {
      if ((error as { name?: string })?.name !== 'AbortError') {
        console.warn('No se pudieron cargar las letras:', error);
      }
      return null;
    })
    .finally(() => {
      inFlightLookups.delete(key);
    });

  inFlightLookups.set(key, request);
  return request;
};

export const getLyricsStorageKey = getStorageKey;
