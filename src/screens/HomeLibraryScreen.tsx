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
  ScrollView,
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
import HomeFavoriteArtistsSection from '../components/HomeFavoriteArtistsSection';
import HomeMostPlayedSection from '../components/HomeMostPlayedSection';
import HomeRecommendedAlbumsSection from '../components/HomeRecommendedAlbumsSection';
import HomeRecommendedArtistsSection from '../components/HomeRecommendedArtistsSection';
import HomeRecommendedSongsCarousel from '../components/HomeRecommendedSongsCarousel';
import HomeRecentlyAddedSection from '../components/HomeRecentlyAddedSection';
import SelectedSongsActionBar from '../components/SelectedSongsActionBar';
import SongListItem from '../components/SongListItem';
import TrackActionMenu from '../components/TrackActionMenu';
import { formatDuration } from '../utils/time';
import PlayerScreen from './PlayerScreen';

type SongGroup = {
  id: string;
  name: string;
  subtitle: string;
  songs: Song[];
  artwork?: string | null;
};

type LibraryGroupMode = 'albums' | 'artists';

type StoredPlaylist = {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
  updatedAt: number;
};

type TrackMenuState = {
  song: Song;
  x: number;
  y: number;
};

const UNKNOWN_ALBUM = 'Álbum Desconocido';
const UNKNOWN_ARTIST = 'Artista Desconocido';
const CUSTOM_PLAYLISTS_STORAGE_KEY = '@fesa:custom-playlists';
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MOST_PLAYED_HOME_LIMIT = 7;

const normalizeValue = (value: string | null | undefined, fallback: string) => {
  const cleanValue = value?.trim();

  return cleanValue || fallback;
};

const getSongDate = (song: Song) => song.dateModified ?? song.dateAdded ?? 0;

const shuffleList = <T,>(list: T[]) => {
  const shuffled = [...list];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
};

const getGroupName = (song: Song, mode: LibraryGroupMode) => {
  if (mode === 'albums') {
    return normalizeValue(song.album, UNKNOWN_ALBUM);
  }

  return normalizeValue(song.artist, UNKNOWN_ARTIST);
};

