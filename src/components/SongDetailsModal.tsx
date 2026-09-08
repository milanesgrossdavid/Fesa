import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { getTranslation } from '../i18n/translations';
import { formatDuration } from '../utils/time';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import { formatDateValue, normalizeValue, UNKNOWN_ALBUM } from '../utils/text';
import LibraryArtwork from './LibraryArtwork';

interface SongDetailsModalProps {
  song: Song | null;
  visible?: boolean;
  onClose: () => void;
}

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

const SongDetailsModal = ({ song, visible, onClose }: SongDetailsModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const isOpen = visible ?? Boolean(song);
  const [isEditing] = useState(false);
  const [draft, setDraft] = useState<{ title: string; artist: string; album: string; artwork: string | null } | null>(null);

  useEffect(() => {
    if (!song) {
      setDraft(null);
      return;
    }

    setDraft({
      title: song.title,
      artist: song.artist || '',
      album: song.album || '',
      artwork: song.artwork || null,
    });
  }, [song]);

  const visibleSong = song ? {
    ...song,
    title: draft?.title ?? song.title,
    artist: draft?.artist ?? song.artist,
    album: draft?.album ?? song.album,
    artwork: draft?.artwork ?? song.artwork,
  } : null;

  return (
    <Modal transparent visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        {song && visibleSong ? (
          <View
            className="max-h-[88%] rounded-t-[28px] px-5 pt-2"
            style={{
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 24),
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: -8 },
              elevation: 18,
            }}
          >
            <View className="mb-4 items-center">
              <View className="h-[5px] w-10 rounded-full" style={{ backgroundColor: `${theme.mutedText}55` }} />
            </View>

            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-bold" style={{ color: theme.text }}>
                  {t('song_details_title', 'Details')}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: theme.mutedText }} numberOfLines={1}>
                  {visibleSong.title}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={onClose}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.surface }}
                  accessibilityRole="button"
                  accessibilityLabel={t('song_details_close', 'Close')}
                >
                  <Text className="text-lg font-semibold" style={{ color: theme.accent }}>×</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              <View className="mb-5 items-center">
                <View className="rounded-[24px] border p-2" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                  <LibraryArtwork
                    artwork={visibleSong.artwork}
                    className="h-40 w-40 rounded-[20px]"
                    fallbackTextClassName="text-6xl font-bold text-white"
                  />
                </View>

                <Text
                  className="mt-5 text-center text-[28px] font-bold leading-8"
                  style={{ color: theme.text }}
                  numberOfLines={2}
                >
                  {visibleSong.title}
                </Text>
                <Text className="mt-2 text-center text-base" style={{ color: theme.mutedText }} numberOfLines={1}>
                  {normalizeValue(visibleSong.artist, t('unknown_artist', 'Unknown Artist'))}
                </Text>
              </View>

              <View
                className="overflow-hidden rounded-[20px] border"
                style={{ backgroundColor: theme.surface, borderColor: theme.border }}
              >
                <DetailRow
                  label={t('song_detail_album', 'Album')}
                  value={normalizeValue(visibleSong.album, UNKNOWN_ALBUM)}
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
