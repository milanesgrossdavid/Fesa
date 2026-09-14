import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { getColors } from 'react-native-image-colors';
import type { ImageColorsResult } from 'react-native-image-colors';

const DEFAULT_COLOR = '#252525';
const DEFAULT_ARTWORK_URI = Image.resolveAssetSource(
  require('../../assets/musicNotFound.jpg'),
).uri;
const CACHE_LIMIT = 150;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

type Hsl = {
  hue: number;
  saturation: number;
  lightness: number;
};

const colorCache = new Map<string, string>();
const pendingColors = new Map<string, Promise<string>>();

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_COLOR.test(value);

const normalizeHex = (value: string): string => {
  if (value.length === 4) {
    return `#${value
      .slice(1)
      .split('')
      .map(channel => channel + channel)
      .join('')}`.toLowerCase();
  }

  return value.toLowerCase();
};

const rememberColor = (uri: string, color: string) => {
  colorCache.delete(uri);
  colorCache.set(uri, color);

  while (colorCache.size > CACHE_LIMIT) {
    const oldestUri = colorCache.keys().next().value;
    if (oldestUri) colorCache.delete(oldestUri);
  }
};

export const hexToHsl = (hex: string): Hsl => {
  const normalized = normalizeHex(hex);
  const red = parseInt(normalized.slice(1, 3), 16) / 255;
  const green = parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { hue: 0, saturation: 0, lightness };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;

  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  return { hue: (hue * 60 + 360) % 360, saturation, lightness };
};

export const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = clamp(saturation, 0, 1);
  const normalizedLightness = clamp(lightness, 0, 1);
  const chroma =
    (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const segment = normalizedHue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = normalizedLightness - chroma / 2;
  const channels =
    segment < 1
      ? [chroma, secondary, 0]
      : segment < 2
        ? [secondary, chroma, 0]
        : segment < 3
          ? [0, chroma, secondary]
          : segment < 4
            ? [0, secondary, chroma]
            : segment < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];

  return `#${channels
    .map(channel =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
};

const enhanceColor = (color: string) => {
  const { hue, saturation, lightness } = hexToHsl(color);

  // Preserve true neutrals; adding hue to album art that is actually grayscale
  // produces a color that was not present in the artwork.
  if (saturation < 0.08 || lightness < 0.06) return normalizeHex(color);

  return hslToHex(
    hue,
    clamp(Math.max(saturation, 0.42), 0.42, 0.82),
    clamp(lightness, 0.24, 0.62),
  );
};

const getResultColor = (result: ImageColorsResult, fallback: string) => {
  const candidates =
    result.platform === 'ios'
      ? [result.primary, result.background, result.secondary, result.detail]
      : result.platform === 'android'
        ? [
            result.dominant,
            result.average,
            result.vibrant,
            result.darkVibrant,
            result.lightVibrant,
            result.muted,
            result.darkMuted,
            result.lightMuted,
          ]
        : [
            result.dominant,
            result.vibrant,
            result.darkVibrant,
            result.lightVibrant,
            result.muted,
            result.darkMuted,
            result.lightMuted,
          ];

  const color = candidates.find(isHexColor);
  return color ? enhanceColor(color) : fallback;
};

const extractColor = (uri: string, fallback: string): Promise<string> => {
  const cached = colorCache.get(uri);
  if (cached) {
    rememberColor(uri, cached);
    return Promise.resolve(cached);
  }

  const pending = pendingColors.get(uri);
  if (pending) return pending;

  const request = getColors(uri, {
    fallback,
    cache: true,
    key: uri,
    pixelSpacing: 5,
    quality: 'highest',
  })
    .then(result => {
      const color = getResultColor(result, fallback);
      rememberColor(uri, color);
      return color;
    })
    .finally(() => {
      pendingColors.delete(uri);
    });

  pendingColors.set(uri, request);
  return request;
};

const extractColorWithArtworkFallback = async (
  uri: string | null | undefined,
  fallback: string,
) => {
  if (!uri) {
    return extractColor(DEFAULT_ARTWORK_URI, fallback);
  }

  try {
    return await extractColor(uri, fallback);
  } catch {
    try {
      const defaultArtworkColor = await extractColor(DEFAULT_ARTWORK_URI, fallback);
      rememberColor(uri, defaultArtworkColor);
      return defaultArtworkColor;
    } catch {
      return DEFAULT_COLOR;
    }
  }
};

export const useDominantColor = (
  uri: string | null | undefined,
  fallbackColor = DEFAULT_COLOR,
) => {
  const fallback = isHexColor(fallbackColor)
    ? normalizeHex(fallbackColor)
    : DEFAULT_COLOR;
  const [dominantColor, setDominantColor] = useState(() =>
    uri ? colorCache.get(uri) ?? fallback : fallback,
  );

  useEffect(() => {
    let active = true;

    const cached = uri ? colorCache.get(uri) : undefined;
    if (uri && cached) {
      rememberColor(uri, cached);
      setDominantColor(cached);
      return () => {
        active = false;
      };
    }

    setDominantColor(fallback);
    void extractColorWithArtworkFallback(uri, fallback)
      .then(color => {
        if (active) setDominantColor(color);
      })
      .catch(error => {
        if (active) {
          console.warn('Error al extraer el color predominante:', error);
        }
      });

    return () => {
      active = false;
    };
  }, [fallback, uri]);

  return dominantColor;
};

export const withAlpha = (hex: string, opacity: number) => {
  if (!isHexColor(hex)) return hex;

  const normalized = normalizeHex(hex);
  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${clamp(opacity, 0, 1)})`;
};

export const getGradientColors = (hex: string) => {
  if (!isHexColor(hex)) return [hex, hex, '#080808'] as const;

  const { hue, saturation, lightness } = hexToHsl(hex);
  if (saturation < 0.08 || lightness < 0.06) {
    return [
      hslToHex(0, 0, clamp(lightness + 0.72, 0.05, 0.7)),
      hslToHex(0, 0, clamp(lightness, 0.03, 0.54)),
      hslToHex(0, 0, Math.min(lightness, 0.08)),
    ] as const;
  }

  return [
    hslToHex(hue, clamp(saturation, 0.42, 0.9), clamp(lightness + 0.12, 0.34, 0.7)),
    hslToHex(
      hue + 18,
      clamp(saturation * 0.9, 0.34, 0.78),
      clamp(lightness - 0.02, 0.22, 0.54),
    ),
    hslToHex(hue, clamp(saturation * 0.55, 0.2, 0.5), 0.08),
  ] as const;
};
