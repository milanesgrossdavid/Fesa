import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusicPlayerUi } from '../audio/musicPlayer';
import { getTranslation } from '../i18n/translations';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import { getGradientColors, useDominantColor, withAlpha } from '../hooks/useDominantColor';
import PlayerScreen from '../screens/PlayerScreen';
import AutoScrollingText from './AutoScrollingText';
import LibraryArtwork from './LibraryArtwork';
import QueuePlaylistModal from './QueuePlaylistModal';
import MicroPressable from './MicroPressable';

const MiniPlayer = () => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const {
    queue,
    currentIndex,
    currentSong,
    playing,
    selectionModeActive,
    showPlayerRequested,
    playSong,
    playPrevious,
    playNext,
    togglePlayPause,
    clearShowPlayerRequest,
  } = useMusicPlayerUi();
  const dominantColor = useDominantColor(currentSong?.artwork ?? null, theme.surface);
  const gradientColors = getGradientColors(dominantColor);

  useEffect(() => {
    if (!showPlayerRequested) {
      return;
    }

    setShowPlayer(true);
    clearShowPlayerRequest();
  }, [showPlayerRequested, clearShowPlayerRequest]);

  if (!currentSong || selectionModeActive) {
    return null;
  }

  return (
    <>
      <View className="absolute bottom-5 left-4 right-4 z-50" pointerEvents="box-none">
        <MicroPressable
          className="flex-row items-center rounded-[24px] border px-3 py-2.5 shadow-lg"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
          onPress={() => setShowPlayer(true)}
          accessibilityRole="button"
          accessibilityLabel={`${currentSong.title}, ${currentSong.artist || t('unknown_artist', 'Unknown Artist')}`}
          accessibilityHint={t('open_player', 'Open player')}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[
              withAlpha(gradientColors[0], 0.7),
              withAlpha(gradientColors[1], 0.48),
              withAlpha(gradientColors[2], 0.72),
            ]}
            locations={[0, 0.58, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 24,
            }}
          />
          <LibraryArtwork
            artwork={currentSong.artwork}
            className="mr-3 h-12 w-12 rounded-[14px]"
            fallbackTextClassName="text-xl text-white"
          />

          <View className="min-w-0 flex-1">
            <AutoScrollingText className="text-sm font-bold" style={{ color: '#ffffff' }}>
              {currentSong.title}
            </AutoScrollingText>
            <AutoScrollingText className="mt-0.5 text-xs font-medium" style={{ color: '#ffffff' }}>
              {currentSong.artist || t('unknown_artist', 'Unknown Artist')}
            </AutoScrollingText>
          </View>

          <View
            className="ml-2 flex-row items-center px-1"

          >
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={event => {
                event.stopPropagation();
                void playPrevious();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('previous_song', 'Previous song')}
            >
              <Ionicons name="play-skip-back" size={18} color="#ffffff" />
            </Pressable>
            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full"
              onPress={event => {
                event.stopPropagation();
                void togglePlayPause();
              }}
              accessibilityRole="button"
              accessibilityLabel={playing ? t('pause', 'Pause') : t('play', 'Play')}
            >
              <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#ffffff" />
            </Pressable>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={event => {
                event.stopPropagation();
                void playNext();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('next_song', 'Next song')}
            >
              <Ionicons name="play-skip-forward" size={18} color="#ffffff" />
            </Pressable>

            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                marginLeft: 2,
              }}
              onPress={event => {
                event.stopPropagation();
                setShowQueue(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('queue', 'Queue')}
            >
              <MaterialCommunityIcons name="playlist-music" size={20} color="#ffffff" />
            </Pressable>
          </View>
        </MicroPressable>
      </View>

      {showPlayer ? <PlayerScreen onBack={() => setShowPlayer(false)} /> : null}

      <QueuePlaylistModal
        visible={showQueue}
        queue={queue}
        currentIndex={currentIndex}
        onClose={() => setShowQueue(false)}
        onSelectSong={index => {
          void playSong(queue, index);
          setShowQueue(false);
        }}
      />
    </>
  );
};

export default MiniPlayer;
