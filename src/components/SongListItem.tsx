import React, { useEffect, useRef } from 'react';
import { Animated, Easing, GestureResponderEvent, Image, Pressable, View, Text } from 'react-native';
import { Song } from '../../modules/local-music';
import { CheckIcon, DotsIcon } from '../Icons';
import { formatDuration } from '../utils/time';

interface SongListItemProps {
  item: Song;
  isActive?: boolean;
  isPlaying?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onTogglePlayPause?: () => void;
  onOpenTrackMenu?: (song: Song, event: GestureResponderEvent) => void;
  rightAction?: React.ReactNode;
  showDuration?: boolean;
  showSelectionIndicator?: boolean;
}

const SongListItem = ({ item, isActive = false, isPlaying = false, isSelected = false, onPress, onLongPress, onTogglePlayPause, onOpenTrackMenu, rightAction, showDuration = true, showSelectionIndicator = false }: SongListItemProps) => {
  const firstBarScale = useRef(new Animated.Value(0.6)).current;
  const secondBarScale = useRef(new Animated.Value(1)).current;
  const thirdBarScale = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    if (!isPlaying) {
      firstBarScale.setValue(0.6);
      secondBarScale.setValue(1);
      thirdBarScale.setValue(0.75);
      return;
    }

    const createBarAnimation = (value: Animated.Value, minScale: number, maxScale: number, delay: number) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: maxScale,
          duration: 260,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: minScale,
          duration: 260,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const animations = [
      createBarAnimation(firstBarScale, 0.55, 1.35, 0),
      createBarAnimation(secondBarScale, 0.7, 1.55, 120),
      createBarAnimation(thirdBarScale, 0.5, 1.25, 60),
    ];

    animations.forEach(animation => animation.start());

    return () => {
      animations.forEach(animation => animation.stop());
    };
  }, [firstBarScale, isPlaying, secondBarScale, thirdBarScale]);

  return (
    <Pressable
      className={`mx-4 mb-2 flex-row items-center rounded-2xl border px-3 py-3 ${isSelected ? 'border-white/40 bg-white/10' : isActive ? 'border-white/20 bg-white/5' : 'border-transparent bg-transparent'}`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      {showSelectionIndicator ? (
        <View
          className="mr-3 h-6 w-6 items-center justify-center rounded-full"
          style={{
            borderColor: isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.3)',
            borderWidth: isSelected ? 0 : 1,
          }}
        >
          {isSelected ? <CheckIcon size={22} color="#f5f5f5" /> : null}
        </View>
      ) : null}
      <Pressable
        className={`mr-4 h-12 w-12 items-center justify-center overflow-hidden rounded-2xl ${isActive ? 'bg-white/20' : 'bg-[#333333]'}`}
        onPress={isActive ? onTogglePlayPause : onPress}
      >
        {item.artwork ? (
          <Image source={{ uri: item.artwork }} className="h-full w-full rounded-lg" resizeMode="cover" />
        ) : (
          <Text className={`text-2xl ${isActive ? 'text-white' : 'text-[#707070]'}`}>♪</Text>
        )}

      </Pressable>
      <View className="flex-1 pr-3">
        <Text className={`mb-1 text-base ${isActive ? 'font-extrabold text-white' : 'font-semibold text-white/90'}`} numberOfLines={1}>{item.title}</Text>
        <Text className="text-sm text-white/45" numberOfLines={1}>
          {item.artist || 'Artista Desconocido'} • {item.album || 'Álbum Desconocido'}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        {showDuration ? (
          <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-white/45'}`}>{formatDuration(item.duration)}</Text>
        ) : null}
        {isPlaying ? (
          <View className="h-6 flex-row items-center gap-1" pointerEvents="none">
            <Animated.View className="h-3 w-1 rounded-full bg-white" style={{ transform: [{ scaleY: firstBarScale }] }} />
            <Animated.View className="h-4 w-1 rounded-full bg-white" style={{ transform: [{ scaleY: secondBarScale }] }} />
            <Animated.View className="h-3 w-1 rounded-full bg-white" style={{ transform: [{ scaleY: thirdBarScale }] }} />
          </View>
        ) : null}
        {rightAction ?? (onOpenTrackMenu ? (
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={8}
            onPress={event => {
              event.stopPropagation();
              onOpenTrackMenu(item, event);
            }}
          >
            <DotsIcon size={22} color="#ffffff" />
          </Pressable>
        ) : null)}
      </View>
    </Pressable>
  );
};

export default SongListItem;