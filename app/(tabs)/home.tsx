// ABOUTME: Renders Gather's primary text-foraging tab.
// ABOUTME: Opens the saved default collection or a collection supplied by route parameters.
import { useLocalSearchParams } from "expo-router";
import { ChatDetailView } from "../../views/ChatDetailView";
import { AppSettingType, getAppSetting } from "../settings";

export default function HomeScreen() {
  const { collectionId } = useLocalSearchParams();
  const defaultCollectionId = getAppSetting(AppSettingType.DefaultCollection);

  return (
    <ChatDetailView
      initialCollectionId={
        collectionId ? collectionId.toString() : defaultCollectionId
      }
    />
  );
}
