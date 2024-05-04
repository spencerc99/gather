import { useQuery } from "@tanstack/react-query";
import { ContributionsKey, getItem } from "../utils/asyncStorage";
import { YStack } from "tamagui";
import { StyledText } from "./Themed";
import { useContext } from "react";
import { UserContext } from "../utils/user";
import dayjs from "dayjs";
import { Contribution } from "./SlidingScalePayment";

export function ContributionsList() {
  const { data: contributions } = useQuery<Contribution[]>({
    queryKey: [ContributionsKey],
    queryFn: () => {
      return getItem<Contribution[]>(ContributionsKey) || [];
    },
  });

  const { currentUser } = useContext(UserContext);
  const today = dayjs();
  const started = currentUser?.createdAt ? dayjs(currentUser.createdAt) : today;
  const daysUsedApp = today.diff(started, "day");

  return contributions ? (
    <YStack gap="$2">
      <StyledText>
        Thank you so much for your contribution to the development and
        maintenance of this app! You've been using Gather for {daysUsedApp}{" "}
        days.
      </StyledText>
      <YStack gap="$1">
        {contributions.map(({ price, date }, index) => (
          <StyledText key={index}>
            - <StyledText bold>${price}</StyledText> on{" "}
            {dayjs(date).format("MM/DD/YYYY")}
          </StyledText>
        ))}
      </YStack>
    </YStack>
  ) : null;
}
