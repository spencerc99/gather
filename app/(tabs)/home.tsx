import { Stack } from "expo-router";
import { ChatDetailView } from "../../views/ChatDetailView";

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ animation: "slide_from_bottom" }} />
      <ChatDetailView initialCollectionId={null} />
    </>
  );
}
