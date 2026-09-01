import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, GestureResponderEvent, PermissionsAndroid, Platform, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { deleteAudioFile, getAudioFiles, getAudioFilesWithPermission, setAudioAsTone, shareAudioFile, Song, ToneType } from '../../modules/local-music';
import { useMusicPlayer } from '../audio/musicPlayer';
import { useAppSettings } from '../settings/appSettings';
import AddSongToPlaylistModal from '../components/AddSongToPlaylistModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import DefineAsModal from '../components/DefineAsModal';
import RelatedTracksModal from '../components/RelatedTracksModal';
import SelectedSongsActionBar from '../components/SelectedSongsActionBar';
import SongDetailsModal from '../components/SongDetailsModal';
import SongListItem from '../components/SongListItem';
import TopNavFavoritos from '../components/TopNavFavoritos';
import TrackActionMenu from '../components/TrackActionMenu';
import TopNavPistas, { TrackSortDirection, TrackSortOption } from '../components/TopNavPistas';
import { MINI_PLAYER_BOTTOM_INSET, SELECTION_BAR_BOTTOM_INSET } from '../utils/layout';
import { loadSortPreference, saveSortPreference } from '../utils/sortPreferences';
import PlayerScreen from './PlayerScreen';
import { Pressable } from 'react-native';
import { FavoritedIcon } from '../Icons';
import { getTranslation } from '../i18n/translations';

type TrackListMode = 'tracks' | 'favorites';

type TrackMenuState = {
  song: Song;
  x: number;
  y: number;
};

type StoredPlaylist = {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
  updatedAt: number;
};

interface TrackListLibraryScreenProps {
  mode: TrackListMode;
}

const UNKNOWN_ALBUM = 'Álbum Desconocido';
const UNKNOWN_ARTIST = 'Artista Desconocido';
const CUSTOM_PLAYLISTS_STORAGE_KEY = '@fesa:custom-playlists';

const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const cleanValue = value?.trim();

  return cleanValue || fallback;
};

const getSongDate = (song: Song) => song.dateModified ?? song.dateAdded ?? 0;

const compareText = (a: string | null | undefined, b: string | null | undefined, fallback: string) => (
  normalizeValue(a, fallback).localeCompare(normalizeValue(b, fallback))
);

const shuffleSongs = (songs: Song[]) => {
  const shuffled = [...songs];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
};

