import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  GestureResponderEvent,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { deleteAudioFile, getAudioFiles, setAudioAsTone, shareAudioFile, Song, ToneType } from '../../modules/local-music';
import { musicPlayer, useMusicPlayer } from '../audio/musicPlayer';
import AddSongToPlaylistModal from '../components/AddSongToPlaylistModal';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import DefineAsModal from '../components/DefineAsModal';
import LibraryPlaylistCard from '../components/LibraryPlaylistCard';
import LibraryPlaylistListItem from '../components/LibraryPlaylistListItem';
import PlaylistActionModal from '../components/PlaylistActionModal';
import PlaylistSongSelectorModal, { PlaylistSelectionTab } from '../components/PlaylistSongSelectorModal';
import SelectedSongsActionBar from '../components/SelectedSongsActionBar';
import SongListItem from '../components/SongListItem';
import TrackActionMenu from '../components/TrackActionMenu';
import TopNavPlaylist, { TrackSortDirection, TrackSortOption } from '../components/TopNavPlaylist';
import { formatDuration } from '../utils/time';
import PlayerScreen from './PlayerScreen';

type SongGroup = {
  id: string;
  name: string;
  subtitle: string;
  songs: Song[];
  artwork?: string | null;
};

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

const UNKNOWN_ALBUM = 'Álbum Desconocido';
const UNKNOWN_ARTIST = 'Artista Desconocido';
const UNKNOWN_FOLDER = 'Carpeta Desconocida';
const CUSTOM_PLAYLISTS_STORAGE_KEY = '@fesa:custom-playlists';
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MOST_PLAYED_HOME_LIMIT = 7;

const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const cleanValue = value?.trim();

  return cleanValue || fallback;
};

const getSongDate = (song: Song) => song.dateModified ?? song.dateAdded ?? 0;

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

