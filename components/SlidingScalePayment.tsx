import { useEffect, useMemo, useState } from "react";
import { Image } from "react-native";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import { H3, Slider, XStack, XStackProps, YStack } from "tamagui";
import { StyledText } from "./Themed";

export const SlidingPrice = [1, 3, 6, 9, 21, 33, 60];
export const StartingSlidingScaleValue = Math.ceil(SlidingPrice.length / 2);

const PriceMessages = [
  "No worries. I appreciate you paying what you can to support my work 🧡",
  "No worries. I appreciate you paying what you can to support my work 🧡",
  "Thank you for making this possible 🧡",
  "Thank you for making this possible 🧡",
  "Thank you so much for generous support 🧡",
  "Thank you so much for generous support 🧡",
  "Wow! Thank you so much for your generosity & giving me the space to do this work 🧡",
];

const PaymentLinks = [
  "https://buy.stripe.com/00g7uT7cff2g1i05ko",
  "https://buy.stripe.com/28o9D18gjcU88Ks147",
  "https://buy.stripe.com/00gdThfIL1bq9Ow9AG",
  "https://buy.stripe.com/8wMg1p8gjf2g2m4bIN",
  "https://buy.stripe.com/14kg1peEH1bqd0I7sz",
  "https://buy.stripe.com/bIY16vgMPf2g8KsfZ6",
  "https://buy.stripe.com/9AQ2az40307m9OwaEN",
];

export function getSlidingPriceMoneyValue(value: number) {
  return SlidingPrice[value - 1];
}
export function getSlidingPricePaymentLink(value: number) {
  return PaymentLinks[value - 1];
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

const FlowerOptions = [
  require("../assets/images/yellow-flower-pixel.png"),
  require("../assets/images/orange-flower-pixel.png"),
  require("../assets/images/white-flower-pixel.png"),
  require("../assets/images/purple-flower-pixel.png"),
];

function Flower({ style }: { style: XStackProps }) {
  const randomFlower = useMemo(
    () => FlowerOptions[Math.floor(Math.random() * FlowerOptions.length)],
    []
  );
  const animatedWidth = useSharedValue(8);
  const animatedHeight = useSharedValue(8);

  useEffect(() => {
    animatedWidth.value = withTiming(50, { duration: 500 });
    animatedHeight.value = withTiming(50, { duration: 500 });
  }, [animatedWidth, animatedHeight]);

  return (
    <XStack {...style}>
      <AnimatedImage
        source={randomFlower}
        style={{
          width: animatedWidth,
          height: animatedHeight,
        }}
      />
    </XStack>
  );
}

export function SlidingScalePayment({
  val,
  setVal,
  onSlideStart,
  onSlideEnd,
}: {
  val: number[];
  setVal: (value: number[]) => void;
  onSlideStart?: () => void;
  onSlideEnd?: () => void;
}) {
  const [valueInternal, setValueInternal] = useState([
    StartingSlidingScaleValue,
  ]);
  const value = val ?? valueInternal;
  const setValue = setVal ?? setValueInternal;

  const moneyValue = getSlidingPriceMoneyValue(value[0]);
  const numFlowers = Math.min(Math.max(2, Math.floor(moneyValue / 5)), 10);
  const flowers = useMemo(() => {
    return Array.from({ length: numFlowers }, (_, index) => (
      <Flower
        key={`${value[0]}-${index}`}
        style={{
          position: "absolute",
          zIndex: -1,
          bottom: -Math.random() * 20 - 40,
          left: `${Math.round(Math.random() * 80)}%`,
          transform: [{ rotate: `${Math.random() * 120 - 60}deg` }],
          opacity: 0.7,
        }}
      />
    ));
  }, [numFlowers]);
  return (
    <YStack gap="$5">
      <StyledText metadata bold>
        Choose an amount that works for you
      </StyledText>
      <Slider
        min={1}
        max={SlidingPrice.length}
        step={1}
        value={value}
        onValueChange={setValue}
        defaultValue={[StartingSlidingScaleValue]}
        position="relative"
        onSlideEnd={() => {
          onSlideEnd?.();
        }}
        onSlideStart={() => {
          onSlideStart?.();
        }}
      >
        <Slider.Track backgroundColor="$green5" size="$15">
          <Slider.TrackActive backgroundColor="$green8" zIndex={1} />
        </Slider.Track>
        <Slider.Thumb
          index={0}
          circular
          elevate
          size="$3"
          backgroundColor="$green10"
          borderColor="$green11"
          zIndex={2}
        />
        <XStack
          justifyContent="space-between"
          position="absolute"
          width="96%"
          marginLeft="3%"
          zIndex={0}
          alignItems="center"
        >
          {Array.from({ length: SlidingPrice.length }, (_, index) => (
            <StyledText key={index} metadata fontSize="$7" elevation={5} bold>
              ●
            </StyledText>
          ))}
        </XStack>
      </Slider>
      <YStack alignItems="center" position="relative" gap="$2">
        <H3>${moneyValue}</H3>
        <StyledText>{PriceMessages[value[0] - 1]}</StyledText>
        {value[0] >= StartingSlidingScaleValue ? flowers : null}
      </YStack>
    </YStack>
  );
}
