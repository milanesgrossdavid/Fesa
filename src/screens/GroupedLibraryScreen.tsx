import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  GestureResponderEvent,
  PermissionsAndroid,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { deleteAudioFile, getAudioFiles, getAudioFilesWithPermission, setAudioAsTone, shareAudioFile, Song, ToneType } from '../../modules/local-music';
import { useMusicPlayer } from '../audio/musicPlayer';
import { useAppSettings } from '../settings/appSettings';
import AddSongToPlaylistModal from '../components/AddSongToPlaylistModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import DefineAsModal from '../components/DefineAsModal';
import LibraryGroupDetailModal from '../components/LibraryGroupDetailModal';
import LibraryGroupGridCard from '../components/LibraryGroupGridCard';
import LibraryGroupListItem from '../components/LibraryGroupListItem';
import SelectedSongsActionBar from '../components/SelectedSongsActionBar';
import SongDetailsModal from '../components/SongDetailsModal';
import SongListItem from '../components/SongListItem';
import TopNavAlbumes from '../components/TopNavAlbumes';
import TrackActionMenu from '../components/TrackActionMenu';
import TopNavArtistas from '../components/TopNavArtistas';
import TopNavCarpetas from '../components/TopNavCarpetas';
import { TrackSortDirection, TrackSortOption } from '../components/TopNavPistas';
import { MINI_PLAYER_BOTTOM_INSET, SELECTION_BAR_BOTTOM_INSET } from '../utils/layout';
import { loadSortPreference, saveSortPreference } from '../utils/sortPreferences';
import PlayerScreen from './PlayerScreen';

type GroupedLibraryMode = 'albums' | 'artists' | 'folders';

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

type SongGroup = {
  id: string;
  name: string;
  subtitle: string;
  songs: Song[];
  artwork?: string | null;
};

interface GroupedLibraryScreenProps {
  mode: GroupedLibraryMode;
  title: string;
}

const UNKNOWN_ALBUM = 'Álbum Desconocido';
const UNKNOWN_ARTIST = 'Artista Desconocido';
const UNKNOWN_FOLDER = 'Carpeta Desconocida';
const CUSTOM_PLAYLISTS_STORAGE_KEY = '@fesa:custom-playlists';

const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const cleanValue = value?.trim();

  return cleanValue || fallback;
};

const getFolderName = (url: string) => {
  if (!url) {
    return UNKNOWN_FOLDER;
  }

  const cleanUrl = decodeURIComponent(url.split('?')[0].replace('file://', ''));
  const parts = cleanUrl.split(/[\\/]/).filter(Boolean);

  if (parts.length < 2) {
    return UNKNOWN_FOLDER;
  }

  return parts[parts.length - 2] || UNKNOWN_FOLDER;
};

const getSongFolderName = (song: Song) => {
  const folderName = normalizeValue(song.folder, '');

  return folderName || getFolderName(song.url);
};

const getGroupName = (song: Song, mode: GroupedLibraryMode) => {
  if (mode === 'albums') {
    return normalizeValue(song.album, UNKNOWN_ALBUM);
  }

  if (mode === 'artists') {
    return normalizeValue(song.artist, UNKNOWN_ARTIST);
  }

  return getSongFolderName(song);
};

const getSongDate = (song: Song) => song.dateModified ?? song.dateAdded ?? 0;

const compareText = (a: string | null | undefined, b: string | null | undefined, fallback: string) => (
  normalizeValue(a, fallback).localeCompare(normalizeValue(b, fallback))
);

