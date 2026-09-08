import React from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  ListRenderItem,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { getTranslation } from '../i18n/translations';
import { BackIcon, PlayIcon } from '../Icons';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import { MINI_PLAYER_BOTTOM_INSET } from '../utils/layout';
import LibraryArtwork from './LibraryArtwork';

export type LibraryGroupDetailData = {
  id: string;
  name: string;
  subtitle: string;
  songs: Song[];
  artwork?: string | null;
};

export type LibraryGroupDetailVariant = 'album' | 'artist' | 'folder' | 'playlist';

interface LibraryGroupDetailModalProps {
  visible: boolean;
  group: LibraryGroupDetailData | null;
  translateY: Animated.Value;
  variant?: LibraryGroupDetailVariant;
  contentBottomPadding?: number;
  onClose: () => void;
  onPlayAll?: () => void;
  renderItem: ListRenderItem<Song>;
  headerExtra?: React.ReactNode;
  children?: React.ReactNode;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const LibraryGroupDetailModal = ({
  visible,
  group,
  translateY,
  variant = 'album',
  contentBottomPadding = MINI_PLAYER_BOTTOM_INSET,
  onClose,
  onPlayAll,
  renderItem,
  headerExtra,
  children,
}: LibraryGroupDetailModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const isArtist = variant === 'artist';
  const songCount = group?.songs.length ?? 0;
  const songCountLabel = `${songCount} ${songCount === 1 ? t('song_count_one', 'song') : t('song_count_many', 'songs')}`;

  return (
    <Modal
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Animated.View
        className="flex-1"
        style={{
          backgroundColor: theme.background,
          transform: [
            {
              translateY: translateY.interpolate({
                inputRange: [0, 1],
                outputRange: [0, SCREEN_HEIGHT],
              }),
            },
          ],
        }}
      >
        {group ? (
          <FlatList
            className="flex-1"
            style={{ backgroundColor: theme.background }}
            data={group.songs}
            keyExtractor={item => item.id}
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews
            ListHeaderComponent={
              <View style={{ paddingTop: Math.max(insets.top, 12) }}>
                <View className="mb-3 items-center px-5 pt-1">
                  <View className="h-1 w-10 rounded-full bg-white/20" />
                </View>

                <View className="mb-4 flex-row items-center justify-between px-4">
                  <Pressable
                    className="h-11 w-11 items-center justify-center rounded-xl border"
                    style={{ backgroundColor:theme.surface, borderColor: theme.border}}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel={t('close', 'Close')}
                  >
                    <BackIcon size={22} color={theme.text} />
                  </Pressable>

                  {onPlayAll && songCount > 0 ? (
                    <Pressable
                      className="flex-row items-center gap-2 rounded-xl border px-4 py-3"
                      style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                      onPress={onPlayAll}
                      accessibilityRole="button"
                      accessibilityLabel={t('play_all', 'Play all')}
                    >
                      <PlayIcon size={16} color={theme.text} />
                      <Text className="text-sm font-bold" style={{ color: theme.text }}>
                        {t('play', 'Play')}
                      </Text>
                    </Pressable>
                  ) : (
                    <View className="h-10 w-10" />
                  )}
                </View>

                <View className="mb-5 items-center px-5">
                  <View
                    className="rounded-3xl p-1"
                  >
                    <LibraryArtwork
                    artwork={group.artwork}
                    fallback={isArtist ? group.name.charAt(0).toUpperCase() : '♪'}
                    className={`h-44 w-44 ${isArtist ? 'rounded-full' : 'rounded-[28px]'}`}
                    fallbackTextClassName={
                      isArtist
                        ? 'text-6xl font-bold text-white'
                        : 'text-5xl font-bold text-white'
                    }
                    />
                  </View>

                  <Text
                    className="mt-5 text-center text-2xl font-bold"
                    style={{ color: theme.text }}
                    numberOfLines={2}
                  >
                    {group.name}
                  </Text>
                  {variant !== 'playlist' ? (
                    <Text className="mt-2 text-center text-sm" style={{ color: theme.mutedText }}>
                      {songCountLabel}
                    </Text>
                  ) : null}
                </View>

                {headerExtra}

              </View>
            }
            contentContainerStyle={{ paddingBottom: contentBottomPadding + insets.bottom }}
            renderItem={renderItem}
          />
        ) : null}

        {children}
      </Animated.View>
    </Modal>
  );
};

export default LibraryGroupDetailModal;
