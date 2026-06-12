import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// Pinch-to-zoom "peek": scales the wrapped content around the pinch focal point
// while two fingers are down, then springs back to normal on release. Lets you
// look in on an image in place without a separate fullscreen viewer.
export function PinchToZoom({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const scale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      // Only allow zooming in, not shrinking below natural size.
      scale.value = Math.max(1, e.scale);
      focalX.value = e.focalX;
      focalY.value = e.focalY;
    })
    .onEnd(() => {
      scale.value = withTiming(1);
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Translate the focal point to the origin, scale, then translate back so the
    // zoom centers on where the fingers are.
    const offsetX = focalX.value - width.value / 2;
    const offsetY = focalY.value - height.value / 2;
    return {
      transform: [
        { translateX: offsetX },
        { translateY: offsetY },
        { scale: scale.value },
        { translateX: -offsetX },
        { translateY: -offsetY },
      ],
    };
  });

  return (
    <GestureDetector gesture={pinch}>
      <Animated.View
        style={[style, animatedStyle]}
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width;
          height.value = e.nativeEvent.layout.height;
        }}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
