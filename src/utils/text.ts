export const UNKNOWN_ALBUM = 'Álbum Desconocido';
export const UNKNOWN_ARTIST = 'Artista Desconocido';
export const UNKNOWN_FOLDER = 'Carpeta Desconocida';

export const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const cleanValue = value?.trim();
  return cleanValue || fallback;
};

export const formatDateValue = (value?: number | string | null, fallbackLabel = 'No disponible') => {
  if (value == null || value === '') {
    return fallbackLabel;
  }

  if (typeof value === 'number') {
    const millis = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(millis).toLocaleString('es-ES');
  }

  return String(value);
};
