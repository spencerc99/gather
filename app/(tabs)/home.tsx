import { Stack, useLocalSearchParams } from "expo-router";
import { ChatDetailView } from "../../views/ChatDetailView";

export default function HomeScreen() {
  const { collectionId } = useLocalSearchParams();

  return (
    <>
      <Stack.Screen options={{ animation: "slide_from_bottom" }} />
      <ChatDetailView
        initialCollectionId={collectionId ? collectionId.toString() : null}
      />
    </>
  );
}
