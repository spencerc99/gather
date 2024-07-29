import { useLocalSearchParams } from "expo-router";
import { BlockDetailView } from "../../../components/BlockDetailView";
import { useBlock } from "../../../utils/db";
import { Spinner } from "tamagui";
import { StyledView } from "../../../components/Themed";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

export default function BlockDetailScreen() {
  const { id } = useLocalSearchParams();
  const { data: block, isFetching } = useBlock(id.toString());
  const insets = useSafeAreaInsets();

  return (
    <StyledView
      flex={1}
      paddingTop={Platform.OS === "android" ? insets.top : 0}
    >
      {!block || isFetching ? (
        <Spinner size="large" color="$orange9" />
      ) : (
        <BlockDetailView block={block} />
      )}
    </StyledView>
  );
}
