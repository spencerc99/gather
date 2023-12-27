import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChatDetailView } from "../../views/ChatDetailView";

export default function HomeScreen() {
  const router = useRouter();
  const { collectionId } = useLocalSearchParams();

  function setSelectedCollection(collectionId: string | null) {
    router.setParams(collectionId ? { collectionId } : { collectionId: "" });
  }

  return (
    <>
      <Stack.Screen options={{ animation: "slide_from_bottom" }} />
      <ChatDetailView
        initialCollectionId={collectionId ? collectionId.toString() : null}
      />
    </>
  );
}
