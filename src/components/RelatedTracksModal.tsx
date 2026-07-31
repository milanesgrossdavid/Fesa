import React from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { PlayIcon } from '../Icons';
import { useAppSettings } from '../settings/appSettings';
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
  const { theme } = useAppSettings();
  const isArtist = variant === 'artist';

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View
          className="max-h-[82%] rounded-t-[32px] px-5 pt-3"
          style={{
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
        >
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full bg-white/20" />
          </View>

          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xl font-bold" style={{ color: theme.text }}>
                {isArtist ? 'Artista' : 'Álbum'}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                {songs.length} {songs.length === 1 ? 'canción' : 'canciones'}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Text className="font-bold" style={{ color: theme.text }}>Cerrar</Text>
            </Pressable>
          </View>

          <View className="mb-4 items-center">
            <LibraryArtwork
              artwork={artwork ?? songs[0]?.artwork}
              fallback={isArtist ? title.charAt(0).toUpperCase() : '♪'}
              className={`h-36 w-36 ${isArtist ? 'rounded-full' : 'rounded-[28px]'}`}
              fallbackTextClassName="text-5xl font-bold text-white"
            />
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
                style={{ backgroundColor: theme.text }}
                onPress={onPlayAll}
              >
                <PlayIcon size={16} color={theme.background} />
                <Text className="font-bold" style={{ color: theme.background }}>
                  Reproducir todo
                </Text>
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={songs}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Pressable
                className="mb-2 flex-row items-center rounded-3xl px-3 py-3"
                style={{ backgroundColor: theme.surface }}
                onPress={() => onSelectSong(index)}
              >
                <LibraryArtwork
                  artwork={item.artwork}
                  className="mr-3 h-11 w-11 rounded-xl"
                  fallbackTextClassName="text-lg text-white"
                />
                <View className="flex-1">
                  <Text className="text-sm font-bold" style={{ color: theme.text }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: theme.mutedText }} numberOfLines={1}>
                    {item.artist?.trim() || 'Artista Desconocido'}
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
