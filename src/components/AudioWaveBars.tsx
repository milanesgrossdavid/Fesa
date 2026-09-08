import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

interface AudioWaveBarsProps {
  playing?: boolean;
  color?: string;
  size?: 'sm' | 'md';
}

const SIZE_CONFIG = {
  sm: { height: 16, width: 2.5, gap: 2.5 },
  md: { height: 20, width: 3, gap: 3 },
} as const;

const AudioWaveBars = React.memo(({
  playing = true,
  color = '#ffffff',
  size = 'sm',
}: AudioWaveBarsProps) => {
  const firstBar = useRef(new Animated.Value(0.45)).current;
  const secondBar = useRef(new Animated.Value(0.85)).current;
  const thirdBar = useRef(new Animated.Value(0.55)).current;
  const activeAnimationsRef = useRef<Animated.CompositeAnimation[]>([]);
  const { height, width, gap } = SIZE_CONFIG[size];

  useEffect(() => {
    activeAnimationsRef.current.forEach(animation => animation.stop());
    activeAnimationsRef.current = [];

    if (!playing) {
      Animated.parallel([
        Animated.timing(firstBar, { toValue: 0.35, duration: 180, useNativeDriver: true }),
        Animated.timing(secondBar, { toValue: 0.55, duration: 180, useNativeDriver: true }),
        Animated.timing(thirdBar, { toValue: 0.4, duration: 180, useNativeDriver: true }),
      ]).start();
      return;
    }

    firstBar.setValue(0.35);
    secondBar.setValue(0.7);
    thirdBar.setValue(0.45);

    const createBarAnimation = (
      value: Animated.Value,
      minScale: number,
      maxScale: number,
      duration: number
    ) => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: maxScale,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: minScale,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      activeAnimationsRef.current.push(animation);
      return animation;
    };

    const animations = [
      createBarAnimation(firstBar, 0.28, 1, 340),
      createBarAnimation(secondBar, 0.42, 1, 280),
      createBarAnimation(thirdBar, 0.32, 1, 360),
    ];

    animations.forEach(animation => animation.start());

    return () => {
      animations.forEach(animation => animation.stop());
      activeAnimationsRef.current = [];
    };
  }, [firstBar, playing, secondBar, thirdBar]);

  const renderBar = (scale: Animated.Value) => {
    const translateY = scale.interpolate({
      inputRange: [0, 1],
      outputRange: [height / 2, 0],
    });

    return (
      <View
        style={{
          height,
          width,
          justifyContent: 'flex-end',
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            width,
            height,
            borderRadius: 999,
            backgroundColor: color,
            transform: [{ translateY }, { scaleY: scale }],
          }}
        />
      </View>
    );
  };

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{
        height,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap,
        opacity: playing ? 1 : 0.72,
      }}
    >
      {renderBar(firstBar)}
      {renderBar(secondBar)}
      {renderBar(thirdBar)}
    </View>
  );
});

export default AudioWaveBars;
