import { GetProps, Image } from "tamagui";
import { StyledText, StyledView } from "./Themed";
import { useQuery } from "@tanstack/react-query";
import { getArenaUserInfo } from "../utils/arena";
import { Block, RemoteSourceType } from "../utils/dataTypes";
import { ensureUnreachable } from "../utils/react";
import { UserContext, extractCreatorFromCreatedBy } from "../utils/user";
import { useContext } from "react";

export function BlockCreatedByAvatar({
  block,
  containerProps,
}: {
  block: Block;
  containerProps?: GetProps<typeof StyledView>;
}) {
  const { connectedBy, createdBy, remoteSourceType } = block;
  const { isBlockConnectedByUser, isBlockCreatedByUser } =
    useContext(UserContext);
  const { userId } = extractCreatorFromCreatedBy(connectedBy || createdBy);
  const isOwner = connectedBy
    ? isBlockConnectedByUser(block)
    : isBlockCreatedByUser(block);

  const { data: profilePic } = useQuery({
    queryKey: ["profilePic", userId],
    queryFn: async () => {
      if (isOwner !== false || !remoteSourceType) {
        return "";
      }
      switch (remoteSourceType) {
        case RemoteSourceType.Arena:
          // TODO: cache these in mmkv
          return (await getArenaUserInfo(userId))?.avatar_image.thumb;
        default:
          return ensureUnreachable(remoteSourceType);
      }
    },
  });

  return (
    <StyledView
      width={20}
      height={20}
      borderRadius={100}
      justifyContent="center"
      alignItems="center"
      backgroundColor="$gray7"
      position="relative"
      {...containerProps}
    >
      {profilePic && (
        <Image
          position="absolute"
          source={{ uri: profilePic }}
          width={20}
          height={20}
          borderRadius={100}
          zIndex={1}
        />
      )}
      <StyledText>{userId[0].toUpperCase()}</StyledText>
    </StyledView>
  );
}
