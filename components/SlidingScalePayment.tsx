import { useEffect, useMemo, useState } from "react";
import { Image } from "react-native";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import { H3, Slider, XStack, XStackProps, YStack } from "tamagui";
import { StyledText } from "./Themed";
import { ContributionsKey, getItem, setItem } from "../utils/mmkv";
import { UserInfo } from "../utils/user";
import { withQueryParams } from "../utils/url";

export const SlidingPrice = [3, 6, 9, 13, 21, 33, 60];
export const StartingSlidingScaleValue = Math.ceil(SlidingPrice.length / 2);

const PriceMessages = [
  "No worries. I appreciate what you can afford to support my work",
  "No worries. I appreciate what you can afford to support my work",
  "Thank you for making this work possible!",
  "Thank you for making this work possible!",
  "Thank you so much for your generosity!!",
  "Thank you so much for your generosity!!",
  "Wow! Thank you so much for giving me the space to do this work. You have my endless gratitude.",
];

const PaymentLinks = [
  "https://buy.stripe.com/28o9D18gjcU88Ks147", // $3
  "https://buy.stripe.com/00gdThfIL1bq9Ow9AG", // $6
  "https://buy.stripe.com/8wMg1p8gjf2g2m4bIN", // $9
  "https://buy.stripe.com/fZe9D14031bq6CkeV4", // $13
  "https://buy.stripe.com/14kg1peEH1bqd0I7sz", // $21
  "https://buy.stripe.com/bIY16vgMPf2g8KsfZ6", // $33
  "https://buy.stripe.com/9AQ2az40307m9OwaEN", // $60
];

export function getSlidingPriceMoneyValue(value: number) {
  return SlidingPrice[value - 1];
}
export function getSlidingPricePaymentLink(
  value: number,
  user?: UserInfo | null
) {
  return withQueryParams(PaymentLinks[value - 1], {
    client_reference_id: user?.id,
    prefilled_email: user?.email,
  });
}

export interface Contribution {
  price: number;
  date: Date;
}

export function recordContribution(price: number) {
  const contribution: Contribution = {
    price,
    date: new Date(),
  };
  const currentContributions = getItem(ContributionsKey);
  const newContributions = currentContributions
    ? [...currentContributions, contribution]
    : [contribution];

  setItem(ContributionsKey, newContributions);
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

const FlowerOptions = [
  require("../assets/images/flower-yellow.png"),
  require("../assets/images/flower-orange.png"),
  require("../assets/images/flower-blue.png"),
  require("../assets/images/flower-pink.png"),
];

export function Flower({
  startSize = 8,
  endSize = 30,
  style,
}: {
  style: XStackProps;
  startSize?: number;
  endSize?: number;
}) {
  const randomFlower = useMemo(
    () => FlowerOptions[Math.floor(Math.random() * FlowerOptions.length)],
    []
  );
  const animatedWidth = useSharedValue(startSize);
  const animatedHeight = useSharedValue(startSize);

  useEffect(() => {
    animatedWidth.value = withTiming(endSize, { duration: 500 });
    animatedHeight.value = withTiming(endSize, { duration: 500 });
  }, [animatedWidth, animatedHeight]);

  return (
    <XStack {...style} pointerEvents="none">
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
  const starting = value[0] - 2;
  const numFlowers = starting > 0 ? Math.pow(2, starting) - starting + 1 : 0;
  const flowers = useMemo(() => {
    return Array.from({ length: numFlowers }, (_, index) => {
      const topOrBottom = Math.random() > 0.5 ? "top" : "bottom";
      const leftOrRight = Math.random() > 0.5 ? "left" : "right";
      return (
        <Flower
          key={`${value[0]}-${index}`}
          // @ts-ignore
          style={{
            position: "absolute",
            zIndex: -1,
            [topOrBottom]: -Math.random() * 20 - 30,
            [leftOrRight]: `${Math.random() * 30 - 5}%`,
            transform: [{ rotate: `${Math.random() * 90 - 45}deg` }],
            opacity: 0.9,
          }}
        />
      );
    });
  }, [numFlowers]);

  return (
    <YStack gap="$3">
      <StyledText metadata bold>
        Choose an amount that works for you
      </StyledText>
      <Slider
        marginVertical="$3"
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
        onSlideStart={(e) => {
          onSlideStart?.();
        }}
      >
        <Slider.Track backgroundColor="$green5" size="$15">
          <Slider.TrackActive backgroundColor="$green8" zIndex={1} />
        </Slider.Track>
        <Slider.Thumb
          index={0}
          circular
          elevation="$0.5"
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
            <StyledText key={index} metadata size="$7" elevation={5} bold>
              ●
            </StyledText>
          ))}
        </XStack>
      </Slider>
      <YStack alignItems="center" position="relative" gap="$2">
        <H3>${moneyValue}</H3>
        <YStack position="relative" marginTop="$2">
          <StyledText>{PriceMessages[value[0] - 1]}</StyledText>
          {flowers}
        </YStack>
      </YStack>
    </YStack>
  );
}
