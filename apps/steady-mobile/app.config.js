/**
 * Expo config.
 *
 * A JS config rather than `app.json` for one reason: **the server URL has to
 * be baked in at build time.** A release APK runs on a phone, where
 * `localhost` is the phone itself — so an APK built with the default would
 * install fine, launch fine, and then fail every request with no obvious
 * cause. `STEADY_API_BASE_URL` is read here and ends up in `extra.apiBaseUrl`,
 * which `lib/api.ts` reads at runtime.
 *
 *   STEADY_API_BASE_URL=https://steady.example.com npx expo prebuild
 *
 * ## Cleartext traffic
 *
 * Android 9 and later block plain HTTP by default. That is the right default
 * and stays on for HTTPS builds. But the realistic way to test this APK is
 * against a dev server on your laptop over the LAN — `http://192.168.x.x:3100`
 * — so cleartext is enabled **only when the configured URL is actually http**.
 * An HTTPS build gets the secure default, and nobody has to remember to turn
 * it back on.
 */

const API_BASE_URL = process.env.STEADY_API_BASE_URL ?? 'http://localhost:3100';
const usesCleartextTraffic = API_BASE_URL.startsWith('http://');

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Steady',
  slug: 'steady',
  version: '0.1.0',
  scheme: 'steady',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  backgroundColor: '#F4F7F5',
  splash: {
    backgroundColor: '#1C2724',
    resizeMode: 'contain',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.steady.app',
  },
  android: {
    package: 'com.steady.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#1C2724',
    },
    // Steady asks for nothing. No contacts, no location, no calendar, no
    // analytics SDK that wants a device id. A product whose pitch is "your
    // employer cannot see this" does not get to ship a permission list.
    permissions: [],
    edgeToEdgeEnabled: true,
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
  plugins: [
    'expo-router',
    [
      'expo-build-properties',
      {
        android: { usesCleartextTraffic },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl: API_BASE_URL,
  },
};
