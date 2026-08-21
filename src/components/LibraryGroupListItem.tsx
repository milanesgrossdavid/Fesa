import React from 'react';
import { Pressable, Text, View } from 'react-native';
import LibraryArtwork from './LibraryArtwork';
import { useAppSettings } from '../settings/appSettings';

type LibraryGroupListItemData = {
  id: string;
  name: string;
  subtitle: string;
  artwork?: string | null;
};

interface LibraryGroupListItemProps {
  group: LibraryGroupListItemData;
  onPress: () => void;
}

const LibraryGroupListItem = ({ group, onPress }: LibraryGroupListItemProps) => {
  const { theme } = useAppSettings();
  return(
  <Pressable className="mx-3 mb-2 px-4 py-4" onPress={onPress}>
    <View className="flex-row items-center">
      <LibraryArtwork
        artwork={group.artwork}
        className="mr-4 h-12 w-12 rounded-xl"
        fallbackTextClassName="text-2xl text-[#b64400]"
      />
      <View className="flex-1">
        <Text className="text-base font-bold" numberOfLines={1} style={{ color: theme.text }}>
          {group.name}
        </Text>
        <Text className="mt-1 text-sm" style={{ color: theme.accent }}>
          {group.subtitle}
        </Text>
      </View>
      <Text className="text-2xl" style={{ color: theme.accent }}>
        ›
      </Text>
    </View>
  </Pressable>
)};

export default LibraryGroupListItem;