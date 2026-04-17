const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure Metro prioritizes CJS builds for packages that ship ESM with
// import.meta (like zustand v4/v5). This prevents the
// "Cannot use 'import.meta' outside a module" error on web.
config.resolver.unstable_conditionNames = [
  'browser',
  'require',
  'react-native',
];

module.exports = config;
