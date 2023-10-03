// TODO: reconcile this with tamagui, just need to figure out the tint stuff for tabs
const tintColorLight = "#2f95dc";
const tintColorDark = "#fff";

export default {
  light: {
    text: "#000",
    background: "#fff",
    tint: tintColorLight,
    tabIconDefault: "#ccc",
    tabIconSelected: tintColorLight,
    button: {
      primary: "#2f95dc",
      secondary: "#ccc",
      disabled: "#ccc",
      text: "#000",
      borderWidth: 1,
      borderRadius: 4,
      paddingVertical: 8,
      paddingHorizontal: 16,
      background: "blue",
    },
  },
  dark: {
    text: "#fff",
    background: "#000",
    tint: tintColorDark,
    tabIconDefault: "#ccc",
    tabIconSelected: tintColorDark,
    button: {
      primary: "#2f95dc",
      secondary: "#ccc",
      disabled: "#ccc",
      text: "#fff",
      borderWidth: 1,
      borderRadius: 4,
      paddingVertical: 8,
      paddingHorizontal: 16,
      background: "blue",
    },
  },
};
