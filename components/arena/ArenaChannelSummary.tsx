import { GetProps, YStack } from "tamagui";
import {
  ArenaChannelInfo,
  rawArenaChannelToCollection,
} from "../../utils/arena";
import { CollectionSummary } from "../CollectionSummary";
import { StyledLabel, StyledView, UserAvatar } from "../Themed";

export function ArenaChannelSummary({
  channel,
  isDisabled,
  viewProps,
}: {
  channel: ArenaChannelInfo;
  isDisabled?: boolean;
  viewProps?: GetProps<typeof StyledView>;
}) {
  let titleColor;
  switch (channel.status) {
    case "private":
      titleColor = "$red10";
      break;
    case "public":
      titleColor = "$green10";
      break;
    case "closed":
    default:
      break;
  }

  return (
    <>
      {isDisabled && (
        <YStack alignItems="center">
          <YStack
            position="absolute"
            paddingVertical="$0.5"
            paddingHorizontal="$2"
            backgroundColor="$gray8"
            borderRadius="$4"
          >
            {/* TODO: this is kinda jank */}
            <StyledLabel>Already imported!</StyledLabel>
          </YStack>
        </YStack>
      )}
      <CollectionSummary
        collection={rawArenaChannelToCollection(channel)}
        viewProps={{
          borderWidth: 0,
          backgroundColor: "inherit",
          paddingHorizontal: "$3",
          paddingVertical: "$2",
          ...viewProps,
        }}
        titleProps={{
          color: titleColor,
        }}
        extraMetadata={
          <UserAvatar
            profilePic={channel.user.avatar_image.thumb}
            userId={channel.user.slug}
            size={16}
          />
        }
      />
    </>
  );
}
