module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo wires up expo-router itself (including the app root it
  // needs at build time) — adding options here breaks that detection.
  return { presets: ['babel-preset-expo'] };
};
