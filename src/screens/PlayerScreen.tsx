import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Font from "expo-font";
import {
  deleteAudioFile,
  getAudioFilesWithPermission,
  setAudioAsTone,
  shareAudioFile,
  Song,
  ToneType,
} from "../../modules/local-music";
import { useMusicPlayer } from "../audio/musicPlayer";
import AppSettingsModal from "../components/AppSettingsModal";
import AudioWaveBars from "../components/AudioWaveBars";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import QueuePlaylistModal from "../components/QueuePlaylistModal";
import RelatedTracksModal from "../components/RelatedTracksModal";
import SongDetailsModal from "../components/SongDetailsModal";
import LyricsModal from "../components/LyricsModal";
import {
  BackIcon,
  BackwardIcon,
  DotsIcon,
  FavoritedIcon,
  ForwardIcon,
  ImageIcon,
  LockScreenIcon,
  PlaylistIcon,
  RepeatAllIcon,
  RepeatOffbackIcon,
  RepeatOnceIcon,
  ShuffleIcon,
  UnfavoritedIcon,
  VolumeHighIcon,
  VolumeLowIcon,
} from "../Icons";
import { formatDuration } from "../utils/time";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useAppSettings } from "../settings/appSettings";
import { LinearGradient } from "expo-linear-gradient";
import { BlurTargetView, BlurView } from "expo-blur";
import { useDominantColor, withAlpha } from "../hooks/useDominantColor";

interface PlayerScreenProps {
  onBack: () => void;
}

type RelatedSongsState = {
  title: string;
  type: "album" | "artist";
  songs: Song[];
} | null;

const LOCK_DATE_FONT = "SFNSText-Regular";
const LOCK_TIME_FONT = "BlackOpsOne-Regular";
const UNKNOWN_ALBUM = "Álbum Desconocido";
const UNKNOWN_ARTIST = "Artista Desconocido";
const normalizeValue = (value: string | null | undefined, fallback: string) =>
  value?.trim() || fallback;

