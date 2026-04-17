module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Fix: "Cannot use 'import.meta' outside a module" on web
          // This transforms import.meta references so they work in both
          // ESM and CJS contexts (Metro web bundle)
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
