<div align="center">

# Keepr

**Swipe left to delete, swipe right to keep.**
A privacy-first, fully offline gallery cleaner for Android — built with Expo and React Native.

[![CI](https://github.com/Ader-Land/Keepr/actions/workflows/ci.yml/badge.svg)](https://github.com/Ader-Land/Keepr/actions/workflows/ci.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

</div>

Keepr helps you reclaim storage by turning gallery cleanup into a quick, swipe-based game. Photos and videos
appear one by one: swipe right to keep, swipe left to put them in a review bin, then confirm the deletion in one go.

## Screenshots

<!-- Add screenshots to docs/screenshots and reference them here. -->
_Screenshots coming soon._

## Features

- **Swipe to decide** – gesture-driven cards powered by `react-native-gesture-handler` and `react-native-reanimated`, with undo.
- **Review before deleting** – nothing is removed until you confirm the bin; anything can be moved back to "keep".
- **Keep list** – items you keep are remembered and will not be shown again.
- **Filters** – by media type (photos / videos), album and sort order (date or file size).
- **Progress & badges** – statistics, streaks and achievements to keep cleanups fun.
- **Local reminders** – optional daily or weekly notifications, scheduled on-device.
- **6 languages** – English, Turkish, Spanish, German, French and Portuguese.
- **Themes** – light, dark and system-following themes.
- **Private by design** – no accounts, no analytics, no servers. See [PRIVACY.md](PRIVACY.md).

## Tech stack

| Area | Library |
| --- | --- |
| Framework | Expo SDK 54, React Native 0.81, React 19 |
| State | Zustand (+ AsyncStorage persistence) |
| Navigation | React Navigation (stack) |
| Gestures / animation | react-native-gesture-handler, react-native-reanimated, react-native-worklets |
| Media | expo-media-library, expo-video, expo-file-system |
| Notifications | expo-notifications |

## Getting started

Prerequisites: Node.js 20+ (22 recommended), npm, and an Android emulator or device.

```bash
git clone https://github.com/Ader-Land/Keepr.git
cd Keepr
npm install
npx expo run:android
```

Keepr uses native modules (media library, notifications), so use a development build (`expo run:android`) rather
than Expo Go when testing gallery features. After the first build you can start only the dev server with
`npx expo start`.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Metro dev server |
| `npm run android` | Build and run a debug build on a device / emulator |
| `npm run lint` | Run ESLint (`eslint-config-expo`) |
| `npm test` | Run the Jest test suite (`jest-expo`) |
| `npx expo-doctor` | Check the project configuration and dependency versions |

## Building

### With EAS (cloud)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview      # installable .apk
eas build --platform android --profile production   # .aab for Google Play
```

Profiles are defined in [`eas.json`](eas.json).

### Locally (Gradle)

Requires JDK 17 and the Android SDK.

```bash
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease     # APK -> android/app/build/outputs/apk/release/
./gradlew bundleRelease       # AAB -> android/app/build/outputs/bundle/release/
```

Without a signing configuration the release build is signed with the debug key, which is fine for testing
but **not** for distribution. Create your own keystore for real releases and never commit it
(`*.keystore` and `*.jks` are git-ignored).

### Releases via GitHub Actions

Pushing a tag such as `v1.0.0` triggers [`release.yml`](.github/workflows/release.yml), which builds a release APK
and attaches it to a GitHub Release. To get a properly signed APK, add these repository secrets
(*Settings → Secrets and variables → Actions*):

| Secret | Description |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Your release keystore, base64-encoded (`base64 -w0 release.keystore`) |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |

If the secrets are missing, the workflow still runs but publishes an APK signed with the debug key and marks
the release as a pre-release.

## Permissions

| Permission | Why |
| --- | --- |
| `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` (Android 13+) | Show the photos and videos you are reviewing |
| `READ_MEDIA_VISUAL_USER_SELECTED` | Support Android's "selected photos only" access |
| `READ_EXTERNAL_STORAGE` (Android ≤ 12L) / `WRITE_EXTERNAL_STORAGE` (Android ≤ 10) | Same purpose on older Android versions; capped with `maxSdkVersion` so they are not requested on newer systems |
| `POST_NOTIFICATIONS` (Android 13+) | Optional cleanup reminders |
| `RECEIVE_BOOT_COMPLETED` | Re-schedule reminders after the device restarts (added by `expo-notifications`) |
| `VIBRATE` | Haptic feedback when swiping (added by `expo-haptics`) |
| `INTERNET` | Added by the Expo/React Native template (needed by the development server); Keepr itself makes no network requests with your data |

Keepr does **not** request location, microphone, camera or contacts access. The audio, media-location and
location permissions are explicitly blocked in [`app.json`](app.json).

## Project structure

```text
├── App.js                  # Root component and navigation
├── index.js                # Expo entry point
├── app.json                # Expo configuration
├── eas.json                # EAS build profiles
├── eslint.config.js        # ESLint flat config
├── __tests__/              # Jest tests
├── assets/                 # Icons and splash image
├── plugins/                # Local Expo config plugins
├── scripts/ci/             # Helper scripts used by the release workflow
├── .github/                # CI/release workflows, issue and PR templates
└── src/
    ├── components/         # Reusable UI (SwipeCard, OnboardingModal, StatsDashboard)
    ├── hooks/              # useGallery, useTranslation
    ├── i18n/               # Translation dictionaries
    ├── screens/            # Deck, Summary, Settings, KeepList, Badges, Celebration
    ├── services/           # Notification scheduling
    ├── store/              # Zustand stores (session + persisted settings)
    ├── theme/              # Colors and theme helpers
    └── utils/              # Small shared helpers
```

## Contributing

Contributions are welcome — please read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md) first. Report security issues privately as described in
[SECURITY.md](SECURITY.md).

## License and attribution

Keepr is free software released under the **GNU General Public License v3.0 only** ([LICENSE](LICENSE)).
You may use, study, modify and redistribute it, provided that:

- you keep the copyright notice and the [NOTICE](NOTICE) file, and credit the original author
  (**Ader-Land**, <https://github.com/Ader-Land/Keepr>);
- any distributed derivative work is also licensed under the GPL-3.0 and its complete source code is made available;
- modified versions are clearly marked as modified.

Copyright © 2026 Ader-Land.
