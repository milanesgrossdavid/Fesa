import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import { getTranslation } from '../i18n/translations';

const LICENSES = [
  {
    title: 'Expo',
    text: 'FESA is built on the Expo platform and its native modules for fast delivery, compatibility, and performance on Android.',
  },
  {
    title: 'React Native',
    text: 'The interface is built with React Native and its render engine for native mobile experiences.',
  },
  {
    title: 'Async Storage',
    text: 'Settings and hidden music lists are persisted locally on the device to keep configuration between sessions.',
  },
  {
    title: 'Expo Vector Icons',
    text: 'The app icons use vector icon libraries with a native style for iOS and Android.',
  },
  {
    title: 'NativeWind',
    text: 'The visual design uses Tailwind-style utilities in React Native to speed up interface composition and maintain consistency.',
  },
];

interface OpenSourceLicensesModalProps {
  visible: boolean;
  onClose: () => void;
}

const OpenSourceLicensesModal = ({ visible, onClose }: OpenSourceLicensesModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const licenses = LICENSES.map((item, index) => ({
    ...item,
    title: index === 0 ? 'Expo' : item.title,
    text: t(`license_text_${index + 1}`, item.text),
  }));

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/70"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('cancel', 'Cancel')}
        />
        <View
          className="max-h-[85%] rounded-t-[28px] px-5 pb-6 pt-2"
          style={{
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, 24),
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: -8 },
            elevation: 18,
          }}
        >
          <View className="mb-4 items-center">
            <View className="h-[5px] w-10 rounded-full" style={{ backgroundColor: `${theme.mutedText}55` }} />
          </View>

          <View className="mb-4 flex-row items-center justify-between px-2">
            <View className="flex-1">
              <Text className="text-xl font-bold" style={{ color: theme.text }}>
                {t('licenses_title', 'Open Source Licenses')}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: theme.mutedText }}>
                {t('licenses_intro', 'This list summarizes the main dependencies and support licenses used to build FESA.')}
              </Text>
            </View>
            <Pressable
              className="ml-3 h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.surface }}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('close', 'Close')}
            >
              <Text className="text-lg font-semibold" style={{ color: theme.accent }}>×</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="overflow-hidden rounded-[20px] border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              {licenses.map((license, index) => (
                <View
                  key={license.title}
                  className="px-4 py-4"
                  style={{
                    borderBottomWidth: index === LICENSES.length - 1 ? 0 : 0.5,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text className="mb-1 text-base font-bold" style={{ color: theme.text }}>
                    {license.title}
                  </Text>
                  <Text className="text-sm leading-6" style={{ color: theme.mutedText }}>
                    {license.text}
                  </Text>
                </View>
              ))}
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default OpenSourceLicensesModal;
