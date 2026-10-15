// ABOUTME: Configures Metro bundling for Gather's native and web targets.
// ABOUTME: Preserves native package resolution for dependencies with incompatible exports maps.
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

config.transformer.minifierConfig = {
  compress: {
    // The option below removes all console logs statements in production.
    drop_console: true,
  },
};

// Expo 49 issue: default metro config needs to include "mjs"
// https://github.com/expo/expo/issues/23180
config.resolver.sourceExts.push("mjs");

// Tamagui 1.x lists its generic ESM entry before its React Native entry.
// Metro otherwise loads the web build on iOS, which accesses browser globals.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
