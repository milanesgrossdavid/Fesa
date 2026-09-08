import React from 'react';
import { View } from 'react-native';
import LibraryArtwork from './LibraryArtwork';
import AutoScrollingText from './AutoScrollingText';
import MicroPressable from './MicroPressable';
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
    <MicroPressable
      className="mb-5 w-52 rounded-2xl p-3"
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.surface : 'transparent',
        opacity: pressed ? 0.76 : 1,
      })}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={group.name}
    >
      <View
        className="overflow-hidden rounded-2xl"
      >
        <LibraryArtwork
          artwork={group.artwork}
          fallback={isArtist ? group.name.charAt(0).toUpperCase() : '♪'}
          className={`aspect-square w-full ${isArtist ? 'rounded-full' : 'rounded-xl'}`}
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
    </MicroPressable>
  );
};

export default LibraryGroupGridCard;