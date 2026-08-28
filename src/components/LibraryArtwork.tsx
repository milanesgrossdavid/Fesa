import React from 'react';
import { Image, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';

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
}: LibraryArtworkProps) => (
  <View style={style} className={`items-center justify-center overflow-hidden bg-[#333333] ${className}`}>
    {artwork ? (
      <Image source={{ uri: artwork }} className="h-full w-full" resizeMode="cover" />
    ) : (
      <Image source={DEFAULT_MUSIC_ARTWORK} className="h-full w-full" resizeMode="cover" />
    )}
  </View>
);

export default LibraryArtwork;