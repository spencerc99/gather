import { useLocalSearchParams } from "expo-router";
import { TextForageView } from "../../../components/TextForageView";

export default function CollectionChatScreen() {
  const { id } = useLocalSearchParams();
  return <TextForageView collectionId={id.toString()} />;
}
