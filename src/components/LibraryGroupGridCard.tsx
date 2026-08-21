import React from 'react';
import { Pressable, Text } from 'react-native';
import LibraryArtwork from './LibraryArtwork';
import { useAppSettings } from '../settings/appSettings';

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
  const { theme } = useAppSettings();
  return(
  <Pressable className="mb-5 flex-1" onPress={onPress}>
    <LibraryArtwork
      artwork={group.artwork}
      fallback={isArtist ? group.name.charAt(0).toUpperCase() : '♪'}
      className={`aspect-square w-full ${isArtist ? 'rounded-full' : 'rounded-2xl'}`}
      fallbackTextClassName={isArtist ? 'text-5xl font-bold text-[#b64400]' : 'text-4xl text-[#b64400]'}
    />
    <Text className="mt-2 text-center text-base font-bold" numberOfLines={1} style={{ color: theme.text }}>
      {group.name}
    </Text>
    <Text className="mt-1 text-center text-xs" numberOfLines={1} style={{ color: theme.mutedText }}>
      {group.subtitle}
    </Text>
  </Pressable>
)};

export default LibraryGroupGridCard;