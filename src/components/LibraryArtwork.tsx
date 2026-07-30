import React from 'react';
import { Image, Text, View } from 'react-native';

interface LibraryArtworkProps {
  artwork?: string | null;
  fallback?: string;
  className?: string;
  fallbackTextClassName?: string;
}

const LibraryArtwork = ({
  artwork,
  fallback = '♪',
  className = 'rounded-2xl',
  fallbackTextClassName = 'text-4xl font-bold text-[#b64400]',
}: LibraryArtworkProps) => (
  <View className={`items-center justify-center overflow-hidden bg-[#333333] ${className}`}>
    {artwork ? (
      <Image source={{ uri: artwork }} className="h-full w-full" resizeMode="cover" />
    ) : (
      <Text className={fallbackTextClassName}>{fallback}</Text>
    )}
  </View>
);

export default LibraryArtwork;