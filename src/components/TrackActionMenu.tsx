import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { getTranslation } from '../i18n/translations';
import { useAppSettings } from '../settings/appSettings';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import LibraryArtwork from './LibraryArtwork';

type TrackMenuState = {
  song: Song;
  x: number;
  y: number;
};

interface TrackActionMenuProps {
  trackMenu: TrackMenuState | null;
  onClose: () => void;
  onAdd: (song: Song) => void;
  onDelete: (song: Song) => void;
  onShare: (song: Song) => void;
  onDetails: (song: Song) => void;
  onOpenGroup: (song: Song, groupMode: 'albums' | 'artists') => void;
  onDefineAs: (song: Song) => void;
}

const TrackActionMenu = ({
  trackMenu,
  onClose,
  onAdd,
  onDelete,
  onShare,
  onDetails,
  onOpenGroup,
  onDefineAs,
}: TrackActionMenuProps) => {
  const insets = useSafeAreaInsets();
  const { theme, language } = useAppSettings();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  if (!trackMenu) {
    return null;
  }

  const song = trackMenu.song;

  const actions: {
    label: string;
    onPress: () => void;
  }[] = [
    { label: t('track_action_add_to_playlist', 'Add to playlist'), onPress: () => onAdd(song) },
    { label: t('track_action_share', 'Share'), onPress: () => onShare(song) },
    { label: t('track_action_details', 'Track details'), onPress: () => onDetails(song) },
    { label: t('track_action_album', 'Album'), onPress: () => onOpenGroup(song, 'albums') },
    { label: t('track_action_artist', 'Artist'), onPress: () => onOpenGroup(song, 'artists') },
    { label: t('track_action_define_as', 'Set as'), onPress: () => onDefineAs(song) },
    { label: t('track_action_delete', 'Delete'), onPress: () => setConfirmDeleteVisible(true) },
  ];

  const handleClose = () => {
    setConfirmDeleteVisible(false);
    onClose();
  };

  return (
    <>
      <Modal transparent visible={!confirmDeleteVisible} animationType="slide" onRequestClose={handleClose}>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/70" onPress={handleClose} />
          <View
            className="rounded-t-[32px] px-5 pt-3"
            style={{
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-white/20" />
            </View>

            <View
              className="mb-4 flex-row items-center rounded-3xl px-3 py-3"
              style={{ backgroundColor: theme.surface }}
            >
              <LibraryArtwork
                artwork={song.artwork}
                className="mr-3 h-14 w-14 rounded-2xl"
                fallbackTextClassName="text-2xl text-white"
              />
              <View className="flex-1 pr-2">
                <Text className="text-base font-bold" style={{ color: theme.text }} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
                  {song.artist?.trim() || t('unknown_artist', 'Unknown Artist')}
                </Text>
              </View>
            </View>

            <View className="overflow-hidden rounded-3xl" style={{ backgroundColor: theme.surface }}>
              {actions.map((action, index) => (
                <Pressable
                  key={action.label}
                  className="px-4 py-4"
                  style={{
                    borderBottomWidth: index === actions.length - 1 ? 0 : 1,
                    borderBottomColor: theme.border,
                  }}
                  onPress={action.onPress}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDeleteModal
        visible={confirmDeleteVisible}
        title={t('delete_song_title', 'Delete song')}
        message={t('delete_song_message', 'Do you want to delete %count% %label%? This action cannot be undone.').replace('%count%', '1').replace('%label%', t('delete_song_single', 'song'))}
        itemName={song.title}
        artwork={song.artwork}
        accent="white"
        onClose={() => setConfirmDeleteVisible(false)}
        onConfirm={() => {
          setConfirmDeleteVisible(false);
          onDelete(song);
        }}
      />
    </>
  );
};

export default TrackActionMenu;
