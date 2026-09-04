import React from 'react';
import { GestureResponderEvent, Text, View } from 'react-native';
import { Song } from '../../modules/local-music';
import SongListItem from './SongListItem';
import { useAppSettingsTheme } from '../settings/appSettings';

type SongGroup = {
  id: string;
  name: string;
  subtitle: string;
  songs: Song[];
  artwork?: string | null;
};

interface HomeRecentlyAddedSectionProps {
  group: SongGroup;
  songs: Song[];
  currentSongId?: string;
  playing: boolean;
  selectedSongIds?: string[];
  isSelectionMode?: boolean;
  onOpenGroup: () => void;
  onPlaySong: (index: number) => void;
  onTogglePlayPause: () => void;
  onToggleSongSelection?: (song: Song) => void;
  onStartSongSelection?: (song: Song) => void;
  onOpenTrackMenu: (song: Song, event: GestureResponderEvent) => void;
}

const HomeRecentlyAddedSection = ({
  group,
  songs,
  currentSongId,
  playing,
  selectedSongIds = [],
  isSelectionMode = false,
  onOpenGroup,
  onPlaySong,
  onTogglePlayPause,
  onToggleSongSelection,
  onStartSongSelection,
  onOpenTrackMenu,
}: HomeRecentlyAddedSectionProps) => {
  const theme = useAppSettingsTheme();

  return (
    <View className="py-4">
      {songs.map((song, index) => {
        const isSelected = selectedSongIds.includes(song.id);

        return (
          <SongListItem
            key={song.id}
            item={song}
            isActive={currentSongId === song.id}
            isPlaying={currentSongId === song.id && playing}
            isSelected={isSelected}
            onPress={() => (isSelectionMode ? onToggleSongSelection?.(song) : onPlaySong(index))}
            onLongPress={() => onStartSongSelection?.(song)}
            onTogglePlayPause={onTogglePlayPause}
            showDuration={false}
            showSelectionIndicator={isSelectionMode}
            onOpenTrackMenu={isSelectionMode ? undefined : onOpenTrackMenu}
          />
        );
      })}
    </View>
  );
};

export default HomeRecentlyAddedSection;