const TrackListLibraryScreen = ({ mode }: TrackListLibraryScreenProps) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [trackMenu, setTrackMenu] = useState<TrackMenuState | null>(null);
  const [storedPlaylists, setStoredPlaylists] = useState<StoredPlaylist[]>([]);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);
  const [addToPlaylistVisible, setAddToPlaylistVisible] = useState(false);
  const [createPlaylistVisible, setCreatePlaylistVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [defineAsSong, setDefineAsSong] = useState<Song | null>(null);
  const [detailsSong, setDetailsSong] = useState<Song | null>(null);
  const [relatedTracks, setRelatedTracks] = useState<{
    title: string;
    subtitle: string;
    songs: Song[];
    artwork?: string | null;
    variant: 'album' | 'artist';
  } | null>(null);
  const [bulkDeleteVisible, setBulkDeleteVisible] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [trackSort, setTrackSort] = useState<TrackSortOption>('name');
  const [trackSortDirection, setTrackSortDirection] = useState<TrackSortDirection>('asc');
  const { theme, language } = useAppSettings();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const {
    currentSong,
    playing,
    favoriteSongIds,
    playSong,
    togglePlayPause,
    setSelectionModeActive,
  } = useMusicPlayer();

  const requestPermissionsAndLoadMusic = useCallback(async () => {
    try {
      setLoading(true);
      const music = await getAudioFilesWithPermission();
      setSongs(music);
      if (music.length > 0) {
        setPermissionGranted(true);
      }
    } catch (error) {
      console.error('Error al obtener música:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void requestPermissionsAndLoadMusic();
  }, [requestPermissionsAndLoadMusic]);

  useEffect(() => {
    let mounted = true;

    void loadSortPreference(`tracks:${mode}`, { sort: 'name', direction: 'asc' }).then(preference => {
      if (mounted) {
        setTrackSort(preference.sort);
        setTrackSortDirection(preference.direction);
      }
    });

    return () => {
      mounted = false;
    };
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      // Si no hay canciones, intentamos recargar al enfocar
      if (songs.length === 0 && !loading) {
        void requestPermissionsAndLoadMusic();
      }

      AsyncStorage.getItem(CUSTOM_PLAYLISTS_STORAGE_KEY)
        .then(storedValue => {
          const parsedPlaylists = storedValue ? JSON.parse(storedValue) : [];

          if (Array.isArray(parsedPlaylists)) {
            setStoredPlaylists(parsedPlaylists);
          }
        })
        .catch(error => console.warn('No se pudieron cargar las playlists:', error));
    }, [])
  );

  const persistStoredPlaylists = async (nextPlaylists: StoredPlaylist[]) => {
    setStoredPlaylists(nextPlaylists);
    await AsyncStorage.setItem(CUSTOM_PLAYLISTS_STORAGE_KEY, JSON.stringify(nextPlaylists));
  };

  const listedSongs = useMemo(() => {
    if (mode === 'favorites') {
      return favoriteSongIds
        .map(songId => songs.find(song => song.id === songId))
        .filter(Boolean) as Song[];
    }

    return songs;
  }, [favoriteSongIds, mode, songs]);

  const sortedSongs = useMemo(() => {
    const directionMultiplier = trackSortDirection === 'asc' ? 1 : -1;
    const nextSongs = [...listedSongs];

    if (trackSort === 'date') {
      return nextSongs.sort((a, b) => directionMultiplier * (getSongDate(a) - getSongDate(b) || a.title.localeCompare(b.title)));
    }

    if (trackSort === 'artist') {
      return nextSongs.sort((a, b) => directionMultiplier * (compareText(a.artist, b.artist, UNKNOWN_ARTIST) || a.title.localeCompare(b.title)));
    }

    if (trackSort === 'albums') {
      return nextSongs.sort((a, b) => directionMultiplier * (compareText(a.album, b.album, UNKNOWN_ALBUM) || a.title.localeCompare(b.title)));
    }

    return nextSongs.sort((a, b) => directionMultiplier * a.title.localeCompare(b.title));
  }, [listedSongs, trackSort, trackSortDirection]);

  const selectedSongs = useMemo(
    () => selectedSongIds.map(songId => songs.find(song => song.id === songId)).filter(Boolean) as Song[],
    [selectedSongIds, songs]
  );
  const isSelectionMode = selectedSongIds.length > 0;

  useEffect(() => {
    setSelectionModeActive(isSelectionMode);

    return () => setSelectionModeActive(false);
  }, [isSelectionMode, setSelectionModeActive]);

  const playFromList = (list: Song[], index: number) => {
    void playSong(list, index);
    setShowPlayer(true);
  };

  const openTrackMenu = (song: Song, event: GestureResponderEvent) => {
    event.stopPropagation();
    setTrackMenu({ song, x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  };

  const closeTrackMenu = () => setTrackMenu(null);

  const clearSelectedSongs = () => setSelectedSongIds([]);

  const playSelectedSongs = () => {
    if (!selectedSongs.length) return;
    void playSong(selectedSongs, 0);
    clearSelectedSongs();
    setShowPlayer(true);
  };

  const shareSelectedSongs = () => {
    selectedSongIds.forEach(songId => { void shareAudioFile(songId); });
    clearSelectedSongs();
  };

  const confirmDeleteSelectedSongs = () => {
    if (!selectedSongIds.length) return;
    setBulkDeleteVisible(true);
  };

  const formatDeleteSongsMessage = () => {
    const label = selectedSongIds.length === 1 ? t('delete_song_single', 'song') : t('delete_song_plural', 'songs');
    return t('delete_song_message', 'Do you want to delete %count% %label%? This action cannot be undone.')
      .replace('%count%', String(selectedSongIds.length))
      .replace('%label%', label);
  };

  const performBulkDelete = () => {
    const idsToDelete = [...selectedSongIds];
    idsToDelete.forEach(songId => { void deleteAudioFile(songId); });
    setSongs(currentSongs => currentSongs.filter(song => !idsToDelete.includes(song.id)));
    clearSelectedSongs();
    setBulkDeleteVisible(false);
  };

  const toggleSelectedSong = (song: Song) => {
    setSelectedSongIds(currentIds => currentIds.includes(song.id)
      ? currentIds.filter(songId => songId !== song.id)
      : [...currentIds, song.id]
    );
  };

  const startSongSelection = (song: Song) => {
    setSelectedSongIds(currentIds => currentIds.includes(song.id) ? currentIds : [...currentIds, song.id]);
  };

  const openSelectedSongsPlaylistModal = () => {
    setAddToPlaylistSong(null);
    setPlaylistName('');
    setAddToPlaylistVisible(Boolean(storedPlaylists.length));
    setCreatePlaylistVisible(!storedPlaylists.length);
  };

  const openAddToPlaylist = (song: Song) => {
    closeTrackMenu();
    setAddToPlaylistSong(song);
    setPlaylistName('');
    setAddToPlaylistVisible(Boolean(storedPlaylists.length));
    setCreatePlaylistVisible(!storedPlaylists.length);
  };

  const addTrackToPlaylist = async (playlistId: string) => {
    const songIdsToAdd = addToPlaylistSong ? [addToPlaylistSong.id] : selectedSongIds;
    if (!songIdsToAdd.length) return;

    const nextPlaylists = storedPlaylists.map(playlist => playlist.id === playlistId
      ? { ...playlist, songIds: [...playlist.songIds, ...songIdsToAdd.filter(songId => !playlist.songIds.includes(songId))], updatedAt: Date.now() }
      : playlist);

    await persistStoredPlaylists(nextPlaylists);
    setAddToPlaylistVisible(false);
    setAddToPlaylistSong(null);
    clearSelectedSongs();
  };

  const createPlaylistWithTrack = async () => {
    const cleanName = playlistName.trim();
    const songIdsToAdd = addToPlaylistSong ? [addToPlaylistSong.id] : selectedSongIds;
    if (!cleanName || !songIdsToAdd.length) return;

    const now = Date.now();
    await persistStoredPlaylists([{ id: `playlist-${now}`, name: cleanName, songIds: songIdsToAdd, createdAt: now, updatedAt: now }, ...storedPlaylists]);
    setCreatePlaylistVisible(false);
    setPlaylistName('');
    setAddToPlaylistSong(null);
    clearSelectedSongs();
  };

  const deleteTrack = (song: Song) => {
    closeTrackMenu();
    void deleteAudioFile(song.id).then(deleted => {
      if (deleted) setSongs(currentSongs => currentSongs.filter(currentSong => currentSong.id !== song.id));
    });
  };

  const showTrackDetails = (song: Song) => {
    closeTrackMenu();
    setDetailsSong(song);
  };

  const showTrackGroup = (song: Song, groupMode: 'albums' | 'artists') => {
    closeTrackMenu();
    const groupName = groupMode === 'albums'
      ? normalizeValue(song.album, UNKNOWN_ALBUM)
      : normalizeValue(song.artist, UNKNOWN_ARTIST);
    const relatedSongs = songs.filter(item => (
      groupMode === 'albums'
        ? normalizeValue(item.album, UNKNOWN_ALBUM) === groupName
        : normalizeValue(item.artist, UNKNOWN_ARTIST) === groupName
    ));

    setRelatedTracks({
      title: groupName,
      subtitle: groupMode === 'albums'
        ? normalizeValue(song.artist, UNKNOWN_ARTIST)
        : `${relatedSongs.length} ${relatedSongs.length === 1 ? 'canción' : 'canciones'}`,
      songs: relatedSongs,
      artwork: song.artwork,
      variant: groupMode === 'albums' ? 'album' : 'artist',
    });
  };

  const defineTrackAs = async (song: Song, type: ToneType) => {
    const setAsTone = await setAudioAsTone(song.id, type);
    setDefineAsSong(null);

    if (!setAsTone) {
      return;
    }

    const toneLabel = type === 'ringtone' ? t('device_tone', 'device tone') : t('alarm_tone', 'alarm tone');
    Alert.alert(t('done', 'Done'), `“${song.title}” ${t('tone_set_success', 'was set as')} ${toneLabel}.`);
  };

  const playAllTracks = () => {
    if (!sortedSongs.length) {
      return;
    }

    playFromList(sortedSongs, 0);
  };

  const playShuffleTracks = () => {
    if (!sortedSongs.length) {
      return;
    }

    playFromList(shuffleSongs(sortedSongs), 0);
  };

  const handleTrackSortChange = (option: TrackSortOption, direction: TrackSortDirection) => {
    setTrackSort(option);
    setTrackSortDirection(direction);
    void saveSortPreference(`tracks:${mode}`, { sort: option, direction });
  };

  const renderHeader = () => {
    if (mode === 'favorites') {
      return (
        <View style={{ backgroundColor: theme.background }}>

          <TopNavFavoritos
            selectedSort={trackSort}
            selectedDirection={trackSortDirection}
            onSortChange={handleTrackSortChange}
          />
        </View>
      );
    }

    return (
      <TopNavPistas
        selectedSort={trackSort}
        selectedDirection={trackSortDirection}
        onSortChange={handleTrackSortChange}
        onShufflePress={playShuffleTracks}
        onPlayPress={playAllTracks}
        disabled={!sortedSongs.length}
      />
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!permissionGranted && songs.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: theme.background }}>
        <Text className="text-center text-base" style={{ color: theme.mutedText }}>
          {t('permission_required_music', 'Music permissions are required to read your library.')}
        </Text>
        <Pressable 
          className="mt-4 rounded-full px-6 py-2" 
          style={{ backgroundColor: theme.surface }}
          onPress={() => void requestPermissionsAndLoadMusic()}
        >
          <Text style={{ color: theme.text }}>{t('retry', 'Retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (showPlayer && currentSong) {
    return <PlayerScreen onBack={() => setShowPlayer(false)} />;
  }

  const emptyMessage = mode === 'favorites'
    ? t('favorites_empty_message', 'You have not added any songs to favorites yet.')
    : t('no_music_available', 'No songs available');

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <FlatList
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        data={sortedSongs}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={
          <View className="px-4 py-6">
            <View
              className="items-center rounded-[30px] border px-6 py-8"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                shadowColor: '#000000',
                shadowOpacity: 0.06,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              }}
            >
              <View
                className="mb-4 h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: `${theme.accent}18` }}
              >
                <FavoritedIcon size={28} color={theme.accent} />
              </View>

              <Text className="mb-2 text-xl font-bold" style={{ color: theme.text }}>
                {mode === 'favorites' ? t('favorites_empty_title', 'No favorites yet') : t('empty_state_default', 'Nothing here')}
              </Text>
              <Text className="text-center text-sm leading-6" style={{ color: theme.mutedText }}>
                {emptyMessage}
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: isSelectionMode ? SELECTION_BAR_BOTTOM_INSET : MINI_PLAYER_BOTTOM_INSET }}
        renderItem={({ item, index }) => {
          const isActive = currentSong?.id === item.id;

          const isSelected = selectedSongIds.includes(item.id);

          return (
            <SongListItem
              item={item}
              isActive={isActive}
              isPlaying={isActive && playing}
              isSelected={isSelected}
              onPress={() => isSelectionMode ? toggleSelectedSong(item) : playFromList(sortedSongs, index)}
              onLongPress={() => startSongSelection(item)}
              onTogglePlayPause={togglePlayPause}
              showDuration={false}
              showSelectionIndicator={isSelectionMode}
              onOpenTrackMenu={isSelectionMode ? undefined : openTrackMenu}
            />
          );
        }}
      />

      <SelectedSongsActionBar
        visible={isSelectionMode}
        onPlay={playSelectedSongs}
        onAdd={openSelectedSongsPlaylistModal}
        onShare={shareSelectedSongs}
        onDelete={confirmDeleteSelectedSongs}
      />

      <TrackActionMenu
        trackMenu={trackMenu}
        onClose={closeTrackMenu}
        onAdd={openAddToPlaylist}
        onDelete={deleteTrack}
        onShare={song => {
          closeTrackMenu();
          void shareAudioFile(song.id);
        }}
        onDetails={showTrackDetails}
        onOpenGroup={showTrackGroup}
        onDefineAs={song => {
          closeTrackMenu();
          setDefineAsSong(song);
        }}
      />

      <AddSongToPlaylistModal
        visible={addToPlaylistVisible}
        songToAdd={addToPlaylistSong}
        songIdsToAdd={addToPlaylistSong ? [addToPlaylistSong.id] : selectedSongIds}
        songsToAddCount={addToPlaylistSong ? 1 : selectedSongIds.length}
        playlists={storedPlaylists}
        onClose={() => {
          setAddToPlaylistVisible(false);
          setAddToPlaylistSong(null);
          clearSelectedSongs();
        }}
        onAddToPlaylist={playlistId => { void addTrackToPlaylist(playlistId); }}
        onCreatePlaylist={() => {
          setAddToPlaylistVisible(false);
          setPlaylistName('');
          setCreatePlaylistVisible(true);
        }}
      />

      <CreatePlaylistModal
        visible={createPlaylistVisible}
        playlistName={playlistName}
        onChangePlaylistName={setPlaylistName}
        onClose={() => {
          setCreatePlaylistVisible(false);
          setPlaylistName('');
          setAddToPlaylistSong(null);
          clearSelectedSongs();
        }}
        onNext={() => { void createPlaylistWithTrack(); }}
      />

      <DefineAsModal
        song={defineAsSong}
        onClose={() => setDefineAsSong(null)}
        onDefineAs={(song, type) => { void defineTrackAs(song, type); }}
      />

      <SongDetailsModal
        song={detailsSong}
        onClose={() => setDetailsSong(null)}
      />

      <RelatedTracksModal
        visible={Boolean(relatedTracks)}
        title={relatedTracks?.title ?? ''}
        subtitle={relatedTracks?.subtitle}
        songs={relatedTracks?.songs ?? []}
        artwork={relatedTracks?.artwork}
        variant={relatedTracks?.variant}
        onClose={() => setRelatedTracks(null)}
        onPlayAll={() => {
          if (!relatedTracks?.songs.length) return;
          playFromList(relatedTracks.songs, 0);
          setRelatedTracks(null);
        }}
        onSelectSong={index => {
          if (!relatedTracks) return;
          playFromList(relatedTracks.songs, index);
          setRelatedTracks(null);
        }}
      />

      <ConfirmDeleteModal
        visible={bulkDeleteVisible}
        title={t('delete_song_title', 'Delete songs')}
        message={t('delete_song_message', 'Do you want to delete %count% %label%? This action cannot be undone.')
          .replace('%count%', String(selectedSongIds.length))
          .replace('%label%', selectedSongIds.length === 1 ? t('delete_song_single', 'song') : t('delete_song_plural', 'songs'))}
        confirmLabel={t('delete', 'Delete')}
        onClose={() => setBulkDeleteVisible(false)}
        onConfirm={performBulkDelete}
      />
    </View>
  );
};

export default TrackListLibraryScreen;
