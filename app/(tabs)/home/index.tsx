import { StyleSheet } from "react-native";

import { Text, View } from "../../../components/Themed";
import { ForageView } from "../../../components/ForageView";

export default function TabOneScreen() {
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
