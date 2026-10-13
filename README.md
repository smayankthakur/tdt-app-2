# The Divine Tarot — mobile app (Android, iPhone and web)

Companion app for [thedivinetarotonline.com](https://thedivinetarotonline.com/), built with
**Expo SDK 57 / React Native 0.86**. One codebase makes the Android app, the iPhone app and a web version.

## What the app does

| Tab | What it does |
|---|---|
| **Home** | Card of the Day, quick links (incl. Personal Reading booking), testimonials from the admin panel (hidden if there are none) |
| **Reading** — *Ginni Ki Baatein* | Private tarot chat: type a question, pick cards from the fan, get the answer. **Login required.** 3 free readings per account (for life); then **Ginni Unlimited** (₹199 / 30 days) |
| **Courses** | The courses from learn.thedivinetarotonline.com, with "Enrol now" links to the website |
| **Kundli** | Kundli Milan (8-koota, 36 gunas), worked out on the phone. **Full report** ₹99 |
| **Profile** | "Your Divine Tarot account" card (Log in / Create account — email + password, same account as Ginni Ki Baatein on the website), profile details, My readings, Card library, daily reminder, language (English / हिन्दी / Hinglish), privacy switches, Delete account |

- Without login the app runs in **guest mode** (everything except Ginni readings); data is saved on the phone.
- Login is **email + password** on **Supabase** (project "ginni2", the website's own) — the **same accounts as Ginni Ki Baatein** on
  `reading.thedivinetarotonline.com`. With login, the profile, saved readings and purchases follow the user to other devices.
  Ginni readings need a login: every account gets 3 free readings for life — the website's own counter, shared with the website — then Ginni Unlimited. Ginni website Premium users get unlimited readings in the app.
- Payments use **Razorpay** (**live** keys — real money). The Supabase server function **`tdt-payments`** creates each order,
  checks each payment and records it in the `tdt_payments` table. Buying needs a login.
- **Google Apps Script** is optional and only keeps an anonymous, consent-based usage sheet.
- Home testimonials are read (public, read-only) from the admin panel's Firebase project — nothing to set up in the app.
- **Everything opens inside the app — never in Chrome or Safari.** All `*.thedivinetarotonline.com` sites, Razorpay payment pages (rzp.io links, checkout, bank and card-OTP pages), course enrol links, support and social profiles open on the app's own browser screen (`src/app/web.tsx`). Links that try to open a new tab, a pop-up or "open in Chrome" stay on that screen too. Only UPI apps, phone calls, email, WhatsApp and the Play Store hand over to the phone. Full list of sites and rules: [docs/IN-APP-LINKS.md](docs/IN-APP-LINKS.md).
- Card pictures load from `https://thedivinetarotonline.com/card_img/<Card Name>.png` — **do not rename those files on the website.**

## Setup guides — do them in this order

1. [Supabase](docs/SETUP-SUPABASE.md) — login, profiles, saved readings, purchases. **One-time setup:** run one SQL file, deploy 4 functions, add the Razorpay secrets
2. [Razorpay](docs/SETUP-RAZORPAY.md) — how payments work, testing, refunds, "paid but not unlocked", prices, store payment rules
3. [Apps Script](docs/SETUP-APPS-SCRIPT.md) — **optional** anonymous usage sheet
4. [Build and publish](docs/BUILD-AND-PUBLISH.md) — EAS builds, Play Store, App Store, web, over-the-air updates

Also: [Privacy policy text](docs/PRIVACY-POLICY.md) for the website's `/privacy` page.

## Where to change what

| I want to change… | File |
|---|---|
| Prices, products, free readings | `src/constants/config.ts` (`Products`, `FREE_READINGS`; the server limit is in the `tdt_use_reading()` database function) **and** `supabase/functions/_tdt/payments.ts` (`PRODUCTS`, in paise — then redeploy `tdt-payments` and `tdt-razorpay-webhook`) |
| Turn Razorpay off on Android / iPhone / web, hide course prices + Enrol links, hide Home's Personal Reading shortcut | `src/constants/config.ts` → `StorePolicy` |
| Website, social and booking links | `src/constants/config.ts` → `Links` |
| Supabase address and public key (built-in defaults), optional Apps Script URL | `src/constants/config.ts`; override in `.env` (copy of `.env.example`) / EAS environment variables |
| All on-screen text, in 3 languages | `src/i18n/strings.ts` |
| Card meanings (78 cards) | `src/data/cards.ts` |
| Ginni's answers (knowledge base) | `src/data/kb/*.json` (fill gaps with `npm run kb:translate`) |
| Courses list | `src/data/courses.ts` |
| Spreads / positions | `src/data/spreads.ts` |
| Colours and fonts | `src/constants/theme.ts` |
| Screens | `src/app/` (`(tabs)/` = the five tabs) |
| Kundli maths | `src/lib/kundli/` |
| Payment flow | `src/lib/payments/` |
| In-app browser (all outside pages) | `src/app/web.tsx`, `src/lib/links.ts`, link rules in `src/lib/url.ts` |
| Login screen (Log in / Sign up / Forgot password / Continue as guest) | `src/app/login.tsx` |
| Login and cloud data (Supabase, Ginni sharing) | `src/lib/cloud/` |
| App name, bundle ID / package, icons, permissions | `app.json`, `assets/images/` |
| Build and submit profiles | `eas.json` |
| Server functions (payments, delete account) | `supabase/functions/` (redeploy after a change — see `docs/SETUP-SUPABASE.md`) |
| Database tables and security rules (record of what is on the live project) | `supabase/migrations/` |
| Optional usage sheet | `apps-script/Code.gs`, `apps-script/appsscript.json` |

## Quick start (on your computer)

```bash
npm ci                     # install exact library versions
cp .env.example .env       # optional — no values are required to build
npx expo start --web       # quick look in the browser
```

To test on a real phone, make a **development build** once (Expo Go from the store does not support SDK 57 yet):

```bash
eas build --profile development --platform android   # install the APK it gives you
npx expo start                                        # open the dev app and scan the QR code
```

Code changes then appear on the phone instantly. Rebuild only after adding a native library or changing `app.json`.

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
- Never put the Razorpay **Key Secret** (or the Supabase `service_role` key) in `.env` or anywhere in the app — the Key Secret lives only in the Supabase function secrets (Dashboard → Edge Functions → Secrets).
- Razorpay keys are **live**: every purchase in the app is real money. Test with one real ₹99 purchase and refund it.

Developed by [Sitelytc](https://sitelytc.com/).
