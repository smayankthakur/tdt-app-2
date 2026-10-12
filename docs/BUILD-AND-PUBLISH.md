# Build and publish (Android, iPhone, web, updates)

The app is built in the cloud by **EAS** (Expo Application Services) — you do not need Android Studio or a Mac.
Finish [Firebase](SETUP-FIREBASE.md), [Apps Script](SETUP-APPS-SCRIPT.md) and [Razorpay](SETUP-RAZORPAY.md) first.

App facts: name **The Divine Tarot**, Android package and iOS bundle ID **`com.thedivinetarotonline.app`**,
Expo SDK 57, iPhone only (no iPad layout).

---

## 1. One-time computer setup

1. Install **Node.js LTS** from <https://nodejs.org>.
2. Create a free account at <https://expo.dev>.
3. In a terminal, in the project folder:

```bash
npm ci                     # installs the exact library versions (use this, not "npm install")
npm install -g eas-cli     # the EAS command-line tool
eas login                  # sign in with your Expo account
eas init                   # links this project to your Expo account (run once)
```

> Never install the old global `expo-cli`, and never run `npm audit fix --force` — both break the project.

## 2. Turn on over-the-air updates — BEFORE the first store build

**Over-the-air (OTA) updates** let you fix text, prices, switches and screens without a new store review.
They only work in builds made *after* this step, so do it now:

```bash
npx expo install expo-updates
eas update:configure
```

Commit the changes these commands make (`app.json`, `eas.json`, `package.json`).

## 3. Environment variables (the settings in `.env`)

All `EXPO_PUBLIC_…` values are public — they ship inside the app — so no secrets here.

- **On your computer:** copy `.env.example` to `.env` and fill it in.
- **For cloud builds**, EAS does not see your local `.env` unless it is committed. Choose one:
  - **Option A (recommended):** save each value in EAS, once per environment (`production`, `preview`, `development`):

    ```bash
    eas env:create --environment production --name EXPO_PUBLIC_RAZORPAY_KEY_ID --value rzp_test_xxx --visibility plaintext
    eas env:create --environment production --name EXPO_PUBLIC_APPS_SCRIPT_URL --value https://script.google.com/macros/s/xxx/exec --visibility plaintext
    ```

    Repeat for every line in `.env.example`, and again with `--environment preview` and `--environment development`.
    You can also manage them on expo.dev → your project → **Environment variables**.
  - **Option B:** commit the `.env` file to git (allowed here because every value is public).

**Changing an `EXPO_PUBLIC_` value only takes effect after a new build or an OTA update.**

## 4. Which build do I need?

| Build | Command | Use it for |
|---|---|---|
| Development | `eas build --profile development --platform android` | Testing on your phone while editing code |
| Preview | `eas build --profile preview --platform android` | An `.apk` file you can share with testers on WhatsApp/email |
| Production | `eas build --profile production --platform all` | Store uploads (Android `.aab` + iPhone `.ipa`) |

Notes:

- **Expo Go** (the store app) does not support SDK 57 yet — use the development build instead. Install the APK
  it gives you, then run `npx expo start` and scan the QR code.
- Build numbers go up automatically for production. To change the version users see (e.g. 1.0.0 → 1.1.0),
  edit `"version"` in `app.json`.
- Every time the Firebase files, `app.json` plugins/permissions or a native library change, you need a **new build** (an OTA update is not enough).
- Before each build run: `npm run typecheck`, `npm run lint`, `npx expo-doctor`.

---

## 5. Google Play Store (Android)

**Account:** <https://play.google.com/console> (one-time US$25 fee).
- **Personal account:** new personal accounts must run a **closed test with at least 12 testers opted in for 14 days in a row**
  before they can publish to production. Plan these two weeks.
- **Organisation account:** needs a **D-U-N-S number** for the company (free from Dun & Bradstreet, can take up to 30 days).

Google requires new apps to target **Android 16 (API 36)** since 31 Aug 2026 — SDK 57 already does this.

**Steps:**

1. Play Console → **Create app** → name "The Divine Tarot", language English (India), **App**, **Free** (in-app payments are allowed in a free app).
2. Run `eas build --profile production --platform android`. When done, download the `.aab` from expo.dev.
3. **The first upload must be manual:** **Testing → Internal testing → Create new release** → upload the `.aab` → **Save → Review release → Start rollout**.
4. Now add Play's signing fingerprints to Firebase: **Setup → App signing** → copy SHA-1 and SHA-256 (see `SETUP-FIREBASE.md` Step 5B). Re-download `google-services.json`, commit, rebuild.
5. For later uploads use `eas submit -p android`. It needs a Google **service account JSON key** (a login file for robots): follow <https://expo.fyi/creating-google-service-account>. The upload goes to the **internal** track as a **draft**; open Play Console to roll it out.
6. Fill in **every item on the Dashboard ("Set up your app")**:
   - **App access:** "All or some functionality is restricted" → add the Firebase test phone number and OTP (e.g. `+91 9999900001` / `123456`).
   - **Ads:** No ads.
   - **Content rating:** answer the questionnaire honestly.
   - **Target audience:** **18 and over** only.
   - **Data safety:** see the table in section 7.
   - **Privacy policy URL:** `https://thedivinetarotonline.com/privacy`.
   - **Store listing:** short and full description, icon 512×512, feature graphic 1024×500, at least 2 phone screenshots.
