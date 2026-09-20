# Steady for Android

The phone client. Expo / React Native, five screens, same model output as the
web app.

## Running it in development

```bash
npm run dev:steady-mobile          # from the repo root
```

Then press `a` for Android, `i` for iOS, or `w` for the browser.

The app talks to a Steady server. In development that is almost certainly the
one on your laptop, which the phone cannot reach as `localhost`:

```bash
# Find your machine's LAN address, then:
STEADY_API_BASE_URL=http://192.168.1.50:3100 npm run start -w @steady/mobile
```

Start the server so it accepts the app's origin:

```bash
STEADY_ALLOWED_ORIGINS="http://localhost:8081" npm run dev -w @steady/web
```

(Only Expo *web* needs that — a native build sends no `Origin` header, so CORS
does not apply to it.)

## Getting an APK

**In CI, which is the supported path.** Actions → **Steady Android APK** → *Run
workflow*, set `api_base_url` to something the phone can reach, download the
artifact from the run, then:

```bash
adb install -r steady-*.apk
```

Building locally works too, if you have the Android SDK and a JDK 17:

```bash
cd apps/steady-mobile
STEADY_API_BASE_URL=https://steady.example.com npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# android/app/build/outputs/apk/release/app-release.apk
```

`android/` is generated and gitignored — `expo prebuild` recreates it from
`app.config.js` every time, so never edit it by hand and expect the change to
survive.

### The server URL is baked in at build time

This is the one thing that reliably goes wrong. `STEADY_API_BASE_URL` is read
by `app.config.js` at build time and lands in `extra.apiBaseUrl`. An APK built
without it points at `http://localhost:3100`, where `localhost` is *the phone*
— so it installs, launches, and then fails every request for no visible reason.

The profile screen prints the server it is pointing at, which is the fastest
way to check a build is what you think it is.

`http://` URLs also need cleartext traffic, which Android 9+ blocks by default.
`app.config.js` enables it automatically **only** when the configured URL is
`http://`, so an HTTPS build keeps the secure default.

### Signing

The CI build is signed with the debug keystore `expo prebuild` generates. That
is right for a test build — no secrets, installs anywhere, and impossible to
confuse with something ready for the Play Store.

For a distributable build, generate an upload keystore, add it and its
passwords as repository secrets, and point the `release` signing config at it
in `android/app/build.gradle` (via a config plugin, so prebuild does not
overwrite it):

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore steady-upload.keystore -alias steady \
  -keyalg RSA -keysize 2048 -validity 10000
```

## Checking it without a device

`e2e/drive.mjs` exports the app through react-native-web and drives the real
screens in a browser against a real server. It covers first launch, anonymous
sign-up, the check-in, the Unfreezer, crisis routing, the reset, support and
the weekly insight.

```bash
# 1. a server
STEADY_DEMO=1 STEADY_ALLOWED_ORIGINS=http://localhost:8099 npm start -w @steady/web

# 2. the app, exported and served
cd apps/steady-mobile
STEADY_API_BASE_URL=http://localhost:3100 npx expo export --platform web --output-dir /tmp/steady-app
npx http-server /tmp/steady-app -p 8099 --cors -s

# 3. drive it
node e2e/drive.mjs
```

This exercises the real screens, the real navigation and the real API client.
It does **not** exercise the native shell — gestures, permissions, the splash
screen. A pass means "the app works"; the APK on a phone is what means "the app
works on Android".

## How the app signs in

It signs *itself* in. On first launch it POSTs to `/api/device` with no
credentials and gets back a bearer token, kept in AsyncStorage. No email, no
OAuth, no browser hand-off — this is the deck's anonymous sign-up, and it is
the whole first-run experience.

An anonymous account cannot be recovered: there is nothing to prove it was
yours. The profile screen says so plainly, rather than letting someone find out
after losing a phone. Pairing is the way out — sign in on the web, tap *Show a
pairing code*, type the six digits into the app. Its check-ins move across, the
token is rotated, and the empty anonymous account is deleted.

Where both accounts have a check-in for the same day, **the web account's is
kept** and the count of skipped days is reported back, rather than silently
overwriting something the person can already see.

## Offline

The last home snapshot is cached. When the server is unreachable the app shows
it **behind an explicit banner saying how old it is**. A plan someone believes
is current when it is nine days old would make the product actively misleading
in exactly the week it matters most.

The blank-mind reset is fully offline: `buildResetScript()` is a pure function,
so the ninety seconds runs locally and the "I did one" POST is best-effort. A
breathing exercise that reports an error because the wifi dropped would undo
the ninety seconds it just spent.

The crisis number is a constant in `@steady/core`, so **it works with no
network, no session and no successful fetch**. The moment someone needs that
screen is not the moment to discover the API is down.
