# The Divine Tarot — mobile app (Android, iPhone and web)

Companion app for [thedivinetarotonline.com](https://thedivinetarotonline.com/), built with
**Expo SDK 57 / React Native 0.86**. One codebase makes the Android app, the iPhone app and a web version.

## What the app does

| Tab | What it does |
|---|---|
| **Home** | Card of the Day, quick links (incl. Personal Reading booking), testimonials from the admin panel (hidden if there are none) |
| **Reading** — *Ginni Ki Baatein* | Private tarot chat: type a question, pick cards from the fan, get the answer. 3 free readings a day; **Ginni Unlimited** (₹199 / 30 days) removes the limit |
| **Courses** | The courses from learn.thedivinetarotonline.com, with "Enrol now" links to the website |
| **Kundli** | Kundli Milan (8-koota, 36 gunas), worked out on the phone. **Full report** ₹99 |
| **Profile** | Sign in (Google, phone OTP, Apple on iPhone), profile details, My readings, Card library, daily reminder, language (English / हिन्दी / Hinglish), privacy switches, Delete account |

- Without login the app runs in **guest mode**; everything is saved on the phone.
- With login (Firebase), the profile, saved readings and purchases follow the user to other devices.
- Payments use **Razorpay**; a small **Google Apps Script** backend checks each payment and logs it in a Google Sheet.
- **Everything opens inside the app.** Website pages, Personal Reading booking, Razorpay payment pages, course enrol links, Kundli, support and social profiles all open on the app's own browser screen (`src/app/web.tsx`). Only UPI apps, phone calls, email and WhatsApp hand over to the phone.
- Card pictures load from `https://thedivinetarotonline.com/card_img/<Card Name>.png` — **do not rename those files on the website.**

## Setup guides — do them in this order

1. [Firebase](docs/SETUP-FIREBASE.md) — login, profiles, saved readings, security rules
2. [Apps Script](docs/SETUP-APPS-SCRIPT.md) — payment checks, Payments and Sessions sheets
3. [Razorpay](docs/SETUP-RAZORPAY.md) — keys, testing, going live, store payment rules
4. [Build and publish](docs/BUILD-AND-PUBLISH.md) — EAS builds, Play Store, App Store, web, over-the-air updates

Also: [Privacy policy text](docs/PRIVACY-POLICY.md) for the website's `/privacy` page.

## Where to change what

| I want to change… | File |
|---|---|
| Prices, products, free readings per day | `src/constants/config.ts` (`Products`, `FREE_READINGS_PER_DAY`) **and** `apps-script/Code.gs` (`PRODUCTS`, in paise) |
| Turn Razorpay off on Android / iPhone / web, hide course prices + Enrol links, hide Home's Personal Reading shortcut | `src/constants/config.ts` → `StorePolicy` |
| Website, social and booking links | `src/constants/config.ts` → `Links` |
| Keys and URLs (Razorpay Key ID, Apps Script URL, Firebase web config) | `.env` (copy of `.env.example`) / EAS environment variables |
| All on-screen text, in 3 languages | `src/i18n/strings.ts` |
| Card meanings (78 cards) | `src/data/cards.ts` |
| Ginni's answers (knowledge base) | `src/data/kb/*.json` (fill gaps with `npm run kb:translate`) |
| Courses list | `src/data/courses.ts` |
| Spreads / positions | `src/data/spreads.ts` |
| Colours and fonts | `src/constants/theme.ts` |
| Screens | `src/app/` (`(tabs)/` = the five tabs) |
| Kundli maths | `src/lib/kundli/` |
| Payment flow | `src/lib/payments/` |
| In-app browser (all outside pages) | `src/app/web.tsx`, `src/lib/links.ts` |
| Login and cloud data | `src/lib/firebase/` |
| App name, bundle ID / package, icons, permissions | `app.json`, `assets/images/` |
| Firebase native set-up (added only when the Firebase files exist) | `app.config.ts` |
| Build and submit profiles | `eas.json` |
| Server (orders, payment check, analytics) | `apps-script/Code.gs`, `apps-script/appsscript.json` |
| Database security rules (merge into Firebase, don't replace) | `firestore.rules` |

## Quick start (on your computer)

```bash
npm ci                     # install exact library versions
cp .env.example .env       # then fill in the values (see the setup guides)
npx expo start --web       # quick look in the browser
```

To test on a real phone, make a **development build** once (Expo Go from the store does not support SDK 57 yet):

```bash
eas build --profile development --platform android   # install the APK it gives you
npx expo start                                        # open the dev app and scan the QR code
```

Code changes then appear on the phone instantly. Rebuild only after adding a native library or changing `app.json` / Firebase files.

## Checks before every build

```bash
npm run typecheck      # finds code type errors
npm run lint           # finds code style problems
npm run test:kundli    # checks the Kundli Milan calculations
npx expo-doctor        # checks library versions and config
```

## Warnings

- **Never run `npm audit fix --force`** — it installs wrong library versions and breaks the build.
- **Never install the old global `expo-cli`** — use `npx expo …` and `eas-cli` only.
- Add libraries with `npx expo install <name>`, not `npm install`, so versions match SDK 57.
- Never put the Razorpay **Key Secret** in `.env` or anywhere in the app — it belongs only in Apps Script.
- `google-services.json` and `GoogleService-Info.plist` are not secret and **must be committed** so EAS can use them.

Developed by [Sitelytc](https://sitelytc.com/).
