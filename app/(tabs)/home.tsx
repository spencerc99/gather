import { Stack, useLocalSearchParams } from "expo-router";
import { ChatDetailView } from "../../views/ChatDetailView";
import { AppSettingType, getAppSetting } from "../settings";

export default function HomeScreen() {
  const { collectionId } = useLocalSearchParams();
  const defaultCollectionId = getAppSetting(AppSettingType.DefaultCollection);

  return (
    <>
      <Stack.Screen options={{ animation: "slide_from_bottom" }} />
      <ChatDetailView
        initialCollectionId={
          collectionId ? collectionId.toString() : defaultCollectionId
        }
      />
    </>
  );
}
