import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettingsLanguage, useAppSettingsTheme } from '../settings/appSettings';
import { getTranslation } from '../i18n/translations';

const PRIVACY_POLICY_ITEMS = [
  'FESA only accesses the device’s local audio library to play, organize, and manage your songs.',
  'The app does not upload or share your music to external servers or store your files outside the device.',
  'The requested permissions are only for reading the local library, managing tones, and controlling playback.',
  'Settings such as themes, visible tabs, and hidden files are stored locally on the device.',
  'We do not collect personal information or user profiles for sale, advertising, or external analytics.',
  'The app may open system services such as settings, contact, or support links when the user requests them.',
  'If the user hides songs, that decision is kept only in the app’s local settings.',
  'FESA may update this policy to reflect functional changes or compatibility requirements with Android.',
];

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal = ({ visible, onClose }: PrivacyPolicyModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppSettingsTheme();
  const language = useAppSettingsLanguage();
  const t = (key: string, fallback?: string) => getTranslation(language.id as any, key, fallback);
  const policyItems = PRIVACY_POLICY_ITEMS.map((_, index) => t(`privacy_item_${index + 1}`, PRIVACY_POLICY_ITEMS[index]));

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View
          className="max-h-[85%] rounded-t-[32px] px-5 pb-6 pt-3"
          style={{ backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: `${theme.text}40` }} />
          </View>

          <Text className="mb-4 text-center text-xl font-bold" style={{ color: theme.text }}>
            {t('privacy_policy_title', 'Privacy Policy')}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="mb-4 text-sm leading-6" style={{ color: theme.mutedText }}>
              {t('privacy_policy_intro', 'This policy describes how FESA handles music and settings on your device.')}
            </Text>

            <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
              {policyItems.map((item, index) => (
                <View
                  key={item}
                  className="px-4 py-4"
                  style={{
                    borderBottomWidth: index === PRIVACY_POLICY_ITEMS.length - 1 ? 0 : 0.5,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text className="text-sm leading-6" style={{ color: theme.text }}>
                    {item}
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

export default PrivacyPolicyModal;
