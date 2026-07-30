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
import { useMusicPlayer } from '../audio/musicPlayer';
import AddSongToPlaylistModal from '../components/AddSongToPlaylistModal';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import DefineAsModal from '../components/DefineAsModal';
import LibraryGroupGridCard from '../components/LibraryGroupGridCard';
import LibraryGroupListItem from '../components/LibraryGroupListItem';
import SelectedSongsActionBar from '../components/SelectedSongsActionBar';
import SongListItem from '../components/SongListItem';
import TopNavAlbumes from '../components/TopNavAlbumes';
import TrackActionMenu from '../components/TrackActionMenu';
import TopNavArtistas from '../components/TopNavArtistas';
import TopNavCarpetas from '../components/TopNavCarpetas';
import { TrackSortDirection, TrackSortOption } from '../components/TopNavPistas';
import { formatDuration } from '../utils/time';
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
const SCREEN_HEIGHT = Dimensions.get('window').height;

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

const getGroupName = (song: Song, mode: GroupedLibraryMode) => {
  if (mode === 'albums') {
    return normalizeValue(song.album, UNKNOWN_ALBUM);
  }

  if (mode === 'artists') {
    return normalizeValue(song.artist, UNKNOWN_ARTIST);
  }

  return getFolderName(song.url);
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
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [trackSort, setTrackSort] = useState<TrackSortOption>('name');
  const [trackSortDirection, setTrackSortDirection] = useState<TrackSortDirection>('asc');
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

  useFocusEffect(
    useCallback(() => {
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
    Alert.alert('Eliminar canciones', `¿Quieres eliminar ${selectedSongIds.length} ${selectedSongIds.length === 1 ? 'canción' : 'canciones'}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        const idsToDelete = [...selectedSongIds];
        idsToDelete.forEach(songId => { void deleteAudioFile(songId); });
        setSongs(currentSongs => currentSongs.filter(song => !idsToDelete.includes(song.id)));
        clearSelectedSongs();
      } },
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
    Alert.alert('Eliminar canción', `¿Quieres eliminar “${song.title}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        closeTrackMenu();
        void deleteAudioFile(song.id).then(deleted => {
          if (deleted) setSongs(currentSongs => currentSongs.filter(currentSong => currentSong.id !== song.id));
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
      renderItem={({ item, index }) => {
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
          visible={isSelectionMode}
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
        key={isVisualGridMode ? `${mode}-grid` : 'group-list'}
        className="flex-1 bg-[#1d1d1f]"
        data={sortedGroups}
        keyExtractor={item => item.id}
        numColumns={isVisualGridMode ? 2 : 1}
        columnWrapperStyle={isVisualGridMode ? { paddingHorizontal: 20, gap: 14 } : undefined}
        ListHeaderComponent={renderTopNav()}
        ListEmptyComponent={
          <Text className="px-5 py-8 text-center text-[#707070]">No hay elementos para mostrar.</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
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

      {selectedGroupModal}
    </View>
  );
};

export default GroupedLibraryScreen;