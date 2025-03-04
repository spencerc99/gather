import { createAnimations } from "@tamagui/animations-react-native";

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
};

export const animations = createAnimations(RawAnimations);
