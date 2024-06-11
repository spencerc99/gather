import dayjs from "dayjs";
import { useContext } from "react";
import {
  useTotalBlockCount,
  useTotalCollectionCount,
  useTotalConnectionCount,
} from "../utils/db";
import { UserContext } from "../utils/user";
import { StyledText } from "./Themed";

export function UsageInfo() {
  const { currentUser } = useContext(UserContext);
  const today = dayjs();
  const started = currentUser?.createdAt ? dayjs(currentUser.createdAt) : today;
  const daysUsedApp = today.diff(started, "day");
  const { data: totalBlocks } = useTotalBlockCount();
  const { data: totalCollections } = useTotalCollectionCount();
  const { data: totalConnections } = useTotalConnectionCount();

  return (
    <StyledText>
      You've been using Gather for{" "}
      <StyledText color="sienna">{daysUsedApp} days</StyledText>, collecting{" "}
      <StyledText color="cornflowerblue">{totalBlocks} blocks</StyledText> in{" "}
      <StyledText color="darkolivegreen">
        {totalCollections} collections
      </StyledText>{" "}
      through{" "}
      <StyledText color="orchid">{totalConnections} connections</StyledText>.
    </StyledText>
  );
}
