const { NODE_ENV } = process.env;

const inProduction = NODE_ENV === "production";
console.log("inProduction?", inProduction);

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Required for expo-router
      "expo-router/babel",
      ...(inProduction ? ["transform-remove-console"] : []),
      // Required for react-native-reanimated, must be listed last
      "react-native-reanimated/plugin",
    ],
  };
};
