import { useEffect, useState } from 'react';
import { Image, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const DEFAULT_MUSIC_ARTWORK = require('../../assets/musicNotFound.jpg');

interface LibraryArtworkProps {
  artwork?: string | null;
  fallbackArtwork?: number;
  fallback?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  fallbackTextClassName?: string;
  fallbackTextStyle?: StyleProp<TextStyle>;
}

const LibraryArtwork = ({
  artwork,
  fallbackArtwork,
  fallback = '♪',
  className = 'rounded-2xl',
  fallbackTextClassName = 'text-4xl font-bold text-[#b64400]',
  fallbackTextStyle,
  style,
}: LibraryArtworkProps) => {



  const normalizedArtwork = artwork?.trim() || null;
  const hasArtwork = Boolean(normalizedArtwork);
  const placeholderArtwork = fallbackArtwork ?? DEFAULT_MUSIC_ARTWORK;
  const [artworkFailed, setArtworkFailed] = useState(false);

  useEffect(() => {
    setArtworkFailed(false);
  }, [normalizedArtwork]);

  return (
    <View
      style={style}
      className={`items-center justify-center overflow-hidden rounded-[14px] bg-[#333333] ${className}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={hasArtwork ? 'Artwork' : fallback}
    >
      {hasArtwork && !artworkFailed ? (
        <ExpoImage
          source={{ uri: normalizedArtwork as string }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="normal"
          recyclingKey={normalizedArtwork ?? undefined}
          transition={120}
          onError={() => setArtworkFailed(true)}
        />
      ) : placeholderArtwork ? (
        <Image
          source={placeholderArtwork}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
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
