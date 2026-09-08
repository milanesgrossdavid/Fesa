import React from 'react';
import { Image, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const DEFAULT_MUSIC_ARTWORK = require('../../assets/musicNotFound.jpg');

interface LibraryArtworkProps {
  artwork?: string | null;
  fallback?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  fallbackTextClassName?: string;
  fallbackTextStyle?: StyleProp<TextStyle>;
}

const LibraryArtwork = ({
  artwork,
  fallback = '♪',
  className = 'rounded-2xl',
  fallbackTextClassName = 'text-4xl font-bold text-[#b64400]',
  fallbackTextStyle,
  style,
}: LibraryArtworkProps) => {
  // expo-image delivers native-side caching, LRU eviction, priority, and
  // progressive decoding. The shared `transition` keeps the swap smooth when
  // a card with a placeholder suddenly gets a URI.
  const hasArtwork = Boolean(artwork);

  return (
    <View
      style={style}
      className={`items-center justify-center overflow-hidden rounded-[14px] bg-[#333333] ${className}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={hasArtwork ? 'Artwork' : fallback}
    >
      {hasArtwork ? (
        <ExpoImage
          source={{ uri: artwork as string }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="normal"
          recyclingKey={artwork ?? undefined}
          transition={120}
        />
      ) : (
        <View className="h-full w-full items-center justify-center bg-[#282828]">
          <Text style={fallbackTextStyle} className={fallbackTextClassName}>
            {fallback}
          </Text>
        </View>
      )}
    </View>
  );
};

export default LibraryArtwork;
