import dayjs from "dayjs";
import { useContext } from "react";
import {
  useTotalBlockCount,
  useTotalCollectionCount,
  useTotalConnectionCount,
} from "../utils/db";
import { UserContext } from "../utils/user";
import { StyledText } from "./Themed";

function pluralize(word: string, count: number) {
  return count === 1 ? word : `${word}s`;
}

export function UsageInfo() {
  const { currentUser } = useContext(UserContext);
  const today = dayjs();
  const started = currentUser?.createdAt ? dayjs(currentUser.createdAt) : today;
  const daysUsedApp = today.diff(started, "day");
  const { data: totalBlocks = 0 } = useTotalBlockCount();
  const { data: totalCollections = 0 } = useTotalCollectionCount();
  const { data: totalConnections = 0 } = useTotalConnectionCount();

  return (
    <StyledText>
      You've been using Gather for{" "}
      <StyledText color="sienna">
        {daysUsedApp} {pluralize("day", daysUsedApp)}
      </StyledText>
      , collecting{" "}
      <StyledText color="cornflowerblue">
        {totalBlocks} {pluralize("block", totalBlocks)}
      </StyledText>{" "}
      in{" "}
      <StyledText color="darkolivegreen">
        {totalCollections} {pluralize("collection", totalCollections)}
      </StyledText>{" "}
      through{" "}
      <StyledText color="orchid">
        {totalConnections} {pluralize("connection", totalConnections)}
      </StyledText>
      .
    </StyledText>
  );
}
