import { SafeAreaView } from "react-native";
import { UncategorizedView } from "../../../views/UncategorizedView";

export default function OrganizeScreen() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <UncategorizedView />
    </SafeAreaView>
  );
}
