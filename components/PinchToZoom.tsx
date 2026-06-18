import { PropsWithChildren, useRef, useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Portal } from "tamagui";

// Pinch-to-zoom "peek": while two fingers are down the image is lifted into a
// root-level Portal (so it renders above all other content instead of being
// overlapped/clipped by siblings) and scaled around the pinch focal point, then
// springs back and drops out of the portal on release.
export function PinchToZoom({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const containerRef = useRef<View>(null);
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const scale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);

  const onActivate = () => {
    containerRef.current?.measureInWindow((x, y, w, h) => {
      setRect({ x, y, width: w, height: h });
      width.value = w;
      height.value = h;
      setActive(true);
    });
  };
  const onDeactivate = () => setActive(false);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      runOnJS(onActivate)();
    })
    .onUpdate((e) => {
      // Only zoom in, never shrink below natural size.
      scale.value = Math.max(1, e.scale);
      focalX.value = e.focalX;
      focalY.value = e.focalY;
    })
    .onFinalize(() => {
      scale.value = withTiming(1, { duration: 180 }, (finished) => {
        if (finished) {
          runOnJS(onDeactivate)();
        }
      });
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
      <View ref={containerRef} collapsable={false} style={style}>
        {/* Hide the inline copy while it's lifted into the portal. */}
        <View style={{ opacity: active ? 0 : 1 }}>{children}</View>
        {active && (
          <Portal>
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                },
                animatedStyle,
              ]}
            >
              {children}
            </Animated.View>
          </Portal>
        )}
      </View>
    </GestureDetector>
  );
}
