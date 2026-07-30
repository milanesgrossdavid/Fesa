import React from 'react';
import { Pressable, Text, View } from 'react-native';
import LibraryArtwork from './LibraryArtwork';

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

const LibraryGroupListItem = ({ group, onPress }: LibraryGroupListItemProps) => (
  <Pressable className="mx-5 mb-3 rounded-2xl bg-[#252525] px-4 py-4" onPress={onPress}>
    <View className="flex-row items-center">
      <LibraryArtwork
        artwork={group.artwork}
        className="mr-4 h-12 w-12 rounded-xl"
        fallbackTextClassName="text-2xl text-[#b64400]"
      />
      <View className="flex-1">
        <Text className="text-base font-bold text-white" numberOfLines={1}>
          {group.name}
        </Text>
        <Text className="mt-1 text-sm text-[#707070]">{group.subtitle}</Text>
      </View>
      <Text className="text-2xl text-[#707070]">›</Text>
    </View>
  </Pressable>
);

export default LibraryGroupListItem;