import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

interface AutoScrollingTextProps {
  children: string;
  className?: string;
  style?: object;
}

const AutoScrollingText = React.memo(function AutoScrollingText({
  children,
  className,
  style,
}: AutoScrollingTextProps) {
  const offset = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const lastTextWidthRef = useRef(0);
  const lastContainerWidthRef = useRef(0);

  useEffect(() => {
    offset.stopAnimation();
    offset.setValue(0);
    setTextWidth(0);
    lastTextWidthRef.current = 0;
  }, [children, offset]);

  useEffect(() => {
    offset.stopAnimation();
    offset.setValue(0);

    if (!textWidth || !containerWidth) {
      return;
    }

    const overflow = textWidth - containerWidth;
    if (overflow <= 1) {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(offset, {
          toValue: -overflow,
          duration: Math.max(2400, overflow * 35),
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1400),
        Animated.timing(offset, {
          toValue: 0,
          duration: Math.max(2400, overflow * 35),
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [children, containerWidth, offset, textWidth]);

  const hiddenTextStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: 0,
      top: 0,
      width: 10000,
      opacity: 0,
    }),
    []
  );

  const handleContainerLayout = ({ nativeEvent }: { nativeEvent: { layout: { width: number } } }) => {
    const nextWidth = nativeEvent.layout.width;
    if (nextWidth > 0 && Math.abs(nextWidth - lastContainerWidthRef.current) > 1) {
      lastContainerWidthRef.current = nextWidth;
      setContainerWidth(nextWidth);
    }
  };

  return (
    <View
      className="overflow-hidden"
      onLayout={handleContainerLayout}
    >
      <Animated.Text
        className={className}
        numberOfLines={1}
        style={[
          style,
          {
            width: textWidth || undefined,
            transform: [{ translateX: offset }],
          },
        ]}
      >
        {children}
      </Animated.Text>
      <Text
        className={className}
        key={children}
        numberOfLines={1}
        onTextLayout={({ nativeEvent }) => {
          const nextWidth = nativeEvent.lines[0]?.width ?? 0;
          if (nextWidth > 0 && nextWidth !== lastTextWidthRef.current) {
            lastTextWidthRef.current = nextWidth;
            setTextWidth(nextWidth);
          }
        }}
        style={[style, hiddenTextStyle]}
      >
        {children}
      </Text>
    </View>
  );
});

export default AutoScrollingText;
