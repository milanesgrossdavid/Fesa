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
import { BackIcon, PlayIcon } from '../Icons';
import { useAppSettings } from '../settings/appSettings';
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
  const { theme } = useAppSettings();
  const isArtist = variant === 'artist';
  const songCount = group?.songs.length ?? 0;

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
            ListHeaderComponent={
              <View style={{ paddingTop: Math.max(insets.top, 12) }}>
                <View className="mb-2 items-center px-5 pt-1">
                  <View className="h-1 w-10 rounded-full bg-white/20" />
                </View>

                <View className="mb-4 flex-row items-center justify-between px-4">
                  <Pressable
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.surface }}
                    onPress={onClose}
                  >
                    <BackIcon size={22} color={theme.text} />
                  </Pressable>

                  {onPlayAll && songCount > 0 ? (
                    <Pressable
                      className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
                      style={{ backgroundColor: theme.text }}
                      onPress={onPlayAll}
                    >
                      <PlayIcon size={16} color={theme.background} />
                      <Text className="text-sm font-bold" style={{ color: theme.background }}>
                        Reproducir
                      </Text>
                    </Pressable>
                  ) : (
                    <View className="h-10 w-10" />
                  )}
                </View>

                <View className="mb-5 items-center px-5">
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

                  <Text
                    className="mt-5 text-center text-2xl font-bold"
                    style={{ color: theme.text }}
                    numberOfLines={2}
                  >
                    {group.name}
                  </Text>
                  {variant !== 'playlist' ? (
                    <Text className="mt-1 text-center text-xs font-bold uppercase tracking-[1.2px]" style={{ color: theme.mutedText }}>
                      {songCount} {songCount === 1 ? 'canción' : 'canciones'}
                    </Text>
                  ) : null}
                </View>

                {headerExtra}

                <View className="mx-5 mb-3 h-px" style={{ backgroundColor: theme.border }} />
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
