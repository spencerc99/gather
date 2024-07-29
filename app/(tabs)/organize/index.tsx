import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyledView } from "../../../components/Themed";
import { UncategorizedView } from "../../../views/UncategorizedView";

export default function OrganizeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <StyledView flex={1} paddingTop={insets.top}>
      <UncategorizedView />
    </StyledView>
  );
}
