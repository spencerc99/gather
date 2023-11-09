import { useLocalSearchParams } from "expo-router";
import { ChatDetailView } from "../../../views/ChatDetailView";

export default function DefaultCollectionChatScreen() {
  const { id } = useLocalSearchParams();

  return <ChatDetailView initialCollectionId={id.toString()} />;
}