const buildGroups = (songs: Song[], mode: LibraryGroupMode) => {
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

const HomeLibraryScreen = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SongGroup | null>(null);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [mostPlayedSongs, setMostPlayedSongs] = useState<Song[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<SongGroup[]>([]);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [recommendedAlbums, setRecommendedAlbums] = useState<SongGroup[]>([]);
  const [recommendedArtists, setRecommendedArtists] = useState<SongGroup[]>([]);
  const [storedPlaylists, setStoredPlaylists] = useState<StoredPlaylist[]>([]);
  const [trackMenu, setTrackMenu] = useState<TrackMenuState | null>(null);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);
  const [addToPlaylistVisible, setAddToPlaylistVisible] = useState(false);
  const [createPlaylistVisible, setCreatePlaylistVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [defineAsSong, setDefineAsSong] = useState<Song | null>(null);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
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

  const albumGroups = useMemo(() => buildGroups(songs, 'albums'), [songs]);
  const artistGroups = useMemo(() => buildGroups(songs, 'artists'), [songs]);

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

  const refreshHomeListeningStats = async () => {
    if (!songs.length) {
      return;
    }

    const mostPlayedIds = await musicPlayer.getMostPlayedSongs(20);
    const nextMostPlayedSongs = mostPlayedIds
      .map(id => songs.find(song => song.id === id))
      .filter(Boolean)
      .slice(0, 20) as Song[];

    setMostPlayedSongs(nextMostPlayedSongs);

    const artistPlayCounts = new Map<string, number>();
    nextMostPlayedSongs.forEach((song, index) => {
      const artist = normalizeValue(song.artist, UNKNOWN_ARTIST);
      artistPlayCounts.set(artist, (artistPlayCounts.get(artist) ?? 0) + (nextMostPlayedSongs.length - index));
    });

    const artistGroupsFromPlayed = [...artistPlayCounts.keys()]
      .sort((a, b) => (artistPlayCounts.get(b) ?? 0) - (artistPlayCounts.get(a) ?? 0))
      .map(artistName => artistGroups.find(group => group.name === artistName))
      .filter(Boolean)
      .slice(0, 7) as SongGroup[];

    setFavoriteArtists(artistGroupsFromPlayed);
  };

  useEffect(() => {
    if (loading || !permissionGranted) {
      return;
    }

    void refreshHomeListeningStats();
  }, [artistGroups, loading, permissionGranted, songs]);

  useEffect(() => {
    setRecommendedSongs(shuffleList(songs).slice(0, 12));
    setRecommendedAlbums(shuffleList(albumGroups).slice(0, 6));
    setRecommendedArtists(shuffleList(artistGroups).slice(0, 4));
  }, [albumGroups, artistGroups, songs]);

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

  const homeMostPlayed = defaultPlaylists.find(playlist => playlist.id === 'default-most-played') ?? { songs: [] } as SongGroup;
  const homeRecentlyAdded = defaultPlaylists.find(playlist => playlist.id === 'default-recently-added') ?? { songs: [] } as SongGroup;
  const recentSongs = homeRecentlyAdded.songs.slice(0, 10);
  const selectedSongs = useMemo(
    () => selectedSongIds.map(songId => songs.find(song => song.id === songId)).filter(Boolean) as Song[],
    [selectedSongIds, songs]
  );
  const isSelectionMode = selectedSongIds.length > 0;

  useEffect(() => {
    setSelectionModeActive(isSelectionMode);

    return () => setSelectionModeActive(false);
  }, [isSelectionMode, setSelectionModeActive]);

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

    setTimeout(() => {
      void refreshHomeListeningStats();
    }, 500);
  };

  const openTrackMenu = (song: Song, event: GestureResponderEvent) => {
    event.stopPropagation();
    setTrackMenu({
      song,
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
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
        setMostPlayedSongs(currentSongs => currentSongs.filter(song => !idsToDelete.includes(song.id)));
        setRecommendedSongs(currentSongs => currentSongs.filter(song => !idsToDelete.includes(song.id)));
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

  const openTrackMenuGroup = (song: Song, groupMode: LibraryGroupMode) => {
    closeTrackMenu();
    const groupName = getGroupName(song, groupMode);
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
    setCreatePlaylistVisible(!storedPlaylists.length);
  };

  const addTrackToPlaylist = async (playlistId: string) => {
    const songIdsToAdd = addToPlaylistSong ? [addToPlaylistSong.id] : selectedSongIds;
    if (!songIdsToAdd.length) {
      return;
    }

    const nextPlaylists = storedPlaylists.map(playlist => playlist.id === playlistId
      ? {
        ...playlist,
        songIds: [...playlist.songIds, ...songIdsToAdd.filter(songId => !playlist.songIds.includes(songId))],
        updatedAt: Date.now(),
      }
      : playlist);

    await persistStoredPlaylists(nextPlaylists);
    setAddToPlaylistVisible(false);
    setAddToPlaylistSong(null);
    clearSelectedSongs();
  };

  const createPlaylistWithTrack = async () => {
    const cleanName = playlistName.trim();
    const songIdsToAdd = addToPlaylistSong ? [addToPlaylistSong.id] : selectedSongIds;

    if (!cleanName || !songIdsToAdd.length) {
      return;
    }

    const now = Date.now();
    await persistStoredPlaylists([
      { id: `playlist-${now}`, name: cleanName, songIds: songIdsToAdd, createdAt: now, updatedAt: now },
      ...storedPlaylists,
    ]);
    setCreatePlaylistVisible(false);
    setPlaylistName('');
    setAddToPlaylistSong(null);
    clearSelectedSongs();
  };

  const deleteTrack = (song: Song) => {
    Alert.alert('Eliminar canción', `¿Quieres eliminar “${song.title}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          closeTrackMenu();
          void deleteAudioFile(song.id).then(deleted => {
            if (deleted) {
              setSongs(currentSongs => currentSongs.filter(currentSong => currentSong.id !== song.id));
              setMostPlayedSongs(currentSongs => currentSongs.filter(currentSong => currentSong.id !== song.id));
              setRecommendedSongs(currentSongs => currentSongs.filter(currentSong => currentSong.id !== song.id));
            }
          });
        },
      },
    ]);
  };

  const showTrackDetails = (song: Song) => {
    closeTrackMenu();
    Alert.alert(
      song.title,
      `Artista: ${normalizeValue(song.artist, UNKNOWN_ARTIST)}\nÁlbum: ${normalizeValue(song.album, UNKNOWN_ALBUM)}\nDuración: ${formatDuration(song.duration)}\nRuta: ${song.url}`
    );
  };

  const defineTrackAs = async (song: Song, type: ToneType) => {
    await setAudioAsTone(song.id, type);
    setDefineAsSong(null);
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
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
        <HomeMostPlayedSection
          group={homeMostPlayed}
          limit={MOST_PLAYED_HOME_LIMIT}
          onOpenGroup={() => openGroup(homeMostPlayed)}
          onPlaySong={index => playFromList(homeMostPlayed.songs, index)}
        />

        <HomeRecentlyAddedSection
          group={homeRecentlyAdded}
          songs={recentSongs}
          currentSongId={currentSong?.id}
          playing={playing}
          onOpenGroup={() => openGroup(homeRecentlyAdded)}
          onPlaySong={index => playFromList(homeRecentlyAdded.songs, index)}
          onTogglePlayPause={togglePlayPause}
          selectedSongIds={selectedSongIds}
          isSelectionMode={isSelectionMode}
          onToggleSongSelection={toggleSelectedSong}
          onStartSongSelection={startSongSelection}
          onOpenTrackMenu={openTrackMenu}
        />

        <HomeFavoriteArtistsSection artists={favoriteArtists} onOpenArtist={openGroup} />

        <HomeRecommendedAlbumsSection albums={recommendedAlbums} onOpenAlbum={openGroup} />

        <HomeRecommendedArtistsSection artists={recommendedArtists} onOpenArtist={openGroup} />

        <HomeRecommendedSongsCarousel
          songs={recommendedSongs}
          onPlaySong={index => playFromList(recommendedSongs, index)}
        />
      </ScrollView>

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

export default HomeLibraryScreen;