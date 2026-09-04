import { useEffect, useRef, useState } from 'react';
import { getColors } from 'react-native-image-colors';
import type { ImageColorsResult } from 'react-native-image-colors';

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const hexToHsl = (hex: string) => {
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (!delta) return { hue: 0, saturation: 0, lightness };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  return { hue: (hue * 60 + 360) % 360, saturation, lightness };
};

export const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = lightness - chroma / 2;
  const channels =
    segment < 1 ? [chroma, secondary, 0] :
    segment < 2 ? [secondary, chroma, 0] :
    segment < 3 ? [0, chroma, secondary] :
    segment < 4 ? [0, secondary, chroma] :
    segment < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];

  return `#${channels.map(channel => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`;
};

const enhanceColor = (color: string) => {
  const { hue, saturation, lightness } = hexToHsl(color);
  return hslToHex(
    hue,
    clamp(Math.max(saturation, 0.42), 0.42, 0.82),
    clamp(lightness, 0.24, 0.62),
  );
};

const getDominantResultColor = (result: ImageColorsResult, fallback: string) => {
  if ('dominant' in result) {
    const average = 'average' in result ? result.average : undefined;
    const candidates = [result.vibrant, result.dominant, average, result.darkVibrant];
    const selected = candidates.find(
      color => isHexColor(color) && color.toLowerCase() !== fallback.toLowerCase(),
    ) ?? candidates.find(isHexColor);
    return selected ? enhanceColor(selected) : fallback;
  }

  const color = result.platform === 'ios' ? result.background || result.primary : fallback;

  return isHexColor(color) ? enhanceColor(color) : fallback;
};

// Small URI -> hex cache so identical album art (e.g. multiple tracks from same album)
// doesn't trigger a fresh decode pass.
const colorCache = new Map<string, string>();

// Single-flight queue: react-native-image-colors does work in the native
// thread, but the JS callback reentry can pile up when the user skips tracks
// quickly. A tiny in-flight counter keeps the number of pending decodes bounded.
let inFlight = 0;
const MAX_IN_FLIGHT = 1;

/**
 * Hook para extraer el color dominante de una imagen (URI local o remota).
 * Utiliza react-native-image-colors para un análisis eficiente.
 *
 * - Lee la caché de forma síncrona en el inicializador de useState para
 *   que el primer render ya tenga el color correcto (sin parpadeo).
 * - Decodifica en `requestAnimationFrame` para no bloquear la animación
 *   del modal cuando se abre la pantalla.
 * - Cancela peticiones obsoletas mediante un token incremental.
 */
export const useDominantColor = (uri: string | null | undefined, fallbackColor?: string) => {
  const fallback = fallbackColor || '#252525';
  const cached = uri ? colorCache.get(uri) : undefined;
  const [dominantColor, setDominantColor] = useState<string>(() => cached ?? fallback);
  const requestIdRef = useRef(0);
  const lastUriRef = useRef<string | null | undefined>(uri);

  useEffect(() => {
    if (!uri) {
      // Keep the previous color instead of resetting, so the UI doesn't flash.
      return;
    }

    const cachedNow = colorCache.get(uri);
    if (cachedNow) {
      // Same color already extracted: avoid any setState to prevent re-render.
      if (cachedNow !== dominantColor) setDominantColor(cachedNow);
      return;
    }

    if (lastUriRef.current === uri && dominantColor !== fallback) {
      // Same URI as the previous render and we already have a non-fallback color.
      return;
    }

    const requestId = ++requestIdRef.current;
    lastUriRef.current = uri;

    const fetchColors = async () => {
      // Single-flight gate: if the previous decode hasn't returned yet, wait
      // for it to settle before issuing a new one. The hook's `requestId`
      // check above already cancels stale results, so a single in-flight
      // decode is enough to keep CPU and the native bridge quiet.
      while (inFlight >= MAX_IN_FLIGHT) {
        await new Promise(resolve => setTimeout(resolve, 16));
        if (requestId !== requestIdRef.current) return;
      }
      inFlight += 1;
      try {
        const result: ImageColorsResult = await getColors(uri, {
          fallback,
          pixelSpacing: 12,
          cache: true,
          key: uri,
        });

        if (requestId !== requestIdRef.current) return;

        const next = getDominantResultColor(result, fallback);
        colorCache.set(uri, next);
        setDominantColor(next);
      } catch (error) {
        if (requestId === requestIdRef.current) {
          console.warn('Error al extraer color dominante:', error);
        }
      } finally {
        inFlight = Math.max(0, inFlight - 1);
      }
    };

    // Decode off the critical animation path so opening the modal isn't blocked.
    // Two rAFs lets the slide-in animation paint at least once before we
    // touch the JS thread with the color decode work.
    let cancelled = false;
    const handle = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        void fetchColors();
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  return dominantColor;
};

/**
 * Utilidad para añadir transparencia (alpha) a un color hexadecimal.
 * @param hex Color en formato #RRGGBB
 * @param opacity Opacidad de 0 a 1
 * @returns String en formato rgba(...)
 */
export const withAlpha = (hex: string, opacity: number) => {
  try {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
      return hex;
    }

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return hex;
    }

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } catch {
    return hex;
  }
};

export const getGradientColors = (hex: string) => {
  if (!isHexColor(hex)) return [hex, hex, '#080808'] as const;
  const { hue, saturation, lightness } = hexToHsl(hex);
  return [
    hslToHex(hue, clamp(saturation, 0.42, 0.9), clamp(lightness + 0.12, 0.34, 0.7)),
    hslToHex((hue + 18) % 360, clamp(saturation * 0.9, 0.34, 0.78), clamp(lightness - 0.02, 0.22, 0.54)),
    hslToHex(hue, clamp(saturation * 0.55, 0.2, 0.5), 0.08),
  ] as const;
};
