import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, FlatList, Image, Modal, PermissionsAndroid, Platform, Pressable, Text, View } from 'react-native';
import { getAudioFiles, Song } from '../../modules/local-music';
import { useMusicPlayer } from '../audio/musicPlayer';
import SongListItem from '../components/SongListItem';
import TopNavAlbumes from '../components/TopNavAlbumes';
import TopNavArtistas from '../components/TopNavArtistas';
import TopNavCarpetas from '../components/TopNavCarpetas';
import TopNavFavoritos from '../components/TopNavFavoritos';
import TopNavPistas, { TrackSortDirection, TrackSortOption } from '../components/TopNavPistas';
import TopNavPlaylist from '../components/TopNavPlaylist';
import PlayerScreen from './PlayerScreen';

type LibraryMode = 'home' | 'favorites' | 'playlists' | 'tracks' | 'albums' | 'artists' | 'folders';

interface MusicLibraryScreenProps {
  mode: LibraryMode;
  title: string;
}

type SongGroup = {
  id: string;
  name: string;
  subtitle: string;
  songs: Song[];
  artwork?: string | null;
};

type SongWithPlayCount = Song & {
  playCount?: number;
};

const UNKNOWN_ALBUM = 'Álbum Desconocido';
const UNKNOWN_ARTIST = 'Artista Desconocido';
const UNKNOWN_FOLDER = 'Carpeta Desconocida';
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

const getGroupName = (song: Song, mode: LibraryMode) => {
  if (mode === 'albums') {
    return normalizeValue(song.album, UNKNOWN_ALBUM);
  }

  if (mode === 'artists') {
    return normalizeValue(song.artist, UNKNOWN_ARTIST);
  }

  if (mode === 'folders') {
    return getFolderName(song.url);
  }

  return '';
};

const getSongDate = (song: Song) => song.dateModified ?? song.dateAdded ?? 0;

const getSongPlayCount = (song: Song) => (song as SongWithPlayCount).playCount ?? 0;

const compareText = (a: string | null | undefined, b: string | null | undefined, fallback: string) => (
  normalizeValue(a, fallback).localeCompare(normalizeValue(b, fallback))
);

const shuffleSongs = (list: Song[]) => {
  const shuffled = [...list];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
};



