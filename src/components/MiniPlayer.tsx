import React, { useRef, useState } from 'react';
import { Animated, Easing, FlatList, Image, Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMusicPlayer } from '../audio/musicPlayer';
import PlayerScreen from '../screens/PlayerScreen';

const MiniPlayer = () => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const queueTranslateY = useRef(new Animated.Value(1)).current;
  const {
    queue,
    currentIndex,
    currentSong,
    playing,
    playSong,
    playPrevious,
    playNext,
    togglePlayPause,
  } = useMusicPlayer();

  if (!currentSong) {
    return null;
  }

  const openQueue = () => {
    setShowQueue(true);
    queueTranslateY.setValue(1);
    Animated.timing(queueTranslateY, {
      toValue: 0,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeQueue = () => {
    Animated.timing(queueTranslateY, {
      toValue: 1,
      duration: 450,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShowQueue(false);
      }
    });
  };

  return (
    <View className="absolute bottom-5 left-4 right-4 z-50">
      <Pressable className="flex-row items-center rounded-full border border-[#333333] bg-[#252525] px-3 py-2 shadow-lg" onPress={() => setShowPlayer(true)}>
        <View className="mr-3 h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#333333]">
          {currentSong.artwork ? (
            <Image source={{ uri: currentSong.artwork }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <Text className="text-xl text-[#b64400]">♪</Text>
          )}
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-white" numberOfLines={1}>{currentSong.title}</Text>
          <Text className="mt-0.5 text-xs text-[#a0a0a0]" numberOfLines={1}>{currentSong.artist || 'Artista Desconocido'}</Text>
        </View>

        <View className="ml-2 flex-row items-center gap-1">
          <Pressable className="h-9 w-9 items-center justify-center rounded-full" onPress={event => { event.stopPropagation(); void playPrevious(); }}>
            <Ionicons name="play-skip-back" size={18} color="white" />
          </Pressable>
          <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-[#b64400]" onPress={event => { event.stopPropagation(); void togglePlayPause(); }}>
            <Ionicons name={playing ? 'pause' : 'play'} size={20} color="white" />
          </Pressable>
          <Pressable className="h-9 w-9 items-center justify-center rounded-full" onPress={event => { event.stopPropagation(); void playNext(); }}>
            <Ionicons name="play-skip-forward" size={18} color="white" />
          </Pressable>
          <Pressable className="h-9 w-9 items-center justify-center rounded-full" onPress={event => { event.stopPropagation(); openQueue(); }}>
            <MaterialCommunityIcons name="playlist-music" size={22} color="white" />
          </Pressable>
        </View>
      </Pressable>

      {showPlayer ? <PlayerScreen onBack={() => setShowPlayer(false)} /> : null}

      <Modal transparent visible={showQueue} animationType="none" presentationStyle="overFullScreen" onRequestClose={closeQueue}>
        <View className="flex-1 justify-end bg-black/70">
          <Animated.View
            className="max-h-[70%] rounded-t-3xl bg-[#1d1d1f] px-5 pb-6 pt-5"
            style={{
              transform: [
                {
                  translateY: queueTranslateY.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 500],
                  }),
                },
              ],
            }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-white">Lista de reproducción</Text>
              <Pressable onPress={closeQueue}><Text className="text-base font-bold text-[#b64400]">Cerrar</Text></Pressable>
            </View>
            <FlatList
              data={queue}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => (
                <Pressable className="mb-3 flex-row items-center rounded-2xl bg-[#252525] px-3 py-3" onPress={() => { void playSong(queue, index); closeQueue(); }}>
                  <View className="mr-3 h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#333333]">
                    {item.artwork ? <Image source={{ uri: item.artwork }} className="h-full w-full" resizeMode="cover" /> : <Text className="text-xl text-[#b64400]">♪</Text>}
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-bold ${index === currentIndex ? 'text-[#b64400]' : 'text-white'}`} numberOfLines={1}>{item.title}</Text>
                    <Text className="mt-1 text-xs text-[#a0a0a0]" numberOfLines={1}>{item.artist || 'Artista Desconocido'}</Text>
                  </View>
                </Pressable>
              )}
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default MiniPlayer;