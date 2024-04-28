import { useState } from "react";
import { H3, Slider, XStack, YStack } from "tamagui";
import { StyledText } from "./Themed";

export const SlidingPrice = [1, 3, 6, 9, 21, 33, 60];
export const StartingSlidingScaleValue = Math.ceil(SlidingPrice.length / 2);

const PriceMessages = [
  "I appreciate you if this is all you can afford",
  "I appreciate you if this is all you can afford",
  "Thank you for supporting me 🧡",
  "Thank you for supporting me 🧡",
  "Thank you for your generous support 🧡",
  "Wow! thank you so much. This means a lot to me.",
  "Wow! thank you so much. I'd love to send you a handwritten card.",
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
export function SlidingScalePayment({
  val,
  setVal,
}: {
  val: number[];
  setVal: (value: number[]) => void;
}) {
  const [valueInternal, setValueInternal] = useState([
    StartingSlidingScaleValue,
  ]);
  const value = val ?? valueInternal;
  const setValue = setVal ?? setValueInternal;

  const moneyValue = getSlidingPriceMoneyValue(value[0]);
  return (
    <YStack gap="$5">
      <Slider
        min={1}
        max={SlidingPrice.length}
        step={1}
        value={value}
        onValueChange={setValue}
        position="relative"
      >
        <Slider.Track backgroundColor="$green5" size="$10">
          <Slider.TrackActive backgroundColor="$green8" />
        </Slider.Track>
        <Slider.Thumb
          index={0}
          circular
          elevate
          size="$3"
          backgroundColor="$green10"
          borderColor="$green11"
          zIndex={1}
        />
        <XStack
          justifyContent="space-between"
          position="absolute"
          width="98%"
          marginLeft="1%"
          zIndex={0}
        >
          {Array.from({ length: SlidingPrice.length }, (_, index) => (
            <StyledText key={index} metadata fontSize="$7" elevation={5}>
              |
            </StyledText>
          ))}
        </XStack>
      </Slider>
      <YStack alignItems="center">
        <H3>${moneyValue}</H3>
        <StyledText>{PriceMessages[value[0] - 1]}</StyledText>
      </YStack>
    </YStack>
  );
}
