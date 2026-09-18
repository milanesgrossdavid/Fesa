import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Song } from '../../modules/local-music';
import { useMusicPlayerUi } from '../audio/musicPlayer';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import { getTranslation } from '../i18n/translations';
import { formatSongDuration } from '../utils/time';
import { DragHandleIcon } from '../Icons';
import { getGradientColors, useDominantColor, withAlpha } from '../hooks/useDominantColor';
import AudioWaveBars from './AudioWaveBars';
import LibraryArtwork from './LibraryArtwork';

interface QueuePlaylistModalProps {
  visible: boolean;
  queue: Song[];
  currentIndex: number;
  onClose: () => void;
  onSelectSong: (index: number) => void;
}

const ITEM_HEIGHT = 74;

interface QueuePlaylistItemProps {
  item: Song;
  index: number;
  currentIndex: number;
  playing: boolean;
  isDragging: boolean;
  shift: number;
  shiftKey: string;
  panY: Animated.Value;
  shiftAnims: Map<string, Animated.Value>;
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  theme: {
    surface: string;
    border: string;
    text: string;
    mutedText: string;
    accent: string;
  };
  noTitleLabel: string;
  unknownArtistLabel: string;
  currentlyPlayingLabel: string;
  playSongLabel: string;
  reorderSongLabel: string;
  reorderHint: string;
  onSelectSong: (index: number) => void;
  beginDrag: (index: number, pageY: number) => void;
}






function areItemPropsEqual(prev: QueuePlaylistItemProps, next: QueuePlaylistItemProps): boolean {
  return (
    prev.item === next.item &&
    prev.index === next.index &&
    prev.currentIndex === next.currentIndex &&
    prev.playing === next.playing &&
    prev.isDragging === next.isDragging &&
    prev.shift === next.shift &&
    prev.shiftKey === next.shiftKey &&
    prev.panY === next.panY &&
    prev.shiftAnims === next.shiftAnims &&
    prev.panHandlers === next.panHandlers &&
    prev.noTitleLabel === next.noTitleLabel &&
    prev.unknownArtistLabel === next.unknownArtistLabel &&
    prev.currentlyPlayingLabel === next.currentlyPlayingLabel &&
    prev.playSongLabel === next.playSongLabel &&
    prev.reorderSongLabel === next.reorderSongLabel &&
    prev.reorderHint === next.reorderHint &&
    prev.onSelectSong === next.onSelectSong &&
    prev.beginDrag === next.beginDrag &&
    prev.theme.surface === next.theme.surface &&
    prev.theme.border === next.theme.border &&
    prev.theme.text === next.theme.text &&
    prev.theme.mutedText === next.theme.mutedText &&
    prev.theme.accent === next.theme.accent
  );
}



