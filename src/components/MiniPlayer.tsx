import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMusicPlayer } from '../audio/musicPlayer';
import { useAppSettings } from '../settings/appSettings';
import PlayerScreen from '../screens/PlayerScreen';
import AutoScrollingText from './AutoScrollingText';
import LibraryArtwork from './LibraryArtwork';
import QueuePlaylistModal from './QueuePlaylistModal';

const MiniPlayer = () => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const { theme } = useAppSettings();
  const {
    queue,
    currentIndex,
    currentSong,
    playing,
    selectionModeActive,
    playSong,
    playPrevious,
    playNext,
    togglePlayPause,
    showPlayerRequested,
    clearShowPlayerRequest,
  } = useMusicPlayer();

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
          className="flex-row items-center rounded-2xl border px-3 py-2 shadow-lg"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
          onPress={() => setShowPlayer(true)}
        >
          <LibraryArtwork
            artwork={currentSong.artwork}
            className="mr-3 h-12 w-12 rounded-2xl"
            fallbackTextClassName="text-xl text-white"
          />

          <View className="min-w-0 flex-1">
            <AutoScrollingText
              className="text-sm font-bold"
              style={{ color: theme.text }}
            >
              {currentSong.title}
            </AutoScrollingText>
            <AutoScrollingText
              className="mt-0.5 text-xs"
              style={{ color: theme.mutedText }}
            >
              {currentSong.artist || 'Artista Desconocido'}
            </AutoScrollingText>
          </View>

          <View className="ml-2 flex-row items-center gap-2">
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full"
              onPress={event => {
                event.stopPropagation();
                void playPrevious();
              }}
            >
              <Ionicons name="play-skip-back" size={18} color={theme.text} />
            </Pressable>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.background }}
              onPress={event => {
                event.stopPropagation();
                void togglePlayPause();
              }}
            >
              <Ionicons name={playing ? 'pause' : 'play'} size={20} color={theme.text} />
            </Pressable>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full"
              onPress={event => {
                event.stopPropagation();
                void playNext();
              }}
            >
              <Ionicons name="play-skip-forward" size={18} color={theme.text} />
            </Pressable>

            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.background }}
              onPress={event => {
                event.stopPropagation();
                setShowQueue(true);
              }}
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
