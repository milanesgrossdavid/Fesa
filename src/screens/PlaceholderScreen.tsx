import React from 'react';
import { View, Text } from 'react-native';

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View className="flex-1 justify-center items-center bg-[#1d1d1f]">
    <Text className="text-[#707070] text-lg tracking-[1px]">{name}</Text>
  </View>
);

export default PlaceholderScreen;