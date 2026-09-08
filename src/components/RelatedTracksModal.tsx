import React from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { getTranslation } from '../i18n/translations';
import { PlayIcon } from '../Icons';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import LibraryArtwork from './LibraryArtwork';

interface RelatedTracksModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  songs: Song[];
  artwork?: string | null;
  variant?: 'album' | 'artist';
  onClose: () => void;
  onPlayAll?: () => void;
  onSelectSong: (index: number) => void;
}

const RelatedTracksModal = ({
  visible,
  title,
  subtitle,
  songs,
  artwork,
  variant = 'album',
  onClose,
  onPlayAll,
  onSelectSong,
}: RelatedTracksModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const isArtist = variant === 'artist';
  const songCountLabel = `${songs.length} ${songs.length === 1 ? t('song_count_one', 'song') : t('song_count_many', 'songs')}`;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/70"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('cancel', 'Cancel')}
        />
        <View
          className="max-h-[82%] rounded-t-[28px] px-5 pt-2"
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

          <View className="mb-4 flex-row items-center justify-between px-1">
            <View className="flex-1 pr-3">
              <Text className="text-xl font-bold" style={{ color: theme.text }} numberOfLines={1}>
                {title}
              </Text>
              <Text className="mt-1 text-xs font-semibold uppercase tracking-[1.1px]" style={{ color: theme.mutedText }}>
                {songCountLabel}
              </Text>
            </View>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.surface }}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('close', 'Close')}
            >
              <Text className="text-lg font-semibold" style={{ color: theme.accent }}>×</Text>
            </Pressable>
          </View>

          <View className="mb-4 items-center">
            <View className="rounded-[24px] border p-2" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <LibraryArtwork
                artwork={artwork ?? songs[0]?.artwork}
                fallback={isArtist ? title.charAt(0).toUpperCase() : '♪'}
                className={`h-32 w-32 ${isArtist ? 'rounded-full' : 'rounded-[20px]'}`}
                fallbackTextClassName="text-5xl font-bold text-white"
              />
            </View>
            <Text
              className="mt-4 text-center text-2xl font-bold"
              style={{ color: theme.text }}
              numberOfLines={2}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text className="mt-1 text-center text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}

            {onPlayAll && songs.length > 0 ? (
              <Pressable
                className="mt-4 flex-row items-center gap-2 rounded-full px-5 py-3"
                style={{ backgroundColor: theme.accent }}
                onPress={onPlayAll}
                accessibilityRole="button"
                accessibilityLabel={t('play', 'Play')}
              >
                <PlayIcon size={16} color={theme.background} />
                <Text className="font-bold" style={{ color: theme.background }}>
                  {t('play', 'Play')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={songs}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
            renderItem={({ item, index }) => (
              <Pressable
                className="mb-2 flex-row items-center rounded-[20px] border px-3 py-3"
                style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                onPress={() => onSelectSong(index)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.artist?.trim() || t('unknown_artist', 'Unknown Artist')}`}
              >
                <LibraryArtwork
                  artwork={item.artwork}
                  className="mr-3 h-12 w-12 rounded-[12px]"
                  fallbackTextClassName="text-lg text-white"
                />
                <View className="flex-1">
                  <Text className="text-sm font-bold" style={{ color: theme.text }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: theme.mutedText }} numberOfLines={1}>
                    {item.artist?.trim() || t('unknown_artist', 'Unknown Artist')}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

export default RelatedTracksModal;
