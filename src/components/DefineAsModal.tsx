import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song, ToneType } from '../../modules/local-music';
import { getTranslation } from '../i18n/translations';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import LibraryArtwork from './LibraryArtwork';

interface DefineAsModalProps {
  song: Song | null;
  onClose: () => void;
  onDefineAs: (song: Song, type: ToneType) => void;
}

const DefineAsModal = ({ song, onClose, onDefineAs }: DefineAsModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const TONE_OPTIONS: { label: string; value: ToneType; description: string }[] = [
    { label: t('tone_option_ringtone', 'Device tone'), value: 'ringtone', description: t('tone_option_ringtone_desc', 'Use as ringtone') },
    { label: t('tone_option_alarm', 'Alarm tone'), value: 'alarm', description: t('tone_option_alarm_desc', 'Use as alarm') },
  ];

  return (
    <Modal transparent visible={Boolean(song)} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/65" onPress={onClose} />
        {song ? (
          <View
            className="rounded-t-[32px] px-4 pt-3"
            style={{
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              borderTopWidth: 1,
              paddingBottom: Math.max(insets.bottom, 22),
              shadowColor: '#000000',
              shadowOpacity: 0.2,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: -8 },
              elevation: 12,
            }}
          >
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full" style={{ backgroundColor: theme.mutedText + '99' }} />
            </View>

            <View className="mb-4 flex-row items-center justify-between px-1">
              <View className="flex-1 pr-3">
                <Text className="text-2xl font-bold" style={{ color: theme.text }}>{t('define_as_title', 'Set as')}</Text>
                <Text className="mt-1 text-sm" style={{ color: theme.mutedText }} numberOfLines={1}>
                  {song.title}
                </Text>
              </View>
              <Pressable
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: theme.surface }}
                onPress={onClose}
              >
                <Text className="text-sm font-semibold" style={{ color: theme.text }}>{t('song_details_close', 'Close')}</Text>
              </Pressable>
            </View>

            <View
              className="mb-4 flex-row items-center rounded-[24px] px-3 py-3"
              style={{ backgroundColor: theme.surface }}
            >
              <LibraryArtwork
                artwork={song.artwork}
                className="mr-3 h-12 w-12 rounded-xl"
                fallbackTextClassName="text-xl text-white"
              />
              <View className="flex-1">
                <Text className="text-sm font-bold" style={{ color: theme.text }} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: theme.mutedText }} numberOfLines={1}>
                  {song.artist?.trim() || t('unknown_artist', 'Unknown Artist')}
                </Text>
              </View>
            </View>

            <View className="gap-2">
              {TONE_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  className="rounded-[22px] border px-4 py-4"
                  style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                  onPress={() => onDefineAs(song, option.value)}
                >
                  <Text className="text-base font-bold" style={{ color: theme.text }}>
                    {option.label}
                  </Text>
                  <Text className="mt-1 text-sm" style={{ color: theme.mutedText }}>
                    {option.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

export default DefineAsModal;
