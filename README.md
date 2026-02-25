# Keepr - Premium React Native Source Code Template 🚀

Welcome to **Keepr**, a modern, highly optimized, and intuitive mobile application template built with Expo & React Native. Designed to help users regain control over their digital life, Keepr declutters local storage with an engaging "Swipe-to-Action" (Tinder-style) experience.

It is perfect as a robust starting point for a gallery cleaner, photo organizer, or utility application on both iOS and Android.

## ✨ Key Features

- **Tinder-Style Swiping:** Review photos and videos effortlessly with smooth, gesture-driven animations powered by `react-native-reanimated`.
- **Privacy First:** All media scanning and processing are completely local. No external servers or API calls are used for gallery data.
- **Smart Filtering:** Organize gallery by specific albums, media types (photos/videos), and sizes.
- **Gamified Experience:** Users earn unique badges and track progress through a structured achievement system.
- **Extensive i18n Support:** Fully translated into 6 languages (English, Turkish, Spanish, German, French, Portuguese).
- **Modern Aesthetics:** Sleek UI with completely integrated **Dark and Light Mode** support.
- **Local Notifications:** Keeps users engaged with smart daily/weekly reminders.

## 🛠️ Tech Stack & Dependencies

- **Framework:** [React Native](https://reactnative.dev/) & [Expo SDK 54](https://expo.dev/)
- **Store / State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Gestures & Animations:** `react-native-gesture-handler` & `react-native-reanimated`
- **Media Handling:** `expo-media-library`, `expo-av`, `expo-video`
- **Notifications:** `expo-notifications`
- **Navigation:** `@react-navigation/native` & `@react-navigation/stack`

---

## 🚀 Getting Started

Follow these steps to successfully spin up the application on your local machine.

### Prerequisites

- Node.js (v18 or newer recommended)
- `npm` or `yarn` installed
- iOS Simulator (macOS only) or Android Emulator installed via Android Studio
- Expo Go app on your physical device (if testing directly on a phone)

### Installation

1. **Clone or Extract the Source Code**
   ```bash
   cd Keepr
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the Development Server**
   ```bash
   npx expo start
   ```
   Press `i` to open in iOS simulator, `a` to open in Android emulator, or scan the QR code using Expo Go on your physical device.

---

## 🎨 Customization Guide (White-labeling)

Keepr is built to be easily personalized according to your branding needs. 

### 1. Changing App Name & Package Name
Open `app.json` in the root folder.
- Change `"name": "Keepr"` to your brand's name.
- Change `"slug": "Keepr"` to your designated slug.
- Under `ios.bundleIdentifier` (if you add it) and `android.package`, replace `"com.keepr.app"` with your unique domain notation (e.g., `"com.yourcompany.appname"`).

### 2. Branding (Icons & Splash Screen)
Replace the existing images found in the `/assets` folder with your own designs. Ensure identical names and roughly the same dimensions for best compatibility:
- `icon.png` (App Icon)
- `adaptive-icon.png` (Android Adaptive Icon)
- `splash-icon.png` (Splash Screen Image)

### 3. Modifying Color Theme
All global colors are centralized in `src/theme/colors.js`. You can simply alter the HEX strings inside `LIGHT_COLORS` and `DARK_COLORS` to fit your overall brand guidelines.
```javascript
export const LIGHT_COLORS = {
    primary: '#FF5252', // Change this to your main brand color
    secondary: '#4CAF50',
    // ...
};
```

### 4. Language & Localization
Keepr features built-in translations located at `src/i18n/translations.js`.
To change the default language from `en` (English) to another language, modify the initial state in `src/store/useSettingsStore.js`:
```javascript
language: getLocales()[0].languageCode || 'en', // Change 'en' to your desired code
```

---

## 📦 Building for Production

Expo makes it straightforward to compile your source code into standalone `.apk`, `.aab`, or `.ipa` files. We highly recommend using EAS (Expo Application Services).

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```
2. **Log into Expo**
   ```bash
   eas login
   ```
3. **Configure the Project**
   ```bash
   eas build:configure
   ```
4. **Create the Build**
   - For **Android** App Bundle (.aab - required for Play Store):
     ```bash
     eas build --platform android
     ```
   - For **iOS** (.ipa):
     ```bash
     eas build --platform ios
     ```
*(To build a local `.apk` for testing Android directly, you can run `eas build -p android --profile preview` provided you configured a preview profile in `eas.json`)*.

---

## 📁 Folder Structure Overview

```text
├── App.js                     # Root component & Navigation setup
├── app.json                   # Expo configuration mappings
├── /src
│   ├── /components            # Reusable UI components (SwipeCards, Badges, etc)
│   ├── /hooks                 # Custom React hooks (useGallery, useTranslation)
│   ├── /i18n                  # Language dictionaries
│   ├── /screens               # Application routes/screens
│   ├── /services              # Hardware/OS interfacing (Notifications)
│   ├── /store                 # Zustand global context setup
│   └── /theme                 # Global styling config & Colors
└── /assets                    # Static image and font assets
```

## 📄 License & Support

This source code is licensed under the MIT License unless stated otherwise in your platform purchase agreement. 

If you encounter any issues regarding the foundation of the code, feel free to inspect the active documentation at [React Native](https://reactnative.dev/docs/getting-started) and [Expo](https://docs.expo.dev/).

*Thank you for purchasing Keepr! Happy Coding!* 🎉
