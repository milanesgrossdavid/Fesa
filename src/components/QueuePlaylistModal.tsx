import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { useMusicPlayer } from '../audio/musicPlayer';
import { useAppSettings } from '../settings/appSettings';
import { DragHandleIcon } from '../Icons';
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

const QueuePlaylistModal = ({
  visible,
  queue,
  currentIndex,
  onClose,
  onSelectSong,
}: QueuePlaylistModalProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const { playing, moveQueueSong } = useMusicPlayer();

  const flatListRef = useRef<FlatList>(null);
  const listContainerRef = useRef<View>(null);
  const listTopY = useRef<number>(0);
  const listHeight = useRef<number>(0);
  const scrollOffset = useRef<number>(0);

  const dragStartIndex = useRef<number | null>(null);
  const dragStartPageY = useRef<number>(0);
  const lastHoverRef = useRef<number>(0);
  const lastPointerY = useRef<number>(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const panY = useRef(new Animated.Value(0)).current;

  const [dragActive, setDragActive] = useState(false);
  const [dragStartIndexState, setDragStartIndexState] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const clearAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearAutoScroll();
  }, [clearAutoScroll]);

  useEffect(() => {
    if (!visible) {
      clearAutoScroll();
      dragStartIndex.current = null;
      dragStartPageY.current = 0;
      lastHoverRef.current = 0;
      setDragActive(false);
      setDragStartIndexState(null);
      setHoverIndex(null);
      panY.setValue(0);
    }
  }, [visible, clearAutoScroll, panY]);

  // Calcula el nuevo índice objetivo:
  // 1. Usa delta Y RELATIVO al inicio del drag (evita desviaciones)
  // 2. Fuerza que SOLO pueda cambiar ±1 respecto al último hover aceptado (sin saltos)
  const stepIndex = useCallback((deltaY: number, fromIdx: number, len: number): number => {
    const targetFloat = fromIdx + deltaY / ITEM_HEIGHT;
    const ideal = Math.round(targetFloat);
    const clampedIdeal = Math.max(0, Math.min(len - 1, ideal));
    const prev = lastHoverRef.current;
    if (clampedIdeal > prev + 1) return prev + 1;
    if (clampedIdeal < prev - 1) return prev - 1;
    return clampedIdeal;
  }, []);

  const commitReorder = useCallback(() => {
    const from = dragStartIndex.current;
    const to = hoverIndex;
    dragStartIndex.current = null;
    dragStartPageY.current = 0;
    setDragActive(false);
    setDragStartIndexState(null);
    setHoverIndex(null);
    panY.setValue(0);
    clearAutoScroll();
    if (from !== null && to !== null && from !== to) {
      moveQueueSong(from, to);
    }
  }, [clearAutoScroll, moveQueueSong, panY, hoverIndex]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_e, gs) => {
          if (dragStartIndex.current === null) return false;
          return Math.abs(gs.dy) > 3;
        },
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,

        onPanResponderGrant: () => {
          const idx = dragStartIndex.current;
          if (idx === null) return;
          lastHoverRef.current = idx;
          panY.setValue(0);
          clearAutoScroll();
          autoScrollTimer.current = setInterval(() => {
            const pointerY = lastPointerY.current;
            if (!pointerY) return;
            const top = listTopY.current;
            const bottom = top + (listHeight.current || 400);
            const margin = 110;
            let scrollStep = 0;
            if (pointerY < top + margin) {
              scrollStep = -Math.max(3, (top + margin - pointerY) / 4);
            } else if (pointerY > bottom - margin) {
              scrollStep = Math.max(3, (pointerY - (bottom - margin)) / 4);
            }
            if (scrollStep !== 0) {
              const nextOff = Math.max(0, scrollOffset.current + scrollStep);
              flatListRef.current?.scrollToOffset({ offset: nextOff, animated: false });
              const fromIdx = dragStartIndex.current;
              if (fromIdx !== null) {
                // Al hacer autoscroll, el hover avanza +/- 1 por tick sin
                // salirse del clamp de stepIndex.
                const prev = lastHoverRef.current;
                let stepped = prev;
                if (scrollStep < 0 && prev > 0) stepped = prev - 1;
                else if (scrollStep > 0 && prev < queue.length - 1) stepped = prev + 1;
                if (stepped !== prev) {
                  lastHoverRef.current = stepped;
                  setHoverIndex(stepped);
                }
              }
            }
          }, 40);
        },
        onPanResponderMove: (evt, gs) => {
          const fromIdx = dragStartIndex.current;
          if (fromIdx === null) return;
          const y = evt.nativeEvent.pageY;
          lastPointerY.current = y;
          panY.setValue(gs.dy);
          const deltaFromStart = y - dragStartPageY.current;
          const nextIdx = stepIndex(deltaFromStart, fromIdx, queue.length);
          if (nextIdx !== lastHoverRef.current) {
            lastHoverRef.current = nextIdx;
            setHoverIndex(nextIdx);
          }
        },
        onPanResponderRelease: () => {
          commitReorder();
        },
        onPanResponderTerminate: () => {
          commitReorder();
        },
      }),
    [commitReorder, stepIndex, clearAutoScroll, panY, queue.length]
  );

  const beginDragOnIndex = useCallback((index: number, pageY: number) => {
    dragStartIndex.current = index;
    dragStartPageY.current = pageY;
    lastPointerY.current = pageY;
    lastHoverRef.current = index;
    setDragActive(true);
    setDragStartIndexState(index);
    setHoverIndex(index);
  }, []);

  // Reemplaza el Animated.Value (shift) estático por springs animados por cada índice.
  // Usamos un Map mutable ref porque FlatList recicla filas y los Animated.Values
  // viven según el dato/índice actual.
  const shiftAnims = useRef<Map<string, Animated.Value>>(new Map()).current;

  const getShiftAnim = useCallback(
    (key: string): Animated.Value => {
      let anim = shiftAnims.get(key);
      if (!anim) {
        anim = new Animated.Value(0);
        shiftAnims.set(key, anim);
      }
      return anim;
    },
    [shiftAnims]
  );

  const scrollToCurrentSong = useCallback(() => {
    if (!visible || currentIndex < 0 || currentIndex >= queue.length) {
      return;
    }

    flatListRef.current?.scrollToOffset({
      offset: Math.max(0, currentIndex * ITEM_HEIGHT - ITEM_HEIGHT * 2),
      animated: false,
    });
  }, [currentIndex, queue.length, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const frame = requestAnimationFrame(scrollToCurrentSong);
    return () => cancelAnimationFrame(frame);
  }, [scrollToCurrentSong, visible]);

  useEffect(() => {
    queue.forEach(item => {
      getShiftAnim(item.id);
    });
  }, [getShiftAnim, queue]);

  useEffect(() => {
    if (!dragActive || dragStartIndexState === null || hoverIndex === null) {
      return;
    }

    queue.forEach((item, index) => {
      let shift = 0;
      if (index !== dragStartIndexState) {
        if (dragStartIndexState < hoverIndex && index > dragStartIndexState && index <= hoverIndex) {
          shift = -1;
        } else if (
          dragStartIndexState > hoverIndex &&
          index >= hoverIndex &&
          index < dragStartIndexState
        ) {
          shift = 1;
        }
      }

      Animated.spring(getShiftAnim(item.id), {
        toValue: shift * ITEM_HEIGHT,
        useNativeDriver: true,
        stiffness: 360,
        damping: 30,
        mass: 0.9,
        overshootClamping: false,
      }).start();
    });
  }, [dragActive, dragStartIndexState, getShiftAnim, hoverIndex, queue]);

  useEffect(() => {
    if (!dragActive) {
      shiftAnims.clear();
    }
  }, [dragActive, shiftAnims]);

  const renderItem = ({ item, index }: { item: Song; index: number }) => {
    const isActive = index === currentIndex;
    const isDragging = dragActive && dragStartIndexState === index;
    const from = dragStartIndexState;
    const to = hoverIndex;

    let shift = 0;
    let isHiddenGhost = false;
    if (dragActive && from !== null && to !== null) {
      if (index === from) {
        isHiddenGhost = true;
      } else if (from < to) {
        if (index > from && index <= to) shift = -1;
      } else if (from > to) {
        if (index >= to && index < from) shift = 1;
      }
    }

    let translateY: Animated.Value | number;
    let opacity = 1;
    let zIndex = 1;
    if (isDragging) {
      translateY = panY;
      opacity = 1;
      zIndex = 999;
    } else if (shift !== 0 && dragActive) {
      translateY = shiftAnims.get(item.id) ?? 0;
    } else if (isHiddenGhost) {
      translateY = 0;
      opacity = 0.0001;
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
          className="mb-2 flex-row items-center rounded-3xl px-3 py-3"
          style={{
            backgroundColor: isDragging
              ? theme.accent + '33'
              : theme.surface,
            borderWidth: isActive ? 1 : 0,
            borderColor: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
            shadowColor: isDragging ? '#000' : 'transparent',
            shadowOpacity: isDragging ? 0.3 : 0,
            shadowRadius: isDragging ? 14 : 0,
            shadowOffset: { width: 0, height: isDragging ? 6 : 0 },
            elevation: isDragging ? 10 : 0,
          }}
          onPress={() => {
            if (dragActive) return;
            onSelectSong(index);
          }}
        >
          <View
            className="mr-1 h-12 w-8 items-center justify-center"
            hitSlop={{ left: 10, right: 10, top: 10, bottom: 10 }}
            {...panResponder.panHandlers}
            onTouchStart={(e) => {
              beginDragOnIndex(index, e.nativeEvent.pageY);
            }}
          >
            <DragHandleIcon size={22} color={theme.mutedText} />
          </View>

          <LibraryArtwork
            artwork={item.artwork}
            className="mr-3 h-12 w-12 rounded-xl"
            fallbackTextClassName="text-xl text-white"
          />
          <View className="flex-1 pr-2">
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
      </Animated.View>
    );
  };

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
              <Text className="text-xl font-bold text-center" style={{ color: theme.text }}>
                Lista de reproducción
              </Text>
            </View>
          </View>

          <View
            ref={listContainerRef}
            onLayout={(e) => {
              listTopY.current = e.nativeEvent.layout.y;
              listHeight.current = e.nativeEvent.layout.height;
            }}
          >
            <FlatList
              ref={flatListRef}
              data={queue}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              showsVerticalScrollIndicator={false}
              getItemLayout={(_data, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
              scrollEventThrottle={8}
              onContentSizeChange={scrollToCurrentSong}
              onScroll={(e) => {
                scrollOffset.current = e.nativeEvent.contentOffset.y;
              }}
              renderItem={renderItem}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default QueuePlaylistModal;
