import { useEffect, useState } from 'react';
import { getColors } from 'react-native-image-colors';
import type { ImageColorsResult } from 'react-native-image-colors';
import { useAppSettings } from '../settings/appSettings';

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);

const getDominantResultColor = (result: ImageColorsResult, fallback: string) => {
  if ('dominant' in result) {
    if (isHexColor(result.dominant) && result.dominant.toLowerCase() !== fallback.toLowerCase()) {
      return result.dominant;
    }

    if ('average' in result && isHexColor(result.average)) {
      return result.average;
    }

    return fallback;
  }

  const color = result.platform === 'ios' ? result.background || result.primary : fallback;

  return isHexColor(color) ? color : fallback;
};

/**
 * Hook para extraer el color dominante de una imagen (URI local o remota).
 * Utiliza react-native-image-colors para un análisis eficiente.
 */
export const useDominantColor = (uri: string | null | undefined, fallbackColor?: string) => {
  const { theme } = useAppSettings();
  const defaultFallback = fallbackColor || theme.surface || '#252525';
  const [dominantColor, setDominantColor] = useState(defaultFallback);

  useEffect(() => {
    let isMounted = true;

    setDominantColor(defaultFallback);

    const fetchColors = async () => {
      if (!uri) {
        setDominantColor(defaultFallback);
        return;
      }

      try {
        const result: ImageColorsResult = await getColors(uri, {
          fallback: defaultFallback,
          cache: true,
          key: uri,
        });

        if (!isMounted) return;

        setDominantColor(getDominantResultColor(result, defaultFallback));
      } catch (error) {
        console.warn('Error al extraer color dominante:', error);
        if (isMounted) setDominantColor(defaultFallback);
      }
    };

    fetchColors();

    return () => {
      isMounted = false;
    };
  }, [uri, defaultFallback]);

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