const buildGroups = (songs: Song[], mode: LibraryMode) => {
  const groups = new Map<string, SongGroup>();

  songs.forEach(song => {
    const name = getGroupName(song, mode);

    if (!name) {
      return;
    }

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

const MusicLibraryScreen = ({ mode, title }: MusicLibraryScreenProps) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SongGroup | null>(null);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [trackSort, setTrackSort] = useState<TrackSortOption>('name');
  const [trackSortDirection, setTrackSortDirection] = useState<TrackSortDirection>('asc');
  const groupModalTranslateY = useRef(new Animated.Value(1)).current;
  const { currentSong, playing, playSong, togglePlayPause } = useMusicPlayer();

  useEffect(() => {
    if (!selectedGroup || !['albums', 'artists', 'folders', 'playlists'].includes(mode)) {
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
  }, [groupModalTranslateY, mode, selectedGroup]);

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
      } catch (err) {
        console.error('Error al obtener música:', err);
      } finally {
        setLoading(false);
      }
    };

    requestPermissionsAndLoadMusic();
  }, []);

  const sortedSongs = useMemo(() => {
    const directionMultiplier = trackSortDirection === 'asc' ? 1 : -1;
    const nextSongs = [...songs];

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
  }, [songs, trackSort, trackSortDirection]);

  const albumGroups = useMemo(() => buildGroups(songs, 'albums'), [songs]);
  const artistGroups = useMemo(() => buildGroups(songs, 'artists'), [songs]);
  const folderGroups = useMemo(() => buildGroups(songs, 'folders'), [songs]);
  const defaultPlaylists = useMemo<SongGroup[]>(() => {
    const recentlyAddedSongs = [...songs].sort((a, b) => getSongDate(b) - getSongDate(a));
    const mostPlayedSongs = [...songs].sort((a, b) => getSongPlayCount(b) - getSongPlayCount(a) || getSongDate(b) - getSongDate(a));

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
        subtitle: `${mostPlayedSongs.length} ${mostPlayedSongs.length === 1 ? 'canción' : 'canciones'}`,
        songs: mostPlayedSongs,
        artwork: mostPlayedSongs[0]?.artwork,
      },
    ];
  }, [songs]);
  const customPlaylists = useMemo<SongGroup[]>(() => [], []);

  const groups = useMemo(() => {
    if (mode === 'albums') {
      return albumGroups;
    }

    if (mode === 'artists') {
      return artistGroups;
    }

    if (mode === 'folders') {
      return folderGroups;
    }

    return [];
  }, [albumGroups, artistGroups, folderGroups, mode]);
  const isVisualGridMode = mode === 'albums' || mode === 'artists';

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

  const playFromList = (list: Song[], index: number) => {
    void playSong(list, index);
    setShowPlayer(true);
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

  const handleTrackSortChange = (option: TrackSortOption, direction: TrackSortDirection) => {
    setTrackSort(option);
    setTrackSortDirection(direction);
  };

  const renderFilterNav = () => {
    const filterProps = {
      selectedSort: trackSort,
      selectedDirection: trackSortDirection,
      onSortChange: handleTrackSortChange,
    };

    if (mode === 'albums') {
      return <TopNavAlbumes {...filterProps} />;
    }

    if (mode === 'artists') {
      return <TopNavArtistas {...filterProps} />;
    }

    if (mode === 'folders') {
      return <TopNavCarpetas {...filterProps} />;
    }

    if (mode === 'favorites') {
      return <TopNavFavoritos {...filterProps} />;
    }

    if (mode === 'playlists') {
      return <TopNavPlaylist {...filterProps} />;
    }

    return null;
  };

  const renderSong = (list: Song[]) => ({ item, index }: { item: Song; index: number }) => {
    const isActive = currentSong?.id === item.id;

    return (
      <SongListItem
        item={item}
        isActive={isActive}
        isPlaying={isActive && playing}
        onPress={() => playFromList(list, index)}
        onTogglePlayPause={togglePlayPause}
      />
    );
  };

  const renderHeader = (subtitle?: string) => {
    if (mode === 'tracks') {
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
    }


    if (mode === 'albums') {
      return (
        <TopNavAlbumes
          selectedSort={trackSort}
          selectedDirection={trackSortDirection}
          onSortChange={handleTrackSortChange}
        />
      );
    }

    if (mode === 'artists') {
      return (
        <TopNavArtistas
          selectedSort={trackSort}
          selectedDirection={trackSortDirection}
          onSortChange={handleTrackSortChange}
        />
      );
    }

    if (mode === 'folders') {
      return (
        <TopNavCarpetas
          selectedSort={trackSort}
          selectedDirection={trackSortDirection}
          onSortChange={handleTrackSortChange}
        />
      );
    }

    if (mode === 'playlists') {
      return (
        <TopNavPlaylist
          selectedSort={trackSort}
          selectedDirection={trackSortDirection}
          onSortChange={handleTrackSortChange}
        />
      );
    }

    if (mode === 'favorites') {
      return (
        <TopNavFavoritos
          selectedSort={trackSort}
          selectedDirection={trackSortDirection}
          onSortChange={handleTrackSortChange}
        />
      );
    }


    return (
      <View>
        <View className="px-5 pb-2 pt-5">
          <Text className="text-2xl font-bold text-white">{title}</Text>
          {subtitle ? (
            <Text className="mt-1 text-sm text-[#707070]">{subtitle}</Text>
          ) : null}
        </View>
        {renderFilterNav()}
      </View>
    );
  };

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

  if (mode === 'tracks') {
    return (
      <View className="flex-1 bg-[#1d1d1f]">
        <FlatList
          className="flex-1 bg-[#1d1d1f]"
          data={sortedSongs}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader(`${sortedSongs.length} canciones`)}
          ListEmptyComponent={
            <Text className="px-5 py-8 text-center text-[#707070]">No se encontraron canciones.</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={renderSong(sortedSongs)}
        />
      </View>
    );
  }

  const renderPlaylistCard = (playlist: SongGroup) => (
    <Pressable key={playlist.id} className="mb-5 flex-1" onPress={() => setSelectedGroup(playlist)}>
      <View className="aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-[#333333]">
        {playlist.songs[0]?.artwork ? (
          <Image source={{ uri: playlist.songs[0].artwork }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <Text className="text-4xl text-[#b64400]">♪</Text>
        )}
      </View>
      <Text className="mt-2 text-center text-base font-bold text-white" numberOfLines={1}>{playlist.name}</Text>
      <Text className="mt-1 text-center text-xs text-[#707070]" numberOfLines={1}>{playlist.subtitle}</Text>
    </Pressable>
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
      contentContainerStyle={{ paddingBottom: 20 }}
      renderItem={renderSong(selectedGroup.songs)}
    />
  ) : null;

  if (mode === 'playlists') {
    return (
      <View className="flex-1 bg-[#1d1d1f]">
        <FlatList
          className="flex-1 bg-[#1d1d1f]"
          data={customPlaylists}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <View>
              {renderHeader(`${defaultPlaylists.length + customPlaylists.length} playlists`)}
              <View className="px-5 pb-2 pt-4">
                <View className="flex-row gap-4">
                  {defaultPlaylists.map(renderPlaylistCard)}
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <Text className="px-5 py-6 text-center text-[#707070]">No has creado playlists todavía.</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <Pressable className="mx-5 mb-3 rounded-2xl bg-[#252525] px-4 py-4" onPress={() => setSelectedGroup(item)}>
              <View className="flex-row items-center">
                <View className="mr-4 h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[#333333]">
                  {item.songs[0]?.artwork ? (
                    <Image source={{ uri: item.songs[0].artwork }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <Text className="text-2xl text-[#b64400]">♪</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-white" numberOfLines={1}>{item.name}</Text>
                  <Text className="mt-1 text-sm text-[#707070]">{item.subtitle}</Text>
                </View>
                <Text className="text-2xl text-[#707070]">›</Text>
              </View>
            </Pressable>
          )}
        />

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
          </Animated.View>
        </Modal>

      </View>
    );
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
        ListHeaderComponent={renderHeader(`${sortedGroups.length} ${title.toLowerCase()}`)}
        ListEmptyComponent={
          <Text className="px-5 py-8 text-center text-[#707070]">No hay elementos para mostrar.</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => isVisualGridMode ? (
          <Pressable className="mb-5 flex-1" onPress={() => setSelectedGroup(item)}>
            <View className={`aspect-square w-full items-center justify-center overflow-hidden bg-[#333333] ${mode === 'artists' ? 'rounded-full' : 'rounded-2xl'}`}>
              {item.artwork ? (
                <Image source={{ uri: item.artwork }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <Text className={mode === 'artists' ? 'text-5xl font-bold text-[#b64400]' : 'text-4xl text-[#b64400]'}>
                  {mode === 'artists' ? item.name.charAt(0).toUpperCase() : '♪'}
                </Text>
              )}
            </View>
            <Text className="mt-2 text-center text-base font-bold text-white" numberOfLines={1}>{item.name}</Text>
            <Text className="mt-1 text-center text-xs text-[#707070]" numberOfLines={1}>{item.subtitle}</Text>
          </Pressable>
        ) : (
          <Pressable
            className="mx-5 mb-3 rounded-2xl bg-[#252525] px-4 py-4"
            onPress={() => setSelectedGroup(item)}
          >
            <View className="flex-row items-center">
              <View className="mr-4 h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[#333333]">
                {item.artwork ? (
                  <Image source={{ uri: item.artwork }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <Text className="text-2xl text-[#b64400]">♪</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white" numberOfLines={1}>{item.name}</Text>
                <Text className="mt-1 text-sm text-[#707070]">{item.subtitle}</Text>
              </View>
              <Text className="text-2xl text-[#707070]">›</Text>
            </View>
          </Pressable>
        )}
      />

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
        </Animated.View>
      </Modal>

    </View>
  );
};

export default MusicLibraryScreen;