7. **Closed testing** (personal accounts): create a track, add 12+ testers' Gmail IDs, share the opt-in link, wait 14 days, then **Apply for production**.
8. **Production → Create new release** → choose the tested build → **Start rollout**.

## 6. Apple App Store (iPhone)

**Account:** Apple Developer Program, <https://developer.apple.com/programs/> (yearly fee; organisation accounts need a D-U-N-S number).
Since 28 Apr 2026 Apple requires builds made with **Xcode 26 / iOS 26 SDK** — EAS's SDK 57 build image already uses Xcode 26.6.

1. Run `eas build --profile production --platform ios`. Sign in with your Apple ID when asked; let EAS create the certificates.
2. Run `eas submit -p ios`. It creates the app in **App Store Connect** (if needed) and uploads the build to **TestFlight**.
3. In App Store Connect → your app:
   - **App Information:** category **Lifestyle** (or Entertainment), age rating questionnaire, privacy policy URL.
   - **App Privacy:** see section 7.
   - **Screenshots:** iPhone only. Apple requires the **"iPhone with Dynamic Island (medium display)"** size — **1206×2622** or **1179×2556** pixels.
   - **App Review Information → Sign-in required:** give the Firebase test phone number and OTP, and write:
     "Log in with phone: enter 9999900001, OTP 123456. Account deletion: Profile → Delete account."
4. Select the build → **Add for Review → Submit**.

**Review points to be ready for:**

- **Sign in with Apple** is included because the app offers Google sign-in (guideline 4.8).
- **Account deletion** is in the app: **Profile → Delete account** (guideline 5.1.1(v); Google requires it too).
- **Payments (3.1.1):** Razorpay for digital items may be rejected. If so, set `razorpayOnIos: false`
  (and if needed `courseEnrolLinks: false`) in `src/constants/config.ts`, then resubmit. Personal Reading (live call) is allowed (3.1.3(d)). See `SETUP-RAZORPAY.md`.
- **Fortune-telling / astrology apps** are a crowded category for Apple (guideline 4.3). In the review notes,
  mention what is unique: the reader's own content, Hinglish/Hindi, Ginni chat, Kundli Milan.

## 7. Privacy forms (Play "Data safety" and Apple "App Privacy")

Both stores now require you to **declare** what the app collects. Answer to match the app:

| Data | Collected? | Why | Optional? |
|---|---|---|---|
| Name, email address, phone number | Yes | Account / login | Needed only if user signs in |
| User ID | Yes | Account | Needed only if user signs in |
| Profile info the user enters: gender, birth date/time/place, marital status, occupation | Yes ("Other info") | App functionality / personalisation | Optional |
| Photo (profile photo) | Yes | App functionality | Optional |
| Questions typed in readings (saved readings) | Yes ("Other user-generated content") | App functionality | Saved to cloud only when signed in |
| Purchase history | Yes | App functionality / payments | Only if user buys |
| App interactions / diagnostics (device model, OS, app version) | Yes | Analytics | Optional — user can turn off |
| Approximate (coarse) location | Yes | Analytics | Optional — off by default |

Also answer: data is **encrypted in transit** — Yes. Users can **request deletion** — Yes (in app). Data **shared with third parties
for ads/tracking** — No. Apple "Used for tracking" — **No**. Apple "Linked to the user" — Yes for account data.
Card and UPI details are handled by Razorpay, not by the app.

---

## 8. Web version

1. Build the website files: `npx expo export --platform web` → creates a `dist/` folder.
2. Host it, for example on Vercel: `npx vercel deploy dist --prod` (or Firebase Hosting).
3. Point a sub-domain such as **`app.thedivinetarotonline.com`** to it (Vercel → Project → **Settings → Domains**, then add the CNAME record it shows at your domain provider).
4. Add the domain in Firebase → **Authentication → Settings → Authorized domains**.
5. Card links like `/card/the-fool` work on Vercel out of the box: `public/vercel.json` (copied into `dist/`) has the rewrite rule. On another host, add the same rule (`/card/:id` → `/card/[id].html`).

On the web, sign-in uses a Google pop-up and phone OTP with an invisible "I'm not a robot" check. Animations are static on web by design.

## 9. Sending an over-the-air update

For changes to text, prices, switches, screens or `EXPO_PUBLIC_` values (no new native library, no Firebase file change):

```bash
eas update --channel production --environment production --message "Fix price text"
```

Users get it the next time they open the app (sometimes the time after). For the testers' preview builds use `--channel preview`.

When **not** to use an update: new library, `app.json` permission/plugin change, Firebase files, or a new `"version"` — make a new build and submit it instead.

## Launch checklist

- [ ] `EXPO_PUBLIC_APPS_SCRIPT_URL` set (otherwise purchases unlock only on the device — never launch like that)
- [ ] Razorpay **live** keys in both app and Apps Script; one real test payment refunded
- [ ] Firebase files committed; Play signing fingerprints added; Google, phone and Apple login tested
- [ ] Firestore rules merged; admin panel still works
- [ ] Privacy page live at `/privacy`; store privacy forms filled as in section 7
- [ ] Test phone number + OTP written in both stores' review notes
- [ ] `expo-updates` installed before the first store build
