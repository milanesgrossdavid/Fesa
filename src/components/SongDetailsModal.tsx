import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { getTranslation } from '../i18n/translations';
import { formatDuration } from '../utils/time';
import { useAppSettings } from '../settings/appSettings';
import LibraryArtwork from './LibraryArtwork';
import { FontAwesome5 } from '@expo/vector-icons';

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

const formatDateValue = (value?: number | string | null, fallbackLabel = 'No disponible') => {
  if (value == null || value === '') {
    return fallbackLabel;
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
    <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: mutedColor }}>
      {label}
    </Text>
    <Text className="mt-1 text-sm font-semibold" style={{ color: textColor }} numberOfLines={3}>
      {value}
    </Text>
  </View>
);

const SongDetailsModal = ({ song, onClose }: SongDetailsModalProps) => {
  const insets = useSafeAreaInsets();
  const { theme, language } = useAppSettings();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<{ title: string; artist: string; album: string; artwork: string | null } | null>(null);

  useEffect(() => {
    if (!song) {
      setIsEditing(false);
      setDraft(null);
      return;
    }

    setDraft({
      title: song.title,
      artist: song.artist || '',
      album: song.album || '',
      artwork: song.artwork || null,
    });
    setIsEditing(false);
  }, [song]);

  const visibleSong = song ? {
    ...song,
    title: draft?.title ?? song.title,
    artist: draft?.artist ?? song.artist,
    album: draft?.album ?? song.album,
    artwork: draft?.artwork ?? song.artwork,
  } : null;

  const updateDraft = (field: 'title' | 'artist' | 'album' | 'artwork', value: string) => {
    setDraft(current => current ? { ...current, [field]: value } : current);
  };

  const handleEditPress = async () => {
    return;
  };

  const handleSaveChanges = async () => {
    return;
  };

  const handlePickArtwork = async () => {
    return;
  };

  return (
    <Modal transparent visible={Boolean(song)} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        {song && visibleSong ? (
          <View
            className="max-h-[88%] rounded-t-[32px] px-4 pt-3"
            style={{
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 24),
              borderTopColor: theme.border,
              borderTopWidth: 1,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: -8 },
              elevation: 16,
            }}
          >
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full" style={{ backgroundColor: theme.mutedText + '99' }} />
            </View>

            <View className="mb-4 flex-row items-center justify-between px-1">
              <Text className="text-2xl font-bold" style={{ color: theme.text }}>
                {t('song_details_title', 'Details')}
              </Text>

              <View className="flex-row items-center gap-2">
                <Pressable onPress={onClose} className="rounded-full px-3 py-1.5">
                  <Text className="text-base font-semibold" style={{ color: theme.text }}>
                    {t('song_details_close', 'Close')}
                  </Text>
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              <View className="mb-5 items-center">
                <View className="rounded-[30px] p-2">
                  <LibraryArtwork
                    artwork={visibleSong.artwork}
                    className="h-44 w-44 rounded-[24px]"
                    fallbackTextClassName="text-6xl font-bold text-white"
                  />
                </View>

                <>
                  <Text
                    className="mt-5 text-center text-[28px] font-bold leading-8"
                    style={{ color: theme.text }}
                    numberOfLines={2}
                  >
                    {visibleSong.title}
                  </Text>
                  <Text className="mt-2 text-center text-base" style={{ color: theme.mutedText }} numberOfLines={1}>
                    {normalizeValue(visibleSong.artist, UNKNOWN_ARTIST)}
                  </Text>
                </>
              </View>

              <View className="overflow-hidden rounded-[26px]" style={{ backgroundColor: theme.surface + 'CC', borderWidth: 1, borderColor: theme.border }}>
                <DetailRow
                  label={t('song_detail_album', 'Album')}
                  value={normalizeValue(visibleSong.album, t('unknown_album', 'Unknown Album'))}
                  mutedColor={theme.mutedText}
                  textColor={theme.text}
                  borderColor={theme.border}
                />
                <DetailRow
                  label={t('song_detail_duration', 'Duration')}
                  value={formatDuration(visibleSong.duration)}
                  mutedColor={theme.mutedText}
                  textColor={theme.text}
                  borderColor={theme.border}
                />
                <DetailRow
                  label={t('song_detail_modified_date', 'Modified date')}
                  value={formatDateValue(visibleSong.dateModified, t('not_available', 'Not available'))}
                  mutedColor={theme.mutedText}
                  textColor={theme.text}
                  borderColor={theme.border}
                />
                <DetailRow
                  label={t('song_detail_path', 'Path')}
                  value={visibleSong.url || t('not_available', 'Not available')}
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
