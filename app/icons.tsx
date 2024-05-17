import { getAppIcon, setAppIcon } from "expo-dynamic-app-icon";
import { useState } from "react";
import { H3, H4, Stack, XStack, YStack } from "tamagui";
import { Image, SafeAreaView } from "react-native";
import { StyledText } from "../components/Themed";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";

export const AppIcons = [
  {
    iconName: "moon",
    source: require(`../assets/images/icon.png`),
  },
  {
    iconName: "clouds",
    source: require(`../assets/images/icon-clouds.png`),
  },
  {
    iconName: "water",
    source: require(`../assets/images/icon-water.png`),
  },
  {
    iconName: "hand",
    source: require(`../assets/images/icon-hand.png`),
  },
];
export function getAppIconSource() {
  const appIcon = getAppIcon();
  return (
    AppIcons.find((icon) => icon.iconName === appIcon)?.source ||
    AppIcons[0].source
  );
}

export default function Icons() {
  const [appIcon, setIcon] = useState<string>(getAppIcon());
  function onSelectIcon(iconName: string) {
    const iconType = iconName;
    setAppIcon(iconType);
    setIcon(iconType);
  }

  useFixExpoRouter3NavigationTitle();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AppIconSelect appIcon={appIcon} onSelectIcon={onSelectIcon} />
    </SafeAreaView>
  );
}

/* thanks to https://github.com/outsung/expo-dynamic-app-icon/tree/main/example */
function AppIconSelect({
  appIcon,
  onSelectIcon,
}: {
  appIcon: string;
  onSelectIcon: (iconName: string) => void;
}) {
  return (
    <YStack gap="$4" padding="10%">
      <H3>Choose Your Icon</H3>
      <XStack gap="$2" justifyContent="center">
        {AppIcons.map(({ iconName, source }) => {
          const selected =
            appIcon === iconName ||
            (appIcon === "DEFAULT" && iconName === "moon");

          return (
            <Stack
              key={iconName}
              onPress={() => onSelectIcon(iconName)}
              borderWidth={2}
              borderColor={selected ? "$green10" : "transparent"}
              borderRadius={18}
            >
              <Image
                source={source}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                }}
              />
            </Stack>
          );
        })}
      </XStack>
      {/* TODO: add open channel for adding to it? */}
      <StyledText>
        I took these photos between 2020-2023. They capture snapshot moments of
        life that I want to hold onto. I revisit them to remind me to pay
        attention attention to the motion of the world. I hope Gather can be a
        tool and reminder for you to do the same.
      </StyledText>
    </YStack>
  );
}
