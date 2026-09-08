import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMusicPlayerUi } from '../audio/musicPlayer';
import { getTranslation } from '../i18n/translations';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import PlayerScreen from '../screens/PlayerScreen';
import AutoScrollingText from './AutoScrollingText';
import LibraryArtwork from './LibraryArtwork';
import QueuePlaylistModal from './QueuePlaylistModal';

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
        <Pressable
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
          <LibraryArtwork
            artwork={currentSong.artwork}
            className="mr-3 h-12 w-12 rounded-[14px]"
            fallbackTextClassName="text-xl text-white"
          />

          <View className="min-w-0 flex-1">
            <AutoScrollingText className="text-sm font-bold" style={{ color: theme.text }}>
              {currentSong.title}
            </AutoScrollingText>
            <AutoScrollingText className="mt-0.5 text-xs" style={{ color: theme.mutedText }}>
              {currentSong.artist || t('unknown_artist', 'Unknown Artist')}
            </AutoScrollingText>
          </View>

          <View className="ml-2 flex-row items-center gap-1">
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={event => {
                event.stopPropagation();
                void playPrevious();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('previous_song', 'Previous song')}
            >
              <Ionicons name="play-skip-back" size={18} color={theme.text} />
            </Pressable>
            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.background }}
              onPress={event => {
                event.stopPropagation();
                void togglePlayPause();
              }}
              accessibilityRole="button"
              accessibilityLabel={playing ? t('pause', 'Pause') : t('play', 'Play')}
            >
              <Ionicons name={playing ? 'pause' : 'play'} size={20} color="#ffffff" />
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
              <Ionicons name="play-skip-forward" size={18} color={theme.text} />
            </Pressable>

            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.background }}
              onPress={event => {
                event.stopPropagation();
                setShowQueue(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('queue', 'Queue')}
            >
              <MaterialCommunityIcons name="playlist-music" size={20} color={theme.text} />
            </Pressable>
          </View>
        </Pressable>
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
