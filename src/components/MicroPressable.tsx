import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
} from 'react-native';

type MicroPressableProps = Omit<PressableProps, 'style'> & {
  style?: PressableProps['style'];
  scaleTo?: number;
};

const MicroPressable = ({
  children,
  onPressIn,
  onPressOut,
  scaleTo = 0.97,
  style,
  ...props
}: MicroPressableProps) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      friction: 8,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...props}
        style={style}
        onPressIn={event => {
          animateScale(scaleTo);
          onPressIn?.(event);
        }}
        onPressOut={event => {
          animateScale(1);
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default MicroPressable;