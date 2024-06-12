import { GetProps, Image } from "tamagui";
import { StyledText, StyledView, UserAvatar } from "./Themed";
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
  // TODO: change these to generic "createdBy" and just pass in connected or created
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
    <UserAvatar
      profilePic={profilePic}
      containerProps={containerProps}
      userId={userId}
    />
  );
}
