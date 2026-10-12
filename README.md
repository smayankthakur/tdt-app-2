# The Divine Tarot — mobile app (Android + iOS)

Companion app for [thedivinetarotonline.com](https://thedivinetarotonline.com/), built with **Expo SDK 57 / React Native 0.86**. One codebase produces both the Android and the iOS app.

## What's inside

| Tab | What it does |
|---|---|
| **Home** | Hero, Card of the Day preview, how it works, quick links |
| **Reading** | Free 3-card reading: pick a topic (Life / Love / Career / Decision), ask a question, shuffle, pick 3 of 21 face-down cards, flip to reveal, share. Saved automatically. |
| **Daily Card** | One card per day per user, with an optional daily reminder notification (on-device, no server) |
| **Courses** | The 5 courses from learn.thedivinetarotonline.com (catalogue only, see payments note) |
| **More** | My Readings (history), Card Library (all 78 cards), Personal Reading, Ask Ginni, Kundli Milan, socials, support, privacy |

There's no login and no backend. Everything the user saves stays on their phone, and card artwork loads from the website (`/card_img/<Card Name>.png`).

## Where to change things

| Change | File |
|---|---|
| Website links, payment switches (`StorePolicy`) | `src/constants/config.ts` |
| Colours & fonts | `src/constants/theme.ts` |
| Card meanings (78 cards) | `src/data/cards.ts` |
| Courses | `src/data/courses.ts` |
| App name, bundle ID / package name, icons | `app.json`, `assets/images/` |
| Build & submit profiles | `eas.json` |

## Run it on your computer

```bash
npm install
npx expo start          # press "a" for an Android emulator, or scan the QR code
npx expo start --web    # quick look in the browser
```

## Checks before every build

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

## Build & publish (summary)

```bash
npm install -g eas-cli
eas login
eas init                                   # links the project to your Expo account
eas build --profile preview --platform android    # installable .apk for testing
eas build --profile production --platform all     # store builds (.aab + .ipa)
eas submit --platform android              # upload to Google Play (internal track)
eas submit --platform ios                  # upload to App Store Connect / TestFlight
```

The full step-by-step launch guide (accounts, store listings, review, payments rules) has been shared separately.
