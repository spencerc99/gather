import { useQuery } from "@tanstack/react-query";
import { ContributionsKey, getItem } from "../utils/asyncStorage";
import { YStack } from "tamagui";
import { StyledText } from "./Themed";
import dayjs from "dayjs";
import { Contribution } from "./SlidingScalePayment";

export function ContributionsList() {
  const { data: contributions } = useQuery<Contribution[]>({
    queryKey: [ContributionsKey],
    queryFn: () => {
      return getItem<Contribution[]>(ContributionsKey) || [];
    },
  });

  return contributions?.length ? (
    <>
      <StyledText>
        Thank you so much for your contribution to the development and
        maintenance of this app!
      </StyledText>
      <YStack gap="$1">
        {contributions.map(({ price, date }, index) => (
          <StyledText key={index}>
            - <StyledText bold>${price}</StyledText> on{" "}
            {dayjs(date).format("MM/DD/YYYY")}
          </StyledText>
        ))}
      </YStack>
    </>
  ) : null;
}
