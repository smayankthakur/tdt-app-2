# Firebase setup (login, profiles, saved readings)

**Firebase** is Google's service that handles login and stores each user's profile and saved readings.
The app uses the existing Firebase project **`the-divine-tarot-2-project`**.

> **Important:** this same Firebase project is also used by the client's **admin panel**.
> Never delete anything there, and never *replace* the security rules — only *add* to them (Step 9).

**Without Firebase the app still works** in "guest mode": no login, but readings, Kundli and payments
work on the phone. Login appears automatically once the two Firebase files below are added and a new build is made.

Time needed: about 1–2 hours. You need the Google account that owns the Firebase project.

---

## What you will collect

| Item | Where it goes |
|---|---|
| `google-services.json` (Android file) | project root folder (next to `app.json`) |
| `GoogleService-Info.plist` (iPhone file) | project root folder |
| Web app config values (6 values) | `.env` → `EXPO_PUBLIC_FIREBASE_…` |
| Google **Web client ID** | `.env` → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |

None of these are secret. The two files **must be committed to git** (saved into the project history),
because the cloud build service (EAS) only uploads files that are in git.

---

## Step 1 — Open the project

1. Go to <https://console.firebase.google.com> and sign in.
2. Click **the-divine-tarot-2-project**.

## Step 2 — Turn on the sign-in methods (do this BEFORE downloading files)

1. Left menu → **Build → Authentication** → tab **Sign-in method**.
2. Click **Add new provider** → **Google** → switch **Enable** on → choose a support email → **Save**.
3. Click **Google** again and open **Web SDK configuration**. Copy the **Web client ID**
   (ends with `.apps.googleusercontent.com`) → paste into `.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
4. **Add new provider** → **Phone** → **Enable** → **Save**.
5. **Add new provider** → **Apple** → **Enable** → **Save**. (For the iPhone app you do not need to fill the
   optional "Services ID" fields.) Apple *requires* "Sign in with Apple" because the app also offers Google sign-in (App Store guideline 4.8).

> If a provider is already enabled (because the admin panel uses it), leave it as it is.

## Step 3 — Add test phone numbers (for you and for app reviewers)

1. **Authentication → Sign-in method → Phone** → open **Phone numbers for testing**.
2. Add a number and code, for example `+91 9999900001` with code `123456` → **Save**.
3. This number never receives a real SMS — you type the fixed code instead. Give this number + code to
   Apple and Google in the review notes (see `BUILD-AND-PUBLISH.md`).

Real SMS may need the **Blaze (pay-as-you-go)** plan; SMS is charged per message. Check
**Authentication → Settings → SMS region policy** and make sure **India** is allowed.

## Step 4 — Register the Android app and download `google-services.json`

1. Click the **gear icon → Project settings → General**. Scroll to **Your apps**.
2. If an Android app with package `com.thedivinetarotonline.app` is already listed, click it. Otherwise click
   **Add app → Android**, enter package name **`com.thedivinetarotonline.app`**, nickname "The Divine Tarot Android", click **Register app**.
3. Click **Download google-services.json** and put the file in the project root folder.

## Step 5 — Add the Android fingerprints (SHA-1 and SHA-256)

A **fingerprint** is a short code that proves a build is really yours. Google sign-in and phone OTP on
Android **will not work** without them. You add fingerprints from **two** places.

**A) Your EAS upload key** (used for test builds):

1. In a terminal, in the project folder, run `eas credentials`.
2. Choose **Android** → **production** → **Keystore**. If none exists, choose **Set up a new keystore**.
3. Copy the **SHA1 Fingerprint** and the **SHA256 Fingerprint**.

**B) Google Play's App signing key** (used for apps downloaded from the Play Store) — after your first upload to Play:

1. Play Console → your app → **Setup → App signing** (in newer layouts: **Test and release → App integrity → Play app signing**).
2. Under **App signing key certificate**, copy **SHA-1** and **SHA-256**.

**Add all four** in Firebase: **Project settings → Your apps → (Android app) → Add fingerprint**, one at a time.
Then **download `google-services.json` again** and replace the old file (it now includes the sign-in settings).

For phone OTP on Android, also open <https://console.cloud.google.com>, select the same project, search
**Play Integrity API** and click **Enable**.

## Step 6 — Register the iPhone app and download `GoogleService-Info.plist`

1. **Project settings → General → Your apps → Add app → iOS** (or click the existing one).
2. Bundle ID: **`com.thedivinetarotonline.app`** → **Register app**.
3. Click **Download GoogleService-Info.plist** and put it in the project root folder.
   (Download it *after* Step 2, so it contains the Google sign-in settings.)

## Step 7 — iPhone phone OTP: upload the APNs key (recommended)

Without this, iPhone users see a short "I'm not a robot" (reCAPTCHA) web page before the OTP. With it, the check is silent.

1. <https://developer.apple.com/account> → **Certificates, IDs & Profiles → Keys → +**.
2. Name it "Firebase APNs", tick **Apple Push Notifications service (APNs)** → **Continue → Register → Download** (`.p8` file; you can download it only once — keep it safe).
3. Note the **Key ID** and your **Team ID** (top-right of the developer site).
4. Firebase → **Project settings → Cloud Messaging → Apple app configuration → APNs Authentication Key → Upload**. Add the file, Key ID and Team ID.

## Step 8 — Web app config (for the website version of the app)

1. **Project settings → General → Your apps → Add app → Web (`</>`)**. Nickname "Divine Tarot app (web)" → **Register app**.
   (You may reuse an existing web app, but a separate one keeps the admin panel untouched.)
2. Copy the values from the `firebaseConfig` box into `.env`:

| firebaseConfig | `.env` name |
|---|---|
| `apiKey` | `EXPO_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` |
| `appId` | `EXPO_PUBLIC_FIREBASE_APP_ID` |
| `messagingSenderId` | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `storageBucket` | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` |