const QueuePlaylistModal = ({
  visible,
  queue,
  currentIndex,
  onClose,
  onSelectSong,
}: QueuePlaylistModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const { playing, currentSong, moveQueueSong } = useMusicPlayerUi();
  const dominantColor = useDominantColor(currentSong?.artwork ?? null, theme.background);
  const gradientColors = useMemo(() => getGradientColors(dominantColor), [dominantColor]);

  const scrollViewRef = useRef<ScrollView>(null);
  const listContainerRef = useRef<View>(null);
  const listTopY = useRef(0);
  const listHeight = useRef(0);
  const scrollOffset = useRef(0);
  const dragStartRef = useRef<{ index: number; pageY: number; scrollY: number } | null>(null);
  const pointerYRef = useRef(0);
  const hoverIndexRef = useRef<number | null>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const panY = useRef(new Animated.Value(0)).current;
  const shiftAnims = useRef(new Map<string, Animated.Value>()).current;

  const [dragState, setDragState] = useState<{ from: number; to: number } | null>(null);
  const onSelectSongRef = useRef(onSelectSong);
  onSelectSongRef.current = onSelectSong;
  const handleSelectSong = useCallback((index: number) => {
    onSelectSongRef.current(index);
  }, []);

  const clearAutoScroll = useCallback(() => {
    if (autoScrollTimer.current === null) return;
    clearInterval(autoScrollTimer.current);
    autoScrollTimer.current = null;
  }, []);

  useEffect(() => {
    return () => clearAutoScroll();
  }, [clearAutoScroll]);

  useEffect(() => {
    if (visible) return;
    clearAutoScroll();
    dragStartRef.current = null;
    hoverIndexRef.current = null;
    setDragState(null);
    panY.setValue(0);
  }, [visible, clearAutoScroll, panY]);

  const getShift = useCallback((key: string) => {
    let value = shiftAnims.get(key);
    if (!value) {
      value = new Animated.Value(0);
      shiftAnims.set(key, value);
    }
    return value;
  }, [shiftAnims]);

  const updateHover = useCallback((pointerY: number) => {
    const drag = dragStartRef.current;
    if (!drag || queue.length === 0) return;
    const delta = pointerY - drag.pageY + scrollOffset.current - drag.scrollY;
    const target = Math.max(0, Math.min(queue.length - 1, Math.round(drag.index + delta / ITEM_HEIGHT)));
    if (target === hoverIndexRef.current) return;
    hoverIndexRef.current = target;
    setDragState({ from: drag.index, to: target });
  }, [queue.length]);

  const finishDrag = useCallback(() => {
    const drag = dragStartRef.current;
    const target = hoverIndexRef.current;
    dragStartRef.current = null;
    hoverIndexRef.current = null;
    clearAutoScroll();
    setDragState(null);
    panY.setValue(0);
    if (drag && target !== null && drag.index !== target) {
      moveQueueSong(drag.index, target);
    }
  }, [clearAutoScroll, moveQueueSong, panY]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: (_event, gesture) =>
      dragStartRef.current !== null && Math.abs(gesture.dy) > 2,
    onMoveShouldSetPanResponderCapture: (_event, gesture) =>
      dragStartRef.current !== null && Math.abs(gesture.dy) > 2,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      panY.setValue(0);
      clearAutoScroll();
      autoScrollTimer.current = setInterval(() => {
        const pointer = pointerYRef.current;
        const top = listTopY.current;
        const bottom = top + listHeight.current;
        const edge = 96;
        const distance = pointer < top + edge
          ? pointer - (top + edge)
          : pointer > bottom - edge
            ? pointer - (bottom - edge)
            : 0;
        if (distance === 0) return;
        const nextOffset = Math.max(0, scrollOffset.current + Math.sign(distance) * Math.min(24, Math.max(4, Math.abs(distance) / 3)));
        scrollOffset.current = nextOffset;
        scrollViewRef.current?.scrollTo({ y: nextOffset, animated: false });
        updateHover(pointer);
      }, 16);
    },
    onPanResponderMove: (event, gesture) => {
      pointerYRef.current = event.nativeEvent.pageY;
      const drag = dragStartRef.current;
      if (!drag) return;
      panY.setValue(gesture.dy + scrollOffset.current - drag.scrollY);
      updateHover(pointerYRef.current);
    },
    onPanResponderRelease: finishDrag,
    onPanResponderTerminate: finishDrag,
  }), [clearAutoScroll, finishDrag, panY, updateHover]);

  const beginDragOnIndex = useCallback((index: number, pageY: number) => {
    dragStartRef.current = { index, pageY, scrollY: scrollOffset.current };
    pointerYRef.current = pageY;
    hoverIndexRef.current = index;
    panY.setValue(0);
    setDragState({ from: index, to: index });
  }, [panY]);

  const scrollToCurrentSong = useCallback(() => {
    if (
      !visible ||
      currentIndex < 0 ||
      currentIndex >= queue.length ||
      listHeight.current <= 0
    ) {
      return;
    }

    const currentItemCenter = currentIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2;
    const centeredOffset = currentItemCenter - listHeight.current / 2;

    scrollViewRef.current?.scrollTo({
      y: Math.max(0, centeredOffset),
      animated: false,
    });
  }, [currentIndex, queue.length, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToCurrentSong);
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollToCurrentSong, visible]);

  useEffect(() => {
    if (!dragState) {
      return;
    }
    queue.forEach((item, index) => {
      const shift = dragState.from < dragState.to
        ? index > dragState.from && index <= dragState.to ? -1 : 0
        : index >= dragState.to && index < dragState.from ? 1 : 0;
      Animated.timing(getShift(`${item.id}-${index}`), {
        toValue: shift * ITEM_HEIGHT,
        useNativeDriver: true,
        duration: 70,
      }).start();
    });
  }, [dragState, getShift, queue]);

  const queueCountLabel = `${queue.length} ${queue.length === 1 ? t('song_count_one', 'song') : t('song_count_many', 'songs')}`;
  const noTitleLabel = t('player_no_title', 'Untitled');
  const unknownArtistLabel = t('player_unknown_artist', 'Unknown artist');
  const currentlyPlayingLabel = t('currently_playing', 'Currently playing');
  const playSongLabel = t('play_song', 'Play this song');
  const reorderSongLabel = t('reorder_song', 'Reorder song');
  const reorderHint = t('queue_reorder_hint', 'Drag to change the song order');

  const QueuePlaylistItem = useMemo(() => React.memo(function QueuePlaylistItem({
    item,
    index,
    currentIndex,
    playing,
    isDragging,
    shift,
    shiftKey,
    panY,
    shiftAnims,
    panHandlers,
    theme,
    noTitleLabel,
    unknownArtistLabel,
    currentlyPlayingLabel,
    playSongLabel,
    reorderSongLabel,
    reorderHint,
    onSelectSong,
    beginDrag,
  }: QueuePlaylistItemProps) {
  const isActive = index === currentIndex;

  let translateY: Animated.Value | number;
  let opacity = 1;
  let zIndex = 1;
  if (isDragging) {
    translateY = panY;
    zIndex = 999;
  } else if (shift !== 0) {
    translateY = shiftAnims.get(shiftKey) ?? 0;
  } else {
    translateY = 0;
  }

  return (
    <Animated.View
      style={{
        height: ITEM_HEIGHT,
        zIndex,
        opacity,
        transform: [{ translateY: translateY as Animated.AnimatedInterpolation<number> | number }],
      }}
    >
      <Pressable
        className="mx-1 mb-2 flex-row items-center rounded-[26px] px-3 py-2.5"
        style={{
          backgroundColor: isActive
            ? withAlpha(theme.surface, 0.16)
            : 'transparent',
          borderColor: isActive ? withAlpha(theme.accent, 0.7) : withAlpha(theme.border, 0.72),
          shadowColor: '#000',
          shadowOpacity: isActive ? 0.16 : 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
        }}
        onPress={() => {
          if (!isDragging) onSelectSong(index);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${item.title || noTitleLabel}, ${
          item.artist?.trim() || unknownArtistLabel
        }`}
        accessibilityHint={isActive ? currentlyPlayingLabel : playSongLabel}
        accessibilityState={{ selected: isActive }}
      >
        

        <View
          className="mr-2 h-12 w-10 items-center justify-center rounded-xl"
          hitSlop={{ left: 10, right: 10, top: 10, bottom: 10 }}
          {...panHandlers}
          onTouchStart={event => beginDrag(index, event.nativeEvent.pageY)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${reorderSongLabel} ${item.title || noTitleLabel}`}
          accessibilityHint={reorderHint}
        >
          <DragHandleIcon size={22} color={theme.text} />
        </View>

        <LibraryArtwork
          artwork={item.artwork}
          className="mr-3 h-12 w-12 rounded-2xl"
          fallbackTextClassName="text-xl text-white"
        />
        <View className="flex-1 pr-2">
          <Text className="text-sm font-bold" style={{ color: theme.text }} numberOfLines={1}>
            {item.title || noTitleLabel}
          </Text>
          <Text className="mt-1 font-medium text-xs" style={{ color: theme.text }} numberOfLines={1}>
            {item.artist?.trim() || unknownArtistLabel}
          </Text>
        </View>
        {isActive ? (
          <View className="flex-row items-center gap-2">
            <View
              style={{ opacity: playing ? 1 : 0.72 }}
              className="mb-2 items-center justify-center rounded-full px-2 py-2"
            >
              <AudioWaveBars playing={playing} color={theme.text} />
            </View>
          </View>
        ) : null}
        <View className=" min-w-[30px] items-end">
          <Text className="text-xs font-medium" style={{ color: theme.text }}>
            {formatSongDuration(item.duration)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}, areItemPropsEqual), [gradientColors]);

  const renderItem = useCallback(
    ({ item, index }: { item: Song; index: number }) => {
      const isDragging = dragState?.from === index;
      const shift = !dragState || index === dragState.from
        ? 0
        : dragState.from < dragState.to && index > dragState.from && index <= dragState.to
          ? -1
          : dragState.from > dragState.to && index >= dragState.to && index < dragState.from
            ? 1
            : 0;

      return (
        <QueuePlaylistItem
          item={item}
          index={index}
          currentIndex={currentIndex}
          playing={playing}
          isDragging={Boolean(isDragging)}
          shift={shift}
          shiftKey={`${item.id}-${index}`}
          panY={panY}
          shiftAnims={shiftAnims}
          panHandlers={panResponder.panHandlers}
          theme={theme}
          noTitleLabel={noTitleLabel}
          unknownArtistLabel={unknownArtistLabel}
          currentlyPlayingLabel={currentlyPlayingLabel}
          playSongLabel={playSongLabel}
          reorderSongLabel={reorderSongLabel}
          reorderHint={reorderHint}
          onSelectSong={handleSelectSong}
          beginDrag={beginDragOnIndex}
        />
      );
    },
    [
      beginDragOnIndex,
      currentIndex,
      dragState,
      handleSelectSong,
      noTitleLabel,
      unknownArtistLabel,
      currentlyPlayingLabel,
      playSongLabel,
      reorderSongLabel,
      reorderHint,
      panResponder.panHandlers,
      panY,
      playing,
      shiftAnims,
      theme,
    ],
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/70"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('cancel', 'Cancel')}
        />
        <View
          className="max-h-[88%] rounded-t-[28px] px-4 pt-2"
          style={{
            backgroundColor: withAlpha(theme.background, 0.92),
            paddingBottom: Math.max(insets.bottom, 16),
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: -8 },
            elevation: 18,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[
              withAlpha(gradientColors[0], 0.72),
              withAlpha(gradientColors[1], 0.42),
              withAlpha(gradientColors[2], 0.9),
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
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            }}
          />
          <View className="mb-2 items-center py-1">
            <View
              className="h-[5px] w-10 rounded-full"
              style={{ backgroundColor: `${theme.mutedText}55` }}
            />
          </View>

          <View className="mb-4 min-h-[52px] flex-row items-center justify-between px-1">
            <View className="flex-1 flex-row items-center pr-3">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-[12px]" >
                <Ionicons name="list-outline" size={19} color={theme.text} />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold tracking-[-0.4px]" style={{ color: theme.text }}>
                  {t('player_queue_title', 'Queue')}
                </Text>
              </View>
            </View>
            <View
              className="mr-2 rounded-full px-3 py-1.5"

            >
              <Text className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: theme.text }}>
                {queueCountLabel}
              </Text>
            </View>

            <Pressable
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: withAlpha(theme.surface, 0.16) }}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('close', 'Close')}

            >

              <Ionicons name="close" size={18} color={theme.text} />
            </Pressable>
          </View>

          <View
            className="overflow-hidden py-2"
            ref={listContainerRef}
            onLayout={(e) => {
              listHeight.current = e.nativeEvent.layout.height;
              listContainerRef.current?.measureInWindow((_x, y) => {
                listTopY.current = y;
              });
              requestAnimationFrame(scrollToCurrentSong);
            }}
          >
            <ScrollView
              ref={scrollViewRef}
              scrollEnabled={!dragState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 62 }}
              scrollEventThrottle={16}
              onContentSizeChange={scrollToCurrentSong}
              onScroll={(e) => {
                scrollOffset.current = e.nativeEvent.contentOffset.y;
              }}
            >

              {queue.map((item, index) => (
                <React.Fragment key={`${item.id}-${index}`}>

                  {renderItem({ item, index })}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default QueuePlaylistModal;
