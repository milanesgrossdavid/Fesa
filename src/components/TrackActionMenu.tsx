import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../modules/local-music';
import { getTranslation } from '../i18n/translations';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
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
  onAdd?: (song: Song) => void;
  onDelete: (song: Song) => void;
  onShare: (song: Song) => void;
  onDetails: (song: Song) => void;
  onOpenGroup: (song: Song, groupMode: 'albums' | 'artists') => void;
  onDefineAs: (song: Song) => void;
  onEqualizer?: (song: Song) => void;
  onSettings?: (song: Song) => void;
  /** Notifies the parent that a confirm-delete was requested so it can host the ConfirmDeleteModal outside the menu (avoids nested <Modal> on Android). */
  onRequestDelete?: (song: Song) => void;
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
  onEqualizer,
  onSettings,
  onRequestDelete,
}: TrackActionMenuProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
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
    ...(onAdd ? [{ label: t('track_action_add_to_playlist', 'Add to playlist'), onPress: () => onAdd(song) }] : []),
    { label: t('track_action_share', 'Share'), onPress: () => onShare(song) },
    { label: t('track_action_details', 'Track details'), onPress: () => onDetails(song) },
    { label: t('track_action_album', 'Album'), onPress: () => onOpenGroup(song, 'albums') },
    { label: t('track_action_artist', 'Artist'), onPress: () => onOpenGroup(song, 'artists') },
    { label: t('track_action_define_as', 'Set as'), onPress: () => onDefineAs(song) },
    ...(onEqualizer ? [{ label: t('player_equalizer', 'Equalizer'), onPress: () => onEqualizer(song) }] : []),
    ...(onSettings ? [{ label: t('settings', 'Settings'), onPress: () => onSettings(song) }] : []),
    {
      label: t('track_action_delete', 'Delete'),
      onPress: () => {
        if (onRequestDelete) {
          // Defer the actual delete confirmation to the parent so the
          // ConfirmDeleteModal lives at the top of the tree, not nested
          // inside this Modal (which crashes on some Android devices).
          onClose();
          onRequestDelete(song);
          return;
        }
        setConfirmDeleteVisible(true);
      },
    },
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
            className="max-h-[86%] rounded-t-[28px] px-5 pt-2"
            style={{
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 24),
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: -8 },
              elevation: 16,
            }}
          >
          <View className="mb-4 items-center">
            <View className="h-[5px] w-10 rounded-full" style={{ backgroundColor: `${theme.mutedText}55` }} />
          </View>

          <View
            className="mb-4 flex-row items-center rounded-[20px] border px-3 py-3"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
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

          <View className="overflow-hidden rounded-[20px] border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            {actions.map((action, index) => (
              <Pressable
                key={action.label}
                className="flex-row items-center justify-between px-4 py-3.5"
                style={{
                  borderBottomWidth: index === actions.length - 1 ? 0 : 1,
                  borderBottomColor: theme.border,
                }}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Text className="text-base font-bold" style={{ color: index === actions.length - 1 ? '#f87171' : theme.text }}>
                  {action.label}
                </Text>
                <Text className="text-lg" style={{ color: theme.mutedText }}>›</Text>
              </Pressable>
            ))}
          </View>
          </View>
        </View>
      </Modal>
      {!onRequestDelete ? (
        <ConfirmDeleteModal
          visible={confirmDeleteVisible}
          title={t('delete_song_title', 'Delete song')}
          message={t('delete_song_message', 'Do you want to delete this song? This action cannot be undone.')}
          itemName={song.title}
          artwork={song.artwork}
          accent="white"
          onClose={() => setConfirmDeleteVisible(false)}
          onConfirm={() => {
            setConfirmDeleteVisible(false);
            onDelete(song);
          }}
        />
      ) : null}
    </>
  );
};

export default TrackActionMenu;
