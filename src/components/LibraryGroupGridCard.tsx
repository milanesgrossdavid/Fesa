import React from 'react';
import { Pressable, View } from 'react-native';
import LibraryArtwork from './LibraryArtwork';
import AutoScrollingText from './AutoScrollingText';
import { useAppSettingsTheme } from '../settings/appSettings';

type LibraryGroupCardData = {
  id: string;
  name: string;
  subtitle: string;
  artwork?: string | null;
};

interface LibraryGroupGridCardProps {
  group: LibraryGroupCardData;
  isArtist: boolean;
  onPress: () => void;
}

const LibraryGroupGridCard = ({ group, isArtist, onPress }: LibraryGroupGridCardProps) => {
  const theme = useAppSettingsTheme();

  return (
    <Pressable className="mb-5 flex-1 rounded-[26px] p-3" onPress={onPress}>
      <View className="overflow-hidden rounded-[22px]">
        <LibraryArtwork
          artwork={group.artwork}
          fallback={isArtist ? group.name.charAt(0).toUpperCase() : '♪'}
          className={`aspect-square w-full ${isArtist ? 'rounded-full' : 'rounded-[20px]'}`}
          fallbackTextClassName={isArtist ? 'text-5xl font-bold text-white' : 'text-4xl font-bold text-white'}
          style={{ borderRadius: isArtist ? 9999 : 18 }}
        />
      </View>

      <AutoScrollingText className="mt-3 text-center text-base font-bold" style={{ color: theme.text }}>
        {group.name}
      </AutoScrollingText>
      <AutoScrollingText className="mt-1 text-center text-xs" style={{ color: theme.mutedText }}>
        {group.subtitle}
      </AutoScrollingText>
    </Pressable>
  );
};

export default LibraryGroupGridCard;