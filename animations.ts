// ABOUTME: Defines the native animation presets used by Basket's Tamagui components.
// ABOUTME: Provides consistent motion speeds for sheets, overlays, and controls.
import { createAnimations } from "@tamagui/animations-react-native";

export const ResponsiveAnimationDuration = 160;

export const RawAnimations: Parameters<typeof createAnimations>[0] = {
  bouncy: {
    type: "spring",
    damping: 10,
    mass: 0.9,
    stiffness: 100,
  },
  lazy: {
    type: "spring",
    damping: 20,
    stiffness: 60,
  },
  quick: {
    type: "spring",
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
  responsive: {
    type: "timing",
    duration: ResponsiveAnimationDuration,
  },
};

export const animations = createAnimations(RawAnimations);
