import { StyleSheet } from "react-native";
import { Collection, RemoteSourceType } from "../utils/dataTypes";
import {
  ArenaLogo,
  AspectRatioImage,
  StyledLabel,
  StyledParagraph,
  StyledView,
} from "./Themed";
import { GetProps, SizableText, XStack, YStack, useTheme } from "tamagui";
import { getRelativeDate } from "../utils/date";
import { ensureUnreachable } from "../utils/react";
import { RemoteSourceLabel } from "./RemoteSourceLabel";

export function CollectionSummary({
  collection,
  viewProps = {},
}: {
  collection: Collection;
  viewProps?: GetProps<typeof StyledView>;
}) {
  const {
    title,
    updatedAt,
    createdBy,
    numBlocks: numItems,
    lastConnectedAt,
    thumbnail,
    remoteSourceType,
  } = collection;
  const theme = useTheme();

  return (
    <XStack
      paddingVertical="$4"
      width="100%"
      paddingHorizontal="$3"
      // borderWidth={1}
      borderRadius={16}
      borderColor={theme.color.get()}
      backgroundColor={theme.background.get()}
      space="$3"
      {...viewProps}
    >
      {/* TODO: this doesnt work with long overflowing titles im gonna kms */}
      <YStack flexGrow={1}>
        <XStack>
          <StyledParagraph
            title
            flexGrow={1}
            {...(Boolean(remoteSourceType)
              ? {
                  paddingRight: "$3",
                }
              : {})}
            // TODO: this doesnt work idk why
            wordWrap="break-word"
          >
            {title}
          </StyledParagraph>
          <RemoteSourceLabel remoteSourceType={remoteSourceType} />
        </XStack>
        <StyledView style={styles.metaContainer}>
          <StyledParagraph metadata>
            {/* {createdBy} | {numItems} items */}
            {numItems} items
          </StyledParagraph>
          <StyledParagraph style={styles.floatRight} metadata>
            {getRelativeDate(lastConnectedAt || updatedAt)}
          </StyledParagraph>
        </StyledView>
      </YStack>
      <YStack width={40} height={40}>
        <AspectRatioImage
          uri={thumbnail}
          otherProps={{
            aspectRatio: 1,
            resizeMode: "cover",
            borderRadius: "$2",
            height: 40,
            width: 40,
          }}
        />
      </YStack>
    </XStack>
  );
}

export const styles = StyleSheet.create({
  metaContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  floatRight: {
    alignSelf: "flex-end",
  },
});

export function CollectionThumbnail({
  collection,
  viewProps = {},
}: {
  collection: Collection;
  viewProps?: GetProps<typeof StyledView>;
}) {
  const { title, thumbnail, numBlocks } = collection;
  const theme = useTheme();

  return (
    <YStack
      space="$2"
      borderRadius={8}
      backgroundColor={theme.background.get()}
      width={100}
      // TODO: literally have no idea why this is needed. Otherwise it grows BEYOND ITS CONTAINER to become like 400px. what the fuck
      // i hate react native so much.
      height={145}
      borderWidth={2}
      borderColor="transparent"
      {...viewProps}
      paddingBottom="$1"
      overflow="hidden"
    >
      <AspectRatioImage
        uri={thumbnail}
        otherProps={{
          aspectRatio: 1,
          resizeMode: "cover",
          borderRadius: "$2",
          // account for the border lmfao this is insane code.
          maxWidth: 100,
          maxHeight: 100,
          width: 100,
          height: 100,
        }}
      />
      <SizableText numberOfLines={2} paddingHorizontal="$1.5" size="$3">
        {title}
      </SizableText>
      {/* <StyledParagraph metadata>{numBlocks}</StyledParagraph> */}
    </YStack>
  );
}
