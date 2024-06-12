import { YStack } from "tamagui";
import { StyledText } from "./Themed";
import dayjs from "dayjs";
import { useContributions } from "../utils/hooks/useContributions";

export function ContributionsList() {
  const contributions = useContributions();

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