const buildGroups = (songs: Song[], mode: GroupedLibraryMode) => {
  const groups = new Map<string, SongGroup>();

  songs.forEach(song => {
    const name = getGroupName(song, mode);
    const currentGroup = groups.get(name);

    if (currentGroup) {
      currentGroup.songs.push(song);
      return;
    }

    groups.set(name, {
      id: name,
      name,
      subtitle: '',
      songs: [song],
      artwork: song.artwork,
    });
  });

  return Array.from(groups.values())
    .map(group => {
      const songCount = `${group.songs.length} ${group.songs.length === 1 ? 'canción' : 'canciones'}`;
      const subtitle = mode === 'albums'
        ? `${normalizeValue(group.songs[0]?.artist, UNKNOWN_ARTIST)} | ${songCount}`
        : songCount;

      return {
        ...group,
        subtitle,
        songs: group.songs.sort((a, b) => a.title.localeCompare(b.title)),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

const GroupedLibraryScreen = ({ mode, title }: GroupedLibraryScreenProps) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<SongGroup | null>(null);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [trackMenu, setTrackMenu] = useState<TrackMenuState | null>(null);
  const [storedPlaylists, setStoredPlaylists] = useState<StoredPlaylist[]>([]);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);
  const [addToPlaylistVisible, setAddToPlaylistVisible] = useState(false);
  const [createPlaylistVisible, setCreatePlaylistVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [defineAsSong, setDefineAsSong] = useState<Song | null>(null);
  const [detailsSong, setDetailsSong] = useState<Song | null>(null);
  const [bulkDeleteVisible, setBulkDeleteVisible] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [trackSort, setTrackSort] = useState<TrackSortOption>('name');
  const [trackSortDirection, setTrackSortDirection] = useState<TrackSortDirection>('asc');
  const groupModalTranslateY = useRef(new Animated.Value(1)).current;
  const { theme } = useAppSettings();
  const { currentSong, playing, playSong, togglePlayPause, setSelectionModeActive } = useMusicPlayer();

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

    void loadSortPreference(`groups:${mode}`, { sort: 'name', direction: 'asc' }).then(preference => {
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

  useEffect(() => {
    if (!selectedGroup) {
      return;
    }

    setGroupModalVisible(true);
    groupModalTranslateY.setValue(1);
    Animated.timing(groupModalTranslateY, {
      toValue: 0,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [groupModalTranslateY, selectedGroup]);

  const albumGroups = useMemo(() => buildGroups(songs, 'albums'), [songs]);
  const artistGroups = useMemo(() => buildGroups(songs, 'artists'), [songs]);
  const groups = useMemo(() => buildGroups(songs, mode), [mode, songs]);
  const isVisualGridMode = mode === 'albums' || mode === 'artists';
  const selectedSongs = useMemo(
    () => selectedSongIds.map(songId => songs.find(song => song.id === songId)).filter(Boolean) as Song[],
    [selectedSongIds, songs]
  );
  const isSelectionMode = selectedSongIds.length > 0;

  useEffect(() => {
    setSelectionModeActive(isSelectionMode);

    return () => setSelectionModeActive(false);
  }, [isSelectionMode, setSelectionModeActive]);

  const sortedGroups = useMemo(() => {
    const directionMultiplier = trackSortDirection === 'asc' ? 1 : -1;

    return [...groups].sort((a, b) => {
      const firstSongA = a.songs[0];
      const firstSongB = b.songs[0];

      if (trackSort === 'date') {
        return directionMultiplier * (getSongDate(firstSongA) - getSongDate(firstSongB) || a.name.localeCompare(b.name));
      }

      if (trackSort === 'artist') {
        return directionMultiplier * (compareText(firstSongA?.artist, firstSongB?.artist, UNKNOWN_ARTIST) || a.name.localeCompare(b.name));
      }

      if (trackSort === 'albums') {
        return directionMultiplier * (compareText(firstSongA?.album, firstSongB?.album, UNKNOWN_ALBUM) || a.name.localeCompare(b.name));
      }

      return directionMultiplier * a.name.localeCompare(b.name);
    });
  }, [groups, trackSort, trackSortDirection]);

  const handleTrackSortChange = (option: TrackSortOption, direction: TrackSortDirection) => {
    setTrackSort(option);
    setTrackSortDirection(direction);
    void saveSortPreference(`groups:${mode}`, { sort: option, direction });
  };

  const openGroup = (group: SongGroup) => {
    if (!group.songs.length) {
      return;
    }

    setSelectedGroup(group);
  };

  const closeSelectedGroup = () => {
    Animated.timing(groupModalTranslateY, {
      toValue: 1,
      duration: 500,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setGroupModalVisible(false);
        setSelectedGroup(null);
      }
    });
  };

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

  const openTrackMenuGroup = (song: Song, groupMode: 'albums' | 'artists') => {
    closeTrackMenu();
    const groupName = groupMode === 'albums' ? normalizeValue(song.album, UNKNOWN_ALBUM) : normalizeValue(song.artist, UNKNOWN_ARTIST);
    const targetGroup = (groupMode === 'albums' ? albumGroups : artistGroups).find(group => group.name === groupName);

    if (targetGroup) openGroup(targetGroup);
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
      if (!deleted) return;

      setSongs(currentSongs => currentSongs.filter(currentSong => currentSong.id !== song.id));

      if (selectedGroup?.songs.some(currentSong => currentSong.id === song.id)) {
        const remainingSongs = selectedGroup.songs.filter(currentSong => currentSong.id !== song.id);

        if (remainingSongs.length === 0) {
          closeSelectedGroup();
        } else {
          setSelectedGroup({ ...selectedGroup, songs: remainingSongs });
        }
      }
    });
  };

  const showTrackDetails = (song: Song) => {
    closeTrackMenu();
    setDetailsSong(song);
  };

  const defineTrackAs = async (song: Song, type: ToneType) => {
    await setAudioAsTone(song.id, type);
    setDefineAsSong(null);
  };

  const renderTopNav = () => {
    const props = {
      selectedSort: trackSort,
      selectedDirection: trackSortDirection,
      onSortChange: handleTrackSortChange,
    };

    if (mode === 'albums') {
      return <TopNavAlbumes {...props} />;
    }

    if (mode === 'artists') {
      return <TopNavArtistas {...props} />;
    }

    return <TopNavCarpetas {...props} />;
  };

  const selectedGroupModal = (
    <LibraryGroupDetailModal
      visible={groupModalVisible}
      group={selectedGroup}
      translateY={groupModalTranslateY}
      variant={mode === 'artists' ? 'artist' : mode === 'folders' ? 'folder' : 'album'}
      contentBottomPadding={isSelectionMode ? SELECTION_BAR_BOTTOM_INSET : MINI_PLAYER_BOTTOM_INSET}
      onClose={closeSelectedGroup}
      onPlayAll={selectedGroup ? () => playFromList(selectedGroup.songs, 0) : undefined}
      renderItem={({ item, index }) => {
        const isSelected = selectedSongIds.includes(item.id);

        return (
          <SongListItem
            item={item}
            isActive={currentSong?.id === item.id}
            isPlaying={currentSong?.id === item.id && playing}
            isSelected={isSelected}
            onPress={() => isSelectionMode ? toggleSelectedSong(item) : playFromList(selectedGroup!.songs, index)}
            onLongPress={() => startSongSelection(item)}
            onTogglePlayPause={togglePlayPause}
            showDuration={false}
            showSelectionIndicator={isSelectionMode}
            onOpenTrackMenu={isSelectionMode ? undefined : openTrackMenu}
          />
        );
      }}
    >
      <SelectedSongsActionBar
        visible={isSelectionMode}
        onPlay={playSelectedSongs}
        onAdd={openSelectedSongsPlaylistModal}
        onShare={shareSelectedSongs}
        onDelete={confirmDeleteSelectedSongs}
      />
    </LibraryGroupDetailModal>
  );

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
          Se requieren permisos para leer tu música.
        </Text>
        <Pressable 
          className="mt-4 rounded-full px-6 py-2" 
          style={{ backgroundColor: theme.surface }}
          onPress={() => void requestPermissionsAndLoadMusic()}
        >
          <Text style={{ color: theme.text }}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (showPlayer && currentSong) {
    return <PlayerScreen onBack={() => setShowPlayer(false)} />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <FlatList
        key={isVisualGridMode ? `${mode}-grid` : 'group-list'}
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        data={sortedGroups}
        keyExtractor={item => item.id}
        numColumns={isVisualGridMode ? 2 : 1}
        columnWrapperStyle={isVisualGridMode ? { paddingHorizontal: 20, gap: 14 } : undefined}
        ListHeaderComponent={renderTopNav()}
        ListEmptyComponent={
          <Text className="px-5 py-8 text-center" style={{ color: theme.mutedText }}>
            No hay elementos para mostrar.
          </Text>
        }
        contentContainerStyle={{ paddingBottom: isSelectionMode ? SELECTION_BAR_BOTTOM_INSET : MINI_PLAYER_BOTTOM_INSET }}
        renderItem={({ item }) => isVisualGridMode ? (
          <LibraryGroupGridCard group={item} isArtist={mode === 'artists'} onPress={() => openGroup(item)} />
        ) : (
          <LibraryGroupListItem group={item} onPress={() => openGroup(item)} />
        )}
      />

      <SelectedSongsActionBar
        visible={isSelectionMode && !groupModalVisible}
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
        onOpenGroup={openTrackMenuGroup}
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

      <ConfirmDeleteModal
        visible={bulkDeleteVisible}
        title="Eliminar canciones"
        message={`¿Quieres eliminar ${selectedSongIds.length} ${selectedSongIds.length === 1 ? 'canción' : 'canciones'}? Esta acción no se puede deshacer.`}
        onClose={() => setBulkDeleteVisible(false)}
        onConfirm={performBulkDelete}
      />

      {selectedGroupModal}
    </View>
  );
};

export default GroupedLibraryScreen;
