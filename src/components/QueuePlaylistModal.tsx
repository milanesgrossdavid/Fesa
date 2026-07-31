import React from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { useMusicPlayer } from '../audio/musicPlayer';
import { useAppSettings } from '../settings/appSettings';
import AudioWaveBars from './AudioWaveBars';
import LibraryArtwork from './LibraryArtwork';

interface QueuePlaylistModalProps {
  visible: boolean;
  queue: Song[];
  currentIndex: number;
  onClose: () => void;
  onSelectSong: (index: number) => void;
}

const QueuePlaylistModal = ({
  visible,
  queue,
  currentIndex,
  onClose,
  onSelectSong,
}: QueuePlaylistModalProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const { playing } = useMusicPlayer();
  const currentSong = queue[currentIndex] ?? null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View
          className="max-h-[78%] rounded-t-[32px] px-5 pt-3"
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
                Lista de reproducción
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                {currentSong ? 'Sonando ahora' : 'Cola vacía'}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Text className="font-bold" style={{ color: theme.text }}>Cerrar</Text>
            </Pressable>
          </View>

          {currentSong ? (
            <View
              className="mb-4 flex-row items-center rounded-3xl px-3 py-3"
              style={{ backgroundColor: theme.surface }}
            >
              <LibraryArtwork
                artwork={currentSong.artwork}
                className="mr-3 h-14 w-14 rounded-2xl"
                fallbackTextClassName="text-2xl font-bold text-white"
              />
              <View className="flex-1 pr-2">
                <Text className="mt-1 text-base font-bold" style={{ color: theme.text }} numberOfLines={1}>
                  {currentSong.title}
                </Text>
                <Text className="mt-0.5 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
                  {currentSong.artist?.trim() || 'Artista Desconocido'}
                </Text>
              </View>
              <AudioWaveBars playing={playing} color={theme.text} size="md" />
            </View>
          ) : null}

          <FlatList
            data={queue}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const isActive = index === currentIndex;

              return (
                <Pressable
                  className="mb-2 flex-row items-center rounded-3xl px-3 py-3"
                  style={{
                    backgroundColor: theme.surface,
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                  }}
                  onPress={() => onSelectSong(index)}
                >
                  <LibraryArtwork
                    artwork={item.artwork}
                    className="mr-3 h-12 w-12 rounded-xl"
                    fallbackTextClassName="text-xl text-white"
                  />
                  <View className="flex-1">
                    <Text
                      className="text-sm font-bold"
                      style={{ color: theme.text }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text className="mt-1 text-xs" style={{ color: theme.mutedText }} numberOfLines={1}>
                      {item.artist?.trim() || 'Artista Desconocido'}
                    </Text>
                  </View>
                  {isActive ? (
                    <AudioWaveBars playing={playing} color={theme.text} />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

export default QueuePlaylistModal;
