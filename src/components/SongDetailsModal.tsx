import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { formatDuration } from '../utils/time';
import { useAppSettings } from '../settings/appSettings';
import LibraryArtwork from './LibraryArtwork';

const UNKNOWN_ALBUM = 'Álbum Desconocido';
const UNKNOWN_ARTIST = 'Artista Desconocido';

interface SongDetailsModalProps {
  song: Song | null;
  onClose: () => void;
}

const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const cleanValue = value?.trim();
  return cleanValue || fallback;
};

const formatDateValue = (value?: number | string | null) => {
  if (value == null || value === '') {
    return 'No disponible';
  }

  if (typeof value === 'number') {
    const millis = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(millis).toLocaleString('es-ES');
  }

  return String(value);
};

const DetailRow = ({
  label,
  value,
  mutedColor,
  textColor,
  borderColor,
}: {
  label: string;
  value: string;
  mutedColor: string;
  textColor: string;
  borderColor: string;
}) => (
  <View className="border-b px-4 py-3.5" style={{ borderBottomColor: borderColor }}>
    <Text className="text-xs font-bold uppercase tracking-[1.2px]" style={{ color: mutedColor }}>
      {label}
    </Text>
    <Text className="mt-1 text-sm font-bold" style={{ color: textColor }} numberOfLines={3}>
      {value}
    </Text>
  </View>
);

const SongDetailsModal = ({ song, onClose }: SongDetailsModalProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();

  return (
    <Modal transparent visible={Boolean(song)} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        {song ? (
          <View
            className="max-h-[88%] rounded-t-[32px] px-5 pt-3"
            style={{
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-white/20" />
            </View>

            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold" style={{ color: theme.text }}>
                Detalles de la pista
              </Text>
              <Pressable onPress={onClose}>
                <Text className="font-bold" style={{ color: theme.text }}>Cerrar</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-5 items-center">
                <LibraryArtwork
                  artwork={song.artwork}
                  className="h-44 w-44 rounded-[28px]"
                  fallbackTextClassName="text-6xl font-bold text-white"
                />
                <Text
                  className="mt-5 text-center text-2xl font-bold"
                  style={{ color: theme.text }}
                  numberOfLines={2}
                >
                  {song.title}
                </Text>
                <Text className="mt-2 text-center text-base" style={{ color: theme.mutedText }} numberOfLines={1}>
                  {normalizeValue(song.artist, UNKNOWN_ARTIST)}
                </Text>
              </View>

              <View className="overflow-hidden rounded-3xl" style={{ backgroundColor: theme.surface }}>
                <DetailRow
                  label="Álbum"
                  value={normalizeValue(song.album, UNKNOWN_ALBUM)}
                  mutedColor={theme.mutedText}
                  textColor={theme.text}
                  borderColor={theme.border}
                />
                <DetailRow
                  label="Duración"
                  value={formatDuration(song.duration)}
                  mutedColor={theme.mutedText}
                  textColor={theme.text}
                  borderColor={theme.border}
                />
                <DetailRow
                  label="Fecha modificada"
                  value={formatDateValue(song.dateModified)}
                  mutedColor={theme.mutedText}
                  textColor={theme.text}
                  borderColor={theme.border}
                />
                <DetailRow
                  label="Ruta"
                  value={song.url || 'No disponible'}
                  mutedColor={theme.mutedText}
                  textColor={theme.text}
                  borderColor="transparent"
                />
              </View>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

export default SongDetailsModal;
