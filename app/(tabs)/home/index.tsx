import { StyleSheet } from "react-native";
import { ForageView } from "../../../components/ForageView";
import { View } from "tamagui";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ForageView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: "40%",
    paddingLeft: "10%",
    paddingRight: "10%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});