3. **Authentication → Settings → Authorized domains → Add domain** → add your web address, for example
   `app.thedivinetarotonline.com` (and the Vercel address while testing). Web sign-in is blocked on any domain not listed here.

## Step 9 — Security rules (MERGE, do not replace)

**Security rules** decide who can read or write each piece of data.

1. Left menu → **Build → Firestore Database** → tab **Rules**.
2. **First, copy everything in the box and save it in a text file** as a backup.
3. Open `firestore.rules` from this project. Copy only the three `match` blocks
   (`/users/{uid}`, `/entitlements/{uid}`, `/testimonials/{id}`).
4. Paste them **inside** the existing `match /databases/{database}/documents { … }` block, next to the admin panel's rules.
   Do not delete any existing lines. If a `match /testimonials/{id}` block already exists, keep it and just make sure it allows `read: if true`.
5. Click **Publish**. Then log in to the admin panel and check it still works.

What the rules do: each user can only see their own profile and readings; purchases (`entitlements`) can
only be written by the Apps Script backend; testimonials are public.

## Step 10 — Testimonials (managed in the admin panel)

The Home screen shows testimonials from the Firestore collection **`testimonials`**. Each document needs
`name` and `text` (or `quote`), optionally `location` (or `city`) and `rating`. Setting `published` or
`visible` to `false` hides one. If there are none, the carousel simply hides — the app never shows made-up reviews.

## Step 11 — Commit the files and rebuild

1. Commit `google-services.json` and `GoogleService-Info.plist` to git.
2. Make a **new build** (see `BUILD-AND-PUBLISH.md`). An over-the-air update is **not** enough, because the Firebase files change the native app.

## Quick check

- [ ] Profile tab shows **Continue with Google / Apple / phone** (Apple on iPhone only).
- [ ] Google login works on an Android build installed from Play (needs the Play fingerprints).
- [ ] Test phone number + code logs you in.
- [ ] Admin panel still works after the rules change.

**Common problems**

| Message / symptom | Fix |
|---|---|
| "Sign-in is not set up yet in this build" | Firebase files missing or not committed; rebuild |
| Google login error `DEVELOPER_ERROR` / code 10 | SHA fingerprints missing → Step 5, re-download `google-services.json`, rebuild |
| Works in test APK but not from Play Store | Add the Play **App signing key** fingerprints (Step 5B) |
| Web: `auth/unauthorized-domain` | Add the domain in **Authorized domains** (Step 8) |
| Delete account says "sign in again" | Normal security check: sign out, sign in, then delete |