const PlayerScreen = ({ onBack }: PlayerScreenProps) => {
  const {
    currentSong,
    currentIndex,
    playing,
    currentTime,
    durationSeconds,
    volume,
    queue,
    favoriteSongIds,
    shuffleEnabled,
    playbackMode,
    playSong,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    setShuffleEnabled,
    cyclePlaybackMode,
    toggleFavoriteSong,
    togglePlayPause,
  } = useMusicPlayer();
  const { theme } = useAppSettings();
  const insets = useSafeAreaInsets();

  const mainProgressBarRef = useRef<View>(null);
  const miniProgressBarRef = useRef<View>(null);
  const lockProgressBarRef = useRef<View>(null);
  const volumeBarRef = useRef<View>(null);
  const miniPlayerBlurTargetRef = useRef<View | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);

  const [mainProgressBar, setMainProgressBar] = useState({ x: 0, width: 0 });
  const [miniProgressBar, setMiniProgressBar] = useState({ x: 0, width: 0 });
  const [lockProgressBar, setLockProgressBar] = useState({ x: 0, width: 0 });
  const [volumeBar, setVolumeBar] = useState({ x: 0, width: 0 });

  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [queueVisible, setQueueVisible] = useState(false);
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [lockScreenVisible, setLockScreenVisible] = useState(false);
  const [trackMenuVisible, setTrackMenuVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [defineAsVisible, setDefineAsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [lyricsVisible, setLyricsVisible] = useState(false);
  const [relatedSongs, setRelatedSongs] = useState<RelatedSongsState>(null);
  const [lockFontsLoaded, setLockFontsLoaded] = useState(false);

  const dominantColor = useDominantColor(currentSong?.artwork ?? null);

  useEffect(() => {
    Font.loadAsync({
      [LOCK_DATE_FONT]: require("../../assets/fonts/SFNSText-Regular.otf"),
      [LOCK_TIME_FONT]: require("../../assets/fonts/BlackOpsOne-Regular.ttf"),
    })
      .then(() => setLockFontsLoaded(true))
      .catch((error) =>
        console.warn("No se pudieron cargar las fuentes del lock screen:", error),
      );
  }, []);

  useEffect(() => {
    getAudioFilesWithPermission()
      .then(setAllSongs)
      .catch((error) =>
        console.warn("No se pudo cargar la biblioteca:", error),
      );
  }, []);

  const currentQueue = queue.length ? queue : currentSong ? [currentSong] : [];

  const isCurrentSongFavorite = currentSong
    ? favoriteSongIds.includes(currentSong.id)
    : false;

  const RepeatModeIcon = useMemo(() => {
    if (playbackMode === "repeat-all") return RepeatAllIcon;
    if (playbackMode === "repeat-one") return RepeatOnceIcon;
    return RepeatOffbackIcon;
  }, [playbackMode]);

  const repeatActive = playbackMode !== "linear";
  const closeTrackMenu = () => setTrackMenuVisible(false);

  const openRelatedSongs = (type: "album" | "artist") => {
    if (!currentSong) return;
    closeTrackMenu();
    const target =
      type === "album"
        ? normalizeValue(currentSong.album, UNKNOWN_ALBUM)
        : normalizeValue(currentSong.artist, UNKNOWN_ARTIST);
    setRelatedSongs({
      title: target,
      type,
      songs: allSongs.filter(
        (song) =>
          normalizeValue(
            type === "album" ? song.album : song.artist,
            type === "album" ? UNKNOWN_ALBUM : UNKNOWN_ARTIST,
          ) === target,
      ),
    });
  };

  const defineSongAs = async (type: ToneType) => {
    if (!currentSong) return;
    setDefineAsVisible(false);
    await setAudioAsTone(currentSong.id, type);
  };

  const deleteCurrentSong = async () => {
    if (!currentSong) return;
    const deleted = await deleteAudioFile(currentSong.id);
    if (!deleted) return;
    closeTrackMenu();
    const nextQueue = currentQueue.filter((song) => song.id !== currentSong.id);
    if (nextQueue.length) {
      void playSong(nextQueue, Math.min(currentIndex, nextQueue.length - 1));
      return;
    }
    onBack();
  };

  if (!currentSong) {
    return (
      <Modal
        visible
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={onBack}
      >
        <View
          className="flex-1 items-center justify-center px-6"
          style={{
            backgroundColor: theme.background,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <Text className="mb-6 text-center text-base" style={{ color: theme.mutedText }}>
            No hay ninguna canción seleccionada.
          </Text>
          <Pressable
            className="rounded-full px-6 py-3"
            style={{ backgroundColor: theme.surface }}
            onPress={onBack}
          >
            <Text className="font-bold" style={{ color: theme.text }}>Volver</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  const playbackDuration = durationSeconds || currentSong.duration / 1000;
  const displayTime = scrubTime ?? currentTime;
  const progress = playbackDuration > 0
    ? Math.min(Math.max(displayTime / playbackDuration, 0), 1)
    : 0;
  const elapsed = formatDuration(Math.round(displayTime * 1000));
  const remaining = formatDuration(
    Math.round(Math.max(playbackDuration - displayTime, 0) * 1000),
  );

  const createProgressBarLayoutHandler = (
    ref: React.RefObject<View>,
    setter: React.Dispatch<React.SetStateAction<{ x: number; width: number }>>,
  ) => (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    requestAnimationFrame(() => {
      ref.current?.measureInWindow((x, _y, measuredWidth) => {
        setter({ x, width: measuredWidth || width });
      });
    });
  };

  const handleMainProgressLayout = createProgressBarLayoutHandler(
    mainProgressBarRef,
    setMainProgressBar,
  );
  const handleMiniProgressLayout = createProgressBarLayoutHandler(
    miniProgressBarRef,
    setMiniProgressBar,
  );
  const handleLockProgressLayout = createProgressBarLayoutHandler(
    lockProgressBarRef,
    setLockProgressBar,
  );
  const handleVolumeLayout = createProgressBarLayoutHandler(
    volumeBarRef,
    setVolumeBar,
  );

  const getProgressTimeFromGesture = (
    event: GestureResponderEvent,
    bar: { x: number; width: number },
  ) => {
    if (!bar.width || !playbackDuration) return null;
    const touchX = bar.x
      ? event.nativeEvent.pageX - bar.x
      : event.nativeEvent.locationX;
    const nextProgress = Math.min(Math.max(touchX / bar.width, 0), 1);
    return nextProgress * playbackDuration;
  };

  const createProgressScrubHandler = (
    bar: { x: number; width: number },
  ) => (event: GestureResponderEvent) => {
    const nextTime = getProgressTimeFromGesture(event, bar);
    if (nextTime === null) return;
    setScrubTime(nextTime);
  };

  const handleProgressRelease = (event: GestureResponderEvent) => {
    // Use the last bar that was interacted with, just in case.
    const bar =
      miniProgressBar.width ? miniProgressBar
      : lockProgressBar.width ? lockProgressBar
      : mainProgressBar;

    const nextTime = getProgressTimeFromGesture(event, bar) ?? scrubTime;
    setScrubTime(null);
    if (nextTime === null) return;
    seekTo(nextTime);
  };

  const handleVolumeGesture = (event: GestureResponderEvent) => {
    if (!volumeBar.width) return;
    const touchX = volumeBar.x
      ? event.nativeEvent.pageX - volumeBar.x
      : event.nativeEvent.locationX;
    const nextVolume = Math.min(Math.max(touchX / volumeBar.width, 0), 1);
    setVolume(nextVolume);
  };

  const now = new Date();
  const lockScreenDate = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const lockScreenTime = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onBack}
    >
      <View
        className="flex-1 px-6"
        style={{
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[dominantColor, withAlpha(dominantColor, 0.55), "#0a0a0a"]}
          locations={[0, 0.45, 1]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <Pressable
            className="-ml-2 h-10 w-10 items-center justify-center"
            onPress={onBack}
          >
            <BackIcon size={26} color="#f5f5f5" />
          </Pressable>
          <View className="-mr-2 flex-row items-center">
            <Pressable
              className="h-10 w-10 items-center justify-center"
              onPress={() => setMiniPlayerVisible(true)}
            >
              <ImageIcon size={22} color="#f5f5f5" />
            </Pressable>
            <Pressable
              className="h-10 w-10 items-center justify-center"
              onPress={() => setLockScreenVisible(true)}
            >
              <LockScreenIcon size={22} color="#f5f5f5" />
            </Pressable>
            <Pressable
              className="h-10 w-10 items-center justify-center"
              onPress={() => setTrackMenuVisible(true)}
            >
              <DotsIcon size={24} color="#f5f5f5" />
            </Pressable>
          </View>
        </View>

        <View className="flex-1 justify-between pt-16 pb-32">
          {/* Portada */}
          <View className="aspect-square w-full max-w-[400px] items-center justify-center self-center overflow-hidden rounded-3xl bg-[#2a2a2a]">
            {currentSong.artwork ? (
              <Image
                source={{ uri: currentSong.artwork }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="musical-notes" size={96} color="#5a5a5a" />
            )}
          </View>

          {/* Info + Barra de progreso */}
          <View>
            <View className="flex-row items-center">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-bold text-white" numberOfLines={1}>
                  {currentSong.title}
                </Text>
                <Text className="mt-1 text-base text-white/60" numberOfLines={1}>
                  {normalizeValue(currentSong.artist, UNKNOWN_ARTIST)}
                </Text>
              </View>
              <View className="flex-row items-center gap-5">
                <Pressable onPress={() => setQueueVisible(true)}>
                  <PlaylistIcon size={26} color="#f5f5f5" />
                </Pressable>
                <Pressable onPress={() => void toggleFavoriteSong(currentSong.id)}>
                  {isCurrentSongFavorite ? (
                    <FavoritedIcon size={26} color="#f5f5f5" />
                  ) : (
                    <UnfavoritedIcon size={26} color="#f5f5f5" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Barra de progreso */}
            <View
              className="mt-7"
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={createProgressScrubHandler(mainProgressBar)}
              onResponderMove={createProgressScrubHandler(mainProgressBar)}
              onResponderRelease={handleProgressRelease}
              onResponderTerminate={handleProgressRelease}
            >
              <View className="h-9 justify-center">
                <View
                  ref={mainProgressBarRef}
                  className="relative h-2 justify-center rounded-full bg-white/15"
                  onLayout={handleMainProgressLayout}
                >
                  <View
                    pointerEvents="none"
                    className="h-2 rounded-full bg-white"
                    style={{ width: `${progress * 100}%` }}
                  />
                  <View
                    pointerEvents="none"
                    className="absolute h-4 w-4 rounded-full bg-white"
                    style={{ left: `${progress * 100}%`, transform: [{ translateX: -8 }] }}
                  />
                </View>
              </View>
              <View className="-mt-1 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-white/60">{elapsed}</Text>
                <Text className="text-xs font-medium text-white/60">-{remaining}</Text>
              </View>
            </View>
          </View>

          {/* Controles */}
          <View className="flex-row items-center justify-between px-1">
            <Pressable
              className="h-12 w-12 items-center justify-center"
              onPress={() => setShuffleEnabled(!shuffleEnabled)}
            >
              <ShuffleIcon
                size={24}
                color={shuffleEnabled ? "#ffffff" : "#888888"}
              />
            </Pressable>
            <Pressable
              className="h-12 w-12 items-center justify-center"
              onPress={() => void playPrevious()}
            >
              <BackwardIcon size={36} color="#f5f5f5" />
            </Pressable>
            <Pressable
              className="h-20 w-20 items-center justify-center"
              onPress={() => void togglePlayPause()}
            >
              <FontAwesome5
                name={playing ? "pause" : "play"}
                size={44}
                color="#f5f5f5"
                style={{ marginLeft: playing ? 0 : 4 }}
              />
            </Pressable>
            <Pressable
              className="h-12 w-12 items-center justify-center"
              onPress={() => void playNext()}
            >
              <ForwardIcon size={36} color="#f5f5f5" />
            </Pressable>
            <Pressable
              className="h-12 w-12 items-center justify-center"
              onPress={cyclePlaybackMode}
            >
              <RepeatModeIcon
                size={24}
                color={repeatActive ? "#ffffff" : "#888888"}
              />
            </Pressable>
          </View>
        </View>

        <QueuePlaylistModal
          visible={queueVisible}
          queue={currentQueue}
          currentIndex={currentIndex}
          onClose={() => setQueueVisible(false)}
          onSelectSong={index => {
            setQueueVisible(false);
            void playSong(currentQueue, index);
          }}
        />

        <Modal transparent visible={trackMenuVisible} animationType="fade" onRequestClose={closeTrackMenu}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={closeTrackMenu} />
            <View
              className="rounded-t-[32px] px-6 pb-8 pt-6"
              style={{ backgroundColor: theme.surface }}
            >
              {[
                ["Eliminar", () => { closeTrackMenu(); setDeleteConfirmVisible(true); }],
                ["Compartir", () => { closeTrackMenu(); void shareAudioFile(currentSong.id); }],
                ["Detalles de la pista", () => { closeTrackMenu(); setDetailsVisible(true); }],
                ["Letra", () => { closeTrackMenu(); setLyricsVisible(true); }],
                ["Álbum", () => openRelatedSongs("album")],
                ["Artista", () => openRelatedSongs("artist")],
                ["Definir como", () => { closeTrackMenu(); setDefineAsVisible(true); }],
                ["Ajustes", () => { closeTrackMenu(); setSettingsVisible(true); }],
              ].map(([label, onPress]) => (
                <Pressable key={label as string} className="border-b border-white/5 px-2 py-4" onPress={onPress as () => void}>
                  <Text className="text-base font-bold" style={{ color: theme.text }}>{label as string}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>

        <SongDetailsModal
          song={detailsVisible ? currentSong : null}
          onClose={() => setDetailsVisible(false)}
        />

        <LyricsModal
          song={lyricsVisible ? currentSong : null}
          visible={lyricsVisible}
          onClose={() => setLyricsVisible(false)}
        />

        <ConfirmDeleteModal
          visible={deleteConfirmVisible}
          title="Eliminar canción"
          message={`¿Quieres eliminar “${currentSong.title}”? Esta acción no se puede deshacer.`}
          itemName={currentSong.title}
          artwork={currentSong.artwork}
          accent="white"
          onClose={() => setDeleteConfirmVisible(false)}
          onConfirm={() => {
            setDeleteConfirmVisible(false);
            void deleteCurrentSong();
          }}
        />

        <Modal transparent visible={defineAsVisible} animationType="fade" onRequestClose={() => setDefineAsVisible(false)}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/70" onPress={() => setDefineAsVisible(false)} />
            <View className="rounded-t-[32px] bg-[#202020] px-6 pb-8 pt-6">
              {[["Tono del dispositivo", "ringtone"], ["Tono de alarma", "alarm"]].map(([label, type]) => (
                <Pressable key={label} className="mt-3 rounded-2xl bg-white/5 px-4 py-4" onPress={() => void defineSongAs(type as ToneType)}>
                  <Text className="font-bold text-white">{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>

        <Modal
          transparent
          visible={miniPlayerVisible}
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => setMiniPlayerVisible(false)}
        >
          <View className="flex-1 items-center justify-center px-6">
            <BlurTargetView
              ref={miniPlayerBlurTargetRef}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            >
              {currentSong.artwork ? (
                <Image
                  source={{ uri: currentSong.artwork }}
                  style={{ position: "absolute", top: -32, left: -32, right: -32, bottom: -32 }}
                  resizeMode="cover"
                  blurRadius={18}
                />
              ) : null}
              <LinearGradient
                colors={[dominantColor, "#050505"]}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
            </BlurTargetView>
            <BlurView
              blurTarget={miniPlayerBlurTargetRef}
              blurMethod="dimezisBlurView"
              intensity={100}
              tint="dark"
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <LinearGradient
              pointerEvents="none"
              colors={[withAlpha(dominantColor, 0.45), "rgba(0,0,0,0.82)"]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <Pressable
              className="absolute inset-0"
              onPress={() => setMiniPlayerVisible(false)}
            />
            <View
              className="w-full max-w-[380px] rounded-[34px] p-6"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOpacity: 0.35,
                shadowOffset: { width: 0, height: 8 },
                shadowRadius: 18,
                elevation: 10,
              }}
            >
              {/* sheen + depth overlays to simulate liquid glass */}
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0)"]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90, borderTopLeftRadius: 34, borderTopRightRadius: 34 }}
              />
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.18)"]}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 }}
              />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 34, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' }} pointerEvents="none" />
              <View className="aspect-square w-full items-center justify-center overflow-hidden rounded-[24px] bg-[#2a2a2a]">
                {currentSong.artwork ? (
                  <Image
                    source={{ uri: currentSong.artwork }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="musical-notes" size={70} color="#5a5a5a" />
                )}
              </View>

              <View className="mt-4 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-bold text-white" numberOfLines={1}>
                    {currentSong.title}
                  </Text>
                  <Text className="mt-1 text-xs text-white/55" numberOfLines={1}>
                    {normalizeValue(currentSong.artist, UNKNOWN_ARTIST)}
                  </Text>
                </View>
                <Pressable onPress={() => void toggleFavoriteSong(currentSong.id)}>
                  {isCurrentSongFavorite ? (
                    <FavoritedIcon size={22} color="#f5f5f5" />
                  ) : (
                    <UnfavoritedIcon size={22} color="#f5f5f5" />
                  )}
                </Pressable>
              </View>

              <View
                className="mt-4"
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={createProgressScrubHandler(miniProgressBar)}
                onResponderMove={createProgressScrubHandler(miniProgressBar)}
                onResponderRelease={handleProgressRelease}
                onResponderTerminate={handleProgressRelease}
              >
                <View className="h-8 justify-center">
                  <View
                    ref={miniProgressBarRef}
                    className="relative h-2 justify-center rounded-full bg-white/20"
                    onLayout={handleMiniProgressLayout}
                  >
                    <View
                      pointerEvents="none"
                      className="h-2 rounded-full bg-white"
                      style={{ width: `${progress * 100}%` }}
                    />
                    <View
                      pointerEvents="none"
                      className="absolute h-3.5 w-3.5 rounded-full bg-white"
                      style={{ left: `${progress * 100}%`, transform: [{ translateX: -7 }] }}
                    />
                  </View>
                </View>
                <View className="-mt-1 flex-row items-center justify-between">
                  <Text className="text-xs text-white/50">{elapsed}</Text>
                  <Text className="text-xs text-white/50">-{remaining}</Text>
                </View>
              </View>

              <View className="mt-5 flex-row items-center justify-center gap-8">
                <Pressable onPress={() => void playPrevious()}>
                  <BackwardIcon size={30} color="#f5f5f5" />
                </Pressable>
                <Pressable onPress={() => void togglePlayPause()}>
                  <Ionicons name={playing ? "pause" : "play"} size={44} color="#f5f5f5" />
                </Pressable>
                <Pressable onPress={() => void playNext()}>
                  <ForwardIcon size={30} color="#f5f5f5" />
                </Pressable>
              </View>

              <View className="mt-6 flex-row items-center gap-3">
                <VolumeLowIcon size={22} color="#f5f5f5" />
                <View
                  className="h-8 flex-1 justify-center"
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={handleVolumeGesture}
                  onResponderMove={handleVolumeGesture}
                >
                  <View
                    ref={volumeBarRef}
                    className="relative h-2 justify-center rounded-full bg-white/20"
                    onLayout={handleVolumeLayout}
                  >
                    <View
                      pointerEvents="none"
                      className="h-2 rounded-full bg-white"
                      style={{ width: `${volume * 100}%` }}
                    />
                    <View
                      pointerEvents="none"
                      className="absolute h-3.5 w-3.5 rounded-full bg-white"
                      style={{ left: `${volume * 100}%`, transform: [{ translateX: -7 }] }}
                    />
                  </View>
                </View>
                <VolumeHighIcon size={22} color="#f5f5f5" />
              </View>
            </View>
          </View>
        </Modal>
        
        <Modal
          transparent
          visible={lockScreenVisible}
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => setLockScreenVisible(false)}
        >
          <View
            className="flex-1 px-6 pt-20"
          >
            <LinearGradient
              pointerEvents="none"
              colors={[dominantColor, withAlpha(dominantColor, 1), "#000000"]}
              locations={[0, 0.5, 1]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <View className="items-center">
              <Text
                className="text-3xl capitalize text-white/70"
                style={lockFontsLoaded ? { fontFamily: LOCK_DATE_FONT } : undefined}
              >
                {lockScreenDate}
              </Text>
              <Text
                className="mt-1 text-6xl tracking-[-2px] text-white"
                style={lockFontsLoaded ? { fontFamily: LOCK_TIME_FONT } : undefined}
              >
                {lockScreenTime}
              </Text>
            </View>

            <View className="mt-10 aspect-square w-full items-center justify-center overflow-hidden rounded-[14px] bg-[#2a2a2a]">
              {currentSong.artwork ? (
                <Image
                  source={{ uri: currentSong.artwork }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="musical-notes" size={90} color="#5a5a5a" />
              )}
            </View>

            <View className="mt-14 rounded-[32px] border border-white/10 bg-white/10 px-5 py-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-lg font-bold text-white" numberOfLines={1}>
                    {currentSong.title}
                  </Text>
                  <Text className="mt-1 text-sm text-white/60" numberOfLines={1}>
                    {normalizeValue(currentSong.artist, UNKNOWN_ARTIST)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-5">
                  <AudioWaveBars playing={playing} color="#f5f5f5" size="md" />
                  <Pressable onPress={() => void toggleFavoriteSong(currentSong.id)}>
                    {isCurrentSongFavorite ? (
                      <FavoritedIcon size={24} color="#f5f5f5" />
                    ) : (
                      <UnfavoritedIcon size={24} color="#f5f5f5" />
                    )}
                  </Pressable>
                </View>
              </View>

              <View
                className="mt-5"
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={createProgressScrubHandler(lockProgressBar)}
                onResponderMove={createProgressScrubHandler(lockProgressBar)}
                onResponderRelease={handleProgressRelease}
                onResponderTerminate={handleProgressRelease}
              >
                <View className="h-8 justify-center">
                  <View
                    ref={lockProgressBarRef}
                    className="relative h-2 justify-center rounded-full bg-white/25"
                    onLayout={handleLockProgressLayout}
                  >
                    <View
                      pointerEvents="none"
                      className="h-2 rounded-full bg-white"
                      style={{ width: `${progress * 100}%` }}
                    />
                    <View
                      pointerEvents="none"
                      className="absolute h-4 w-4 rounded-full bg-white"
                      style={{ left: `${progress * 100}%`, transform: [{ translateX: -8 }] }}
                    />
                  </View>
                </View>
                <View className="-mt-1 flex-row items-center justify-between">
                  <Text className="text-xs text-white/60">{elapsed}</Text>
                  <Text className="text-xs text-white/60">-{remaining}</Text>
                </View>
              </View>

              <View className="mt-5 flex-row items-center justify-center gap-9">
                <Pressable onPress={() => void playPrevious()}>
                  <Ionicons name="play-skip-back" size={32} color="#f5f5f5" />
                </Pressable>
                <Pressable onPress={() => void togglePlayPause()}>
                  <Ionicons name={playing ? "pause" : "play"} size={42} color="#f5f5f5" />
                </Pressable>
                <Pressable onPress={() => void playNext()}>
                  <Ionicons name="play-skip-forward" size={32} color="#f5f5f5" />
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <RelatedTracksModal
          visible={Boolean(relatedSongs)}
          title={relatedSongs?.title ?? ""}
          songs={relatedSongs?.songs ?? []}
          variant={relatedSongs?.type ?? "album"}
          artwork={relatedSongs?.songs[0]?.artwork}
          onClose={() => setRelatedSongs(null)}
          onPlayAll={() => {
            if (!relatedSongs?.songs.length) return;
            setRelatedSongs(null);
            void playSong(relatedSongs.songs, 0);
          }}
          onSelectSong={(index) => {
            if (!relatedSongs) return;
            setRelatedSongs(null);
            void playSong(relatedSongs.songs, index);
          }}
        />

        <AppSettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />
      </View>
    </Modal>
  );
};

export default PlayerScreen;