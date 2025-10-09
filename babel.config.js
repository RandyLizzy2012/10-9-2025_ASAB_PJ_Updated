module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // List your plugins here, e.g.,
      "@babel/plugin-transform-runtime",
      "react-native-worklets/plugin", // Updated from react-native-reanimated/plugin
      "nativewind/babel", // Example for Nativewind
    ],
  };
};