const buildGroups = (songs: Song[], mode: 'artists' | 'albums' | 'folders') => {
  const groups = new Map<string, SongGroup>();

  songs.forEach(song => {
    const name = mode === 'artists'
      ? normalizeValue(song.artist, UNKNOWN_ARTIST)
      : mode === 'albums'
        ? normalizeValue(song.album, UNKNOWN_ALBUM)
        : getFolderName(song.url);

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

const PlaylistLibraryScreen = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [storedPlaylists, setStoredPlaylists] = useState<StoredPlaylist[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [trackMenu, setTrackMenu] = useState<TrackMenuState | null>(null);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);
  const [addToPlaylistVisible, setAddToPlaylistVisible] = useState(false);
  const [defineAsSong, setDefineAsSong] = useState<Song | null>(null);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [mostPlayedSongs, setMostPlayedSongs] = useState<Song[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SongGroup | null>(null);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [playlistEditMode, setPlaylistEditMode] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [trackSort, setTrackSort] = useState<TrackSortOption>('name');
  const [trackSortDirection, setTrackSortDirection] = useState<TrackSortDirection>('asc');
  const [createPlaylistVisible, setCreatePlaylistVisible] = useState(false);
  const [playlistSongSelectorVisible, setPlaylistSongSelectorVisible] = useState(false);
  const [playlistSelectionTab, setPlaylistSelectionTab] = useState<PlaylistSelectionTab>('tracks');
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDraftSongIds, setPlaylistDraftSongIds] = useState<string[]>([]);
  const [playlistEditingId, setPlaylistEditingId] = useState<string | null>(null);
  const groupModalTranslateY = useRef(new Animated.Value(1)).current;
  const { currentSong, playing, playSong, togglePlayPause, setSelectionModeActive } = useMusicPlayer();

  useEffect(() => {
    const requestPermissionsAndLoadMusic = async () => {
      try {
        let granted = false;

        if (Platform.OS === 'android') {
          const permission = Platform.Version >= 33
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

          const result = await PermissionsAndroid.request(permission);
          granted = result === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          granted = true;
        }

        if (granted) {
          setPermissionGranted(true);
          const music = await getAudioFiles();
          setSongs(music);
        }
      } catch (error) {
        console.error('Error al obtener música:', error);
      } finally {
        setLoading(false);
      }
    };

    requestPermissionsAndLoadMusic();
  }, []);

  const loadStoredPlaylists = async () => {
    try {
      const storedValue = await AsyncStorage.getItem(CUSTOM_PLAYLISTS_STORAGE_KEY);
      const parsedPlaylists = storedValue ? JSON.parse(storedValue) : [];

      if (Array.isArray(parsedPlaylists)) {
        setStoredPlaylists(parsedPlaylists);
      }
    } catch (error) {
      console.warn('No se pudieron cargar las playlists:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadStoredPlaylists();
    }, [])
  );

  useEffect(() => {
    const refreshMostPlayed = async () => {
      if (!songs.length) {
        return;
      }

      const mostPlayedIds = await musicPlayer.getMostPlayedSongs(20);
      const nextMostPlayedSongs = mostPlayedIds
        .map(id => songs.find(song => song.id === id))
        .filter(Boolean)
        .slice(0, 20) as Song[];

      setMostPlayedSongs(nextMostPlayedSongs);
    };

    void refreshMostPlayed();
  }, [songs]);

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

  const songsById = useMemo(() => new Map(songs.map(song => [song.id, song])), [songs]);
  const artistGroups = useMemo(() => buildGroups(songs, 'artists'), [songs]);
  const albumGroups = useMemo(() => buildGroups(songs, 'albums'), [songs]);
  const folderGroups = useMemo(() => buildGroups(songs, 'folders'), [songs]);

  const defaultPlaylists = useMemo<SongGroup[]>(() => {
    const recentlyAddedSongs = [...songs]
      .sort((a, b) => getSongDate(b) - getSongDate(a))
      .slice(0, 10);
    const homeMostPlayedSongs = mostPlayedSongs.slice(0, MOST_PLAYED_HOME_LIMIT);

    return [
      {
        id: 'default-recently-added',
        name: 'Recién añadidas',
        subtitle: `${recentlyAddedSongs.length} ${recentlyAddedSongs.length === 1 ? 'canción' : 'canciones'}`,
        songs: recentlyAddedSongs,
        artwork: recentlyAddedSongs[0]?.artwork,
      },
      {
        id: 'default-most-played',
        name: 'Más escuchadas',
        subtitle: `${homeMostPlayedSongs.length} ${homeMostPlayedSongs.length === 1 ? 'canción' : 'canciones'}`,
        songs: homeMostPlayedSongs,
        artwork: homeMostPlayedSongs[0]?.artwork,
      },
    ];
  }, [mostPlayedSongs, songs]);

  const customPlaylists = useMemo<SongGroup[]>(() => storedPlaylists.map(playlist => {
    const playlistSongs = playlist.songIds
      .map(songId => songsById.get(songId))
      .filter(Boolean) as Song[];

    return {
      id: playlist.id,
      name: playlist.name,
      subtitle: `${playlistSongs.length} ${playlistSongs.length === 1 ? 'canción' : 'canciones'}`,
      songs: playlistSongs,
      artwork: playlistSongs[0]?.artwork,
    };
  }), [songsById, storedPlaylists]);

  const selectedCustomPlaylists = useMemo(
    () => storedPlaylists.filter(playlist => selectedPlaylistIds.includes(playlist.id)),
    [selectedPlaylistIds, storedPlaylists]
  );
  const selectedCustomPlaylist = selectedCustomPlaylists.length === 1 ? selectedCustomPlaylists[0] : null;
  const isPlaylistSelectionMode = selectedPlaylistIds.length > 0;
  const selectedSongs = useMemo(
    () => selectedSongIds.map(songId => songsById.get(songId)).filter(Boolean) as Song[],
    [selectedSongIds, songsById]
  );
  const isSelectionMode = selectedSongIds.length > 0;

  useEffect(() => {
    setSelectionModeActive(isSelectionMode || isPlaylistSelectionMode);

    return () => setSelectionModeActive(false);
  }, [isPlaylistSelectionMode, isSelectionMode, setSelectionModeActive]);

  const sortedCustomPlaylists = useMemo(() => {
    const directionMultiplier = trackSortDirection === 'asc' ? 1 : -1;

    return [...customPlaylists].sort((a, b) => {
      if (trackSort === 'date') {
        const playlistA = storedPlaylists.find(playlist => playlist.id === a.id);
        const playlistB = storedPlaylists.find(playlist => playlist.id === b.id);

        return directionMultiplier * ((playlistA?.updatedAt ?? 0) - (playlistB?.updatedAt ?? 0) || a.name.localeCompare(b.name));
      }

      return directionMultiplier * a.name.localeCompare(b.name);
    });
  }, [customPlaylists, storedPlaylists, trackSort, trackSortDirection]);

  const persistStoredPlaylists = async (nextPlaylists: StoredPlaylist[]) => {
    setStoredPlaylists(nextPlaylists);

    try {
      await AsyncStorage.setItem(CUSTOM_PLAYLISTS_STORAGE_KEY, JSON.stringify(nextPlaylists));
    } catch (error) {
      console.warn('No se pudieron guardar las playlists:', error);
    }
  };

  const openCreatePlaylist = () => {
    setPlaylistEditingId(null);
    setPlaylistName('');
    setPlaylistDraftSongIds([]);
    setPlaylistSelectionTab('tracks');
    setCreatePlaylistVisible(true);
  };

  const closeCreatePlaylistFlow = () => {
    setCreatePlaylistVisible(false);
    setPlaylistSongSelectorVisible(false);
    setPlaylistName('');
    setPlaylistDraftSongIds([]);
    setPlaylistEditingId(null);
  };

  const openPlaylistSongSelector = () => {
    if (!playlistName.trim()) {
      return;
    }

    setCreatePlaylistVisible(false);
    setPlaylistSongSelectorVisible(true);
  };

  const savePlaylist = async () => {
    const cleanName = playlistName.trim();

    if (!cleanName) {
      return;
    }

    const now = Date.now();
    const nextPlaylists = playlistEditingId
      ? storedPlaylists.map(playlist => playlist.id === playlistEditingId
        ? { ...playlist, name: cleanName, songIds: playlistDraftSongIds, updatedAt: now }
        : playlist)
      : [{ id: `playlist-${now}`, name: cleanName, songIds: playlistDraftSongIds, createdAt: now, updatedAt: now }, ...storedPlaylists];

    await persistStoredPlaylists(nextPlaylists);
    closeCreatePlaylistFlow();
  };

  const togglePlaylistDraftSong = (song: Song) => {
    setPlaylistDraftSongIds(currentIds => currentIds.includes(song.id)
      ? currentIds.filter(songId => songId !== song.id)
      : [...currentIds, song.id]
    );
  };

  const togglePlaylistDraftGroup = (group: SongGroup) => {
    const groupSongIds = group.songs.map(song => song.id);
    const allSelected = groupSongIds.every(songId => playlistDraftSongIds.includes(songId));

    setPlaylistDraftSongIds(currentIds => allSelected
      ? currentIds.filter(songId => !groupSongIds.includes(songId))
      : [...currentIds, ...groupSongIds.filter(songId => !currentIds.includes(songId))]
    );
  };

  const togglePlaylistSelection = (playlist: SongGroup) => {
    setSelectedPlaylistIds(currentIds => currentIds.includes(playlist.id)
      ? currentIds.filter(playlistId => playlistId !== playlist.id)
      : [...currentIds, playlist.id]
    );
  };

  const closePlaylistActions = () => setSelectedPlaylistIds([]);

  const openPlaylistSongSelectorForEdit = (playlistId: string) => {
    const playlist = storedPlaylists.find(current => current.id === playlistId);

    if (!playlist) {
      return;
    }

    setPlaylistEditingId(playlist.id);
    setPlaylistName(playlist.name);
    setPlaylistDraftSongIds(playlist.songIds);
    setPlaylistSelectionTab('tracks');
    closePlaylistActions();
    setPlaylistSongSelectorVisible(true);
  };

  const openSelectedPlaylistEditor = () => {
    if (!selectedCustomPlaylist) {
      return;
    }

    const playlist = customPlaylists.find(current => current.id === selectedCustomPlaylist.id);

    if (!playlist) {
      return;
    }

    setPlaylistEditMode(true);
    closePlaylistActions();
    setSelectedGroup(playlist);
  };

  const deleteSelectedPlaylists = async (playlistIds: string[]) => {
    try {
      const storedValue = await AsyncStorage.getItem(CUSTOM_PLAYLISTS_STORAGE_KEY);
      const parsedPlaylists = storedValue ? JSON.parse(storedValue) : storedPlaylists;
      const latestPlaylists = Array.isArray(parsedPlaylists) ? parsedPlaylists as StoredPlaylist[] : storedPlaylists;
      const nextPlaylists = latestPlaylists.filter(playlist => !playlistIds.includes(playlist.id));

      await persistStoredPlaylists(nextPlaylists);
    } catch (error) {
      console.warn('No se pudieron eliminar las playlists:', error);
    }
  };

  const confirmDeleteSelectedPlaylist = () => {
    const playlistIdsToDelete = [...selectedPlaylistIds];

    if (!playlistIdsToDelete.length) {
      return;
    }

    const playlistCount = playlistIdsToDelete.length;
    const title = playlistCount === 1 ? 'Eliminar playlist' : 'Eliminar playlists';
    const message = playlistCount === 1 && selectedCustomPlaylist
      ? `¿Quieres eliminar “${selectedCustomPlaylist.name}”?`
      : `¿Quieres eliminar ${playlistCount} playlists?`;

    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deleteSelectedPlaylists(playlistIdsToDelete);
          closePlaylistActions();
        },
      },
    ]);
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    await persistStoredPlaylists(storedPlaylists.map(playlist => playlist.id === playlistId
      ? { ...playlist, songIds: playlist.songIds.filter(id => id !== songId), updatedAt: Date.now() }
      : playlist
    ));
  };

  const confirmRemoveSongFromPlaylist = (playlistId: string, song: Song) => {
    Alert.alert('Quitar de playlist', `¿Quieres quitar “${song.title}” de esta playlist?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => { void removeSongFromPlaylist(playlistId, song.id); } },
    ]);
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
        setPlaylistEditMode(false);
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
    Alert.alert('Eliminar canciones', `¿Quieres eliminar ${selectedSongIds.length} ${selectedSongIds.length === 1 ? 'canción' : 'canciones'}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          const idsToDelete = [...selectedSongIds];
          idsToDelete.forEach(songId => {
            void deleteAudioFile(songId).then(deleted => {
              if (deleted) setSongs(currentSongs => currentSongs.filter(currentSong => currentSong.id !== songId));
            });
          });
          void persistStoredPlaylists(storedPlaylists.map(playlist => ({ ...playlist, songIds: playlist.songIds.filter(songId => !idsToDelete.includes(songId)), updatedAt: Date.now() })));
          clearSelectedSongs();
        },
      },
    ]);
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

    if (storedPlaylists.length) {
      setAddToPlaylistVisible(true);
      return;
    }

    setPlaylistDraftSongIds(selectedSongIds);
    setPlaylistSelectionTab('tracks');
    setCreatePlaylistVisible(true);
  };

  const openTrackMenuGroup = (song: Song, groupMode: 'albums' | 'artists') => {
    closeTrackMenu();
    const groupName = groupMode === 'albums'
      ? normalizeValue(song.album, UNKNOWN_ALBUM)
      : normalizeValue(song.artist, UNKNOWN_ARTIST);
    const targetGroup = (groupMode === 'albums' ? albumGroups : artistGroups).find(group => group.name === groupName);

    if (targetGroup) {
      openGroup(targetGroup);
    }
  };

  const openAddToPlaylist = (song: Song) => {
    closeTrackMenu();
    setAddToPlaylistSong(song);
    setPlaylistName('');
    setAddToPlaylistVisible(Boolean(storedPlaylists.length));

    if (!storedPlaylists.length) {
      setPlaylistDraftSongIds([song.id]);
      setPlaylistSelectionTab('tracks');
      setCreatePlaylistVisible(true);
    }
  };

  const addTrackToPlaylist = async (playlistId: string) => {
    const songIdsToAdd = addToPlaylistSong ? [addToPlaylistSong.id] : selectedSongIds;
    if (!songIdsToAdd.length) return;
    await persistStoredPlaylists(storedPlaylists.map(playlist => playlist.id === playlistId
      ? { ...playlist, songIds: [...playlist.songIds, ...songIdsToAdd.filter(songId => !playlist.songIds.includes(songId))], updatedAt: Date.now() }
      : playlist));
    setAddToPlaylistVisible(false);
    setAddToPlaylistSong(null);
    clearSelectedSongs();
  };

  const createPlaylistFromTrack = () => {
    const songIdsToAdd = addToPlaylistSong ? [addToPlaylistSong.id] : selectedSongIds;
    if (!songIdsToAdd.length) return;
    setAddToPlaylistVisible(false);
    setPlaylistName('');
    setPlaylistDraftSongIds(songIdsToAdd);
    setPlaylistSelectionTab('tracks');
    setCreatePlaylistVisible(true);
  };

  const deleteTrack = (song: Song) => {
    Alert.alert('Eliminar canción', `¿Quieres eliminar “${song.title}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        closeTrackMenu();
        void deleteAudioFile(song.id).then(deleted => {
          if (!deleted) return;
          setSongs(currentSongs => currentSongs.filter(currentSong => currentSong.id !== song.id));
          setMostPlayedSongs(currentSongs => currentSongs.filter(currentSong => currentSong.id !== song.id));
          void persistStoredPlaylists(storedPlaylists.map(playlist => ({ ...playlist, songIds: playlist.songIds.filter(songId => songId !== song.id), updatedAt: Date.now() })));
        });
      } },
    ]);
  };

  const showTrackDetails = (song: Song) => {
    closeTrackMenu();
    Alert.alert(song.title, `Artista: ${normalizeValue(song.artist, UNKNOWN_ARTIST)}\nÁlbum: ${normalizeValue(song.album, UNKNOWN_ALBUM)}\nDuración: ${formatDuration(song.duration)}\nRuta: ${song.url}`);
  };

  const defineTrackAs = async (song: Song, type: ToneType) => {
    await setAudioAsTone(song.id, type);
    setDefineAsSong(null);
  };

  const playSelectedPlaylist = () => {
    if (!selectedCustomPlaylist) {
      return;
    }

    const playlist = customPlaylists.find(current => current.id === selectedCustomPlaylist.id);

    if (!playlist?.songs.length) {
      return;
    }

    closePlaylistActions();
    playFromList(playlist.songs, 0);
  };

  const renderEditablePlaylistSong = (playlistId: string, list: Song[]) => ({ item, index }: { item: Song; index: number }) => (
    <SongListItem
      item={item}
      isActive={currentSong?.id === item.id}
      isPlaying={currentSong?.id === item.id && playing}
      onPress={() => playFromList(list, index)}
      onTogglePlayPause={togglePlayPause}
      showDuration={false}
      rightAction={
        <Pressable
          className="h-9 w-9 items-center justify-center rounded-full bg-[#333333]"
          onPress={() => confirmRemoveSongFromPlaylist(playlistId, item)}
        >
          <Text className="text-xl font-bold text-[#b64400]">×</Text>
        </Pressable>
      }
    />
  );

  const selectedGroupList = selectedGroup ? (
    <FlatList
      className="flex-1 bg-[#1d1d1f]"
      data={selectedGroup.songs}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <View className="px-5 pb-4 pt-5">
          <Pressable className="mb-4 self-start" onPress={closeSelectedGroup}>
            <Text className="text-base font-bold text-white">‹ Volver</Text>
          </Pressable>
          <Text className="text-2xl font-bold text-white">{selectedGroup.name}</Text>
          <Text className="mt-1 text-sm text-[#707070]">{selectedGroup.subtitle}</Text>
        </View>
      }
      contentContainerStyle={{ paddingBottom: isSelectionMode ? 110 : 20 }}
      renderItem={playlistEditMode ? renderEditablePlaylistSong(selectedGroup.id, selectedGroup.songs) : ({ item, index }) => {
        const isSelected = selectedSongIds.includes(item.id);

        return (
          <SongListItem
            item={item}
            isActive={currentSong?.id === item.id}
            isPlaying={currentSong?.id === item.id && playing}
            isSelected={isSelected}
            onPress={() => isSelectionMode ? toggleSelectedSong(item) : playFromList(selectedGroup.songs, index)}
            onLongPress={() => startSongSelection(item)}
            onTogglePlayPause={togglePlayPause}
            showDuration={false}
            showSelectionIndicator={isSelectionMode}
            onOpenTrackMenu={isSelectionMode ? undefined : openTrackMenu}
          />
        );
      }} 
    />
  ) : null;

  const selectedGroupModal = (
    <Modal
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      visible={groupModalVisible}
      onRequestClose={closeSelectedGroup}
    >
      <Animated.View
        className="flex-1 bg-[#1d1d1f]"
        style={{
          transform: [
            {
              translateY: groupModalTranslateY.interpolate({
                inputRange: [0, 1],
                outputRange: [0, SCREEN_HEIGHT],
              }),
            },
          ],
        }}
      >
        {selectedGroupList}
        <SelectedSongsActionBar
          visible={!playlistEditMode && isSelectionMode}
          onPlay={playSelectedSongs}
          onAdd={openSelectedSongsPlaylistModal}
          onShare={shareSelectedSongs}
          onDelete={confirmDeleteSelectedSongs}
        />
      </Animated.View>
    </Modal>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#1d1d1f]">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View className="flex-1 items-center justify-center bg-[#1d1d1f] px-5">
        <Text className="text-center text-base text-[#b64400]">
          Se requieren permisos para leer tu música.
        </Text>
      </View>
    );
  }

  if (showPlayer && currentSong) {
    return <PlayerScreen onBack={() => setShowPlayer(false)} />;
  }

  return (
    <View className="flex-1 bg-[#1d1d1f]">
      <FlatList
        className="flex-1 bg-[#1d1d1f]"
        data={sortedCustomPlaylists}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View>
            <TopNavPlaylist
              selectedSort={trackSort}
              selectedDirection={trackSortDirection}
              onSortChange={(option, direction) => {
                setTrackSort(option);
                setTrackSortDirection(direction);
              }}
              onCreatePlaylist={openCreatePlaylist}
            />
            <View className="px-5 pb-2 pt-4">
              <View className="flex-row gap-4">
                {defaultPlaylists.map(playlist => (
                  <LibraryPlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onPress={() => openGroup(playlist)}
                  />
                ))}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text className="px-5 py-6 text-center text-[#707070]">No has creado playlists todavía.</Text>
        }
        contentContainerStyle={{ paddingBottom: isPlaylistSelectionMode ? 130 : 20 }}
        renderItem={({ item }) => (
          <LibraryPlaylistListItem
            playlist={item}
            isSelected={selectedPlaylistIds.includes(item.id)}
            onPress={() => isPlaylistSelectionMode ? togglePlaylistSelection(item) : openGroup(item)}
            onLongPress={() => togglePlaylistSelection(item)}
            onActionsPress={() => togglePlaylistSelection(item)}
          />
        )}
      />

      {selectedGroupModal}

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
        onCreatePlaylist={createPlaylistFromTrack}
      />

      <DefineAsModal
        song={defineAsSong}
        onClose={() => setDefineAsSong(null)}
        onDefineAs={(song, type) => { void defineTrackAs(song, type); }}
      />

      <CreatePlaylistModal
        visible={createPlaylistVisible}
        playlistName={playlistName}
        onChangePlaylistName={setPlaylistName}
        onClose={closeCreatePlaylistFlow}
        onNext={openPlaylistSongSelector}
      />

      <PlaylistSongSelectorModal
        visible={playlistSongSelectorVisible}
        playlistName={playlistName}
        selectedSongIds={playlistDraftSongIds}
        activeTab={playlistSelectionTab}
        songs={songs}
        artistGroups={artistGroups}
        albumGroups={albumGroups}
        folderGroups={folderGroups}
        isEditing={Boolean(playlistEditingId)}
        onClose={closeCreatePlaylistFlow}
        onTabChange={setPlaylistSelectionTab}
        onToggleSong={togglePlaylistDraftSong}
        onToggleGroup={togglePlaylistDraftGroup}
        onSave={() => { void savePlaylist(); }}
      />

      <PlaylistActionModal
        playlist={selectedCustomPlaylist}
        selectedCount={selectedPlaylistIds.length}
        onClose={closePlaylistActions}
        onPlay={playSelectedPlaylist}
        onAdd={playlistId => openPlaylistSongSelectorForEdit(playlistId)}
        onEdit={openSelectedPlaylistEditor}
        onDelete={confirmDeleteSelectedPlaylist}
      />
    </View>
  );
};

export default PlaylistLibraryScreen;