# Razorpay setup (in-app payments)

**Razorpay** is the Indian payment company that collects money in the app (UPI, cards, net banking, wallets).
The app uses **Razorpay Standard Checkout** — the normal Razorpay payment screen.

What users can buy (set in `src/constants/config.ts` → `Products`):

| Product | Price | What it unlocks |
|---|---|---|
| Ginni Unlimited | ₹199 | Unlimited Ginni readings for 30 days (free users get 3 a day) |
| Kundli full report | ₹99 | Full 8-koota Kundli Milan reports |

Razorpay has **two keys**:

- **Key ID** (`rzp_test_…` or `rzp_live_…`) — public, goes in the app (`EXPO_PUBLIC_RAZORPAY_KEY_ID`).
- **Key Secret** — private. It goes **only** in Apps Script → Script properties. Never in `.env`, never in the app, never on WhatsApp/email.

Do these steps after [Firebase](SETUP-FIREBASE.md) and together with [Apps Script](SETUP-APPS-SCRIPT.md).

---

## Read this first: app store rules on payments

The business has chosen Razorpay for digital purchases on both Android and iPhone. Please know the risk:

- **Apple (App Store Review Guideline 3.1.1)** and **Google Play (Payments policy)** say that digital goods and
  features used *inside* the app (like Ginni Unlimited and the Kundli report) should be sold through the store's own billing.
- Using Razorpay for these can lead to the app being **rejected in review, or removed later**.
- **Personal Reading** (a live one-to-one call with the reader) is a real-time person-to-person service.
  Apple allows outside payment for this (guideline 3.1.3(d)). It opens the booking website.

**If a store objects, you can switch Razorpay off per platform without other code changes.**
In `src/constants/config.ts` → `StorePolicy`:

```ts
razorpayOnAndroid: true,   // false = no Razorpay purchases on Android
razorpayOnIos: true,       // false = no Razorpay purchases on iPhone
razorpayOnWeb: true,       // website version
courseEnrolLinks: true,    // false = hide course prices / "Enrol now" links
personalReadingLink: true, // false = hide the Personal Reading shortcut on Home
```

After changing a switch, publish an update (see `BUILD-AND-PUBLISH.md`). With a payment switch off, the free
features still work; on that platform every paywall (Ginni Unlimited, Kundli full report) is hidden completely.
(The Personal Reading row in Profile and the button on the Kundli tab stay; the switch only hides the Home shortcut.)

---

## Step 1 — Create the Razorpay account

1. Go to <https://dashboard.razorpay.com/signup> and sign up with the business email and mobile.
2. You can test immediately; going live needs **KYC / Activation** (Step 5).

## Step 2 — Get the TEST keys

1. In the Dashboard, switch the top toggle to **Test Mode**.
2. Go to **Account & Settings → API Keys** (under "Website and app settings") → **Generate Key** (or **Regenerate**).
3. Copy the **Key ID** (`rzp_test_…`) and the **Key Secret**. The secret is shown only once — paste it straight into Apps Script.

## Step 3 — Put the keys in their places

| Key | Where |
|---|---|
| Key ID `rzp_test_…` | `.env` → `EXPO_PUBLIC_RAZORPAY_KEY_ID` (and in EAS env vars for cloud builds) |
| Key ID `rzp_test_…` | Apps Script → Script properties → `RAZORPAY_KEY_ID` |
| Key Secret | Apps Script → Script properties → `RAZORPAY_KEY_SECRET` |

The Key ID in the app and the Key ID in Apps Script must be **the same**.

If `EXPO_PUBLIC_RAZORPAY_KEY_ID` is empty, the paywalls are hidden. With a **live** key (`rzp_live_…`) the paywalls also
stay hidden until `EXPO_PUBLIC_APPS_SCRIPT_URL` is set — real payments are always checked by the server.

## Step 4 — Test a payment (no real money)

1. Make sure `EXPO_PUBLIC_APPS_SCRIPT_URL` is set (otherwise the purchase only unlocks on that phone, without a server check).
2. In the app, sign in, then go to **Reading** and use up the free readings (or open **Kundli**) and tap **Pay ₹…**.
3. In the Razorpay screen use test details from Razorpay's docs ("Test card details" / "Test UPI"),
   for example UPI ID **`success@razorpay`**.
4. Check:
   - [ ] The app shows the plan in **Profile → Your plan**.
   - [ ] A new row appears in the **Payments** sheet.
   - [ ] Razorpay Dashboard (Test Mode) → **Transactions → Payments** shows the payment as **Captured**.
   - [ ] Firebase → Firestore → `entitlements` → a document with the user's ID exists.
5. Also test **cancelling** the payment screen — nothing should unlock.

If a payment shows **Authorized** but not **Captured**, go to **Account & Settings → Payment capture** and set it to **Automatic**.

## Step 5 — Go LIVE (after KYC)

1. Dashboard → complete the **Activation** form: business type, PAN, GST (if any), bank account, and the
   website/app details. Razorpay checks that the website has **Privacy policy, Terms & conditions,
   Refund/Cancellation policy and Contact us** pages. (See `PRIVACY-POLICY.md` for the privacy text.)
   Use **thedivinetarotonline.com** as the website — the app's payment screen runs on that domain.
2. Wait for the "account activated" email (usually a few working days).
3. Switch the toggle to **Live Mode** → **Account & Settings → API Keys → Generate Key**. Copy the live Key ID and Secret.
4. Replace **both** Script properties in Apps Script with the live pair (no new deployment needed for property changes).
5. Replace `EXPO_PUBLIC_RAZORPAY_KEY_ID` with `rzp_live_…` in EAS env vars and `.env`, then publish a new build or update.
6. Do one real ₹99 purchase yourself and refund it from the Dashboard (**Payments → select → Refund**).

Change the app key and the Apps Script keys **at the same time**. A test key in the app with live keys in
Apps Script (or the reverse) makes every payment fail.

## Money, refunds and records

- Settlements (money to your bank) follow Razorpay's schedule — see **Settlements** in the Dashboard.
- Refunds: **Transactions → Payments** → open the payment → **Refund**. A refund does **not** automatically
  remove the unlock in the app. (It expires on its own for Ginni after 30 days.)
- The **Payments** sheet + Razorpay Dashboard together are your sales record. Keep them for accounts/GST.

## "I paid but it is not unlocked"

This can happen if the internet drops just after payment.

1. Ask the user for the phone/email they signed in with and the Razorpay payment ID (in their Razorpay SMS/email).
2. In Razorpay Dashboard, confirm the payment is **Captured**.
3. Look for its Order ID in the **Payments** sheet. If it is there, ask the user to close and reopen the app while signed in.
4. If it is not there, either **refund** it, or ask your developer to add the unlock manually in Firestore
   (`entitlements/<user ID>` → `products` → `<product id>` = expiry time in milliseconds) and add a matching row in the Payments sheet.

## Common problems

| Symptom | Fix |
|---|---|
| No paywall / Pay button appears | `EXPO_PUBLIC_RAZORPAY_KEY_ID` empty in this build, a live key without `EXPO_PUBLIC_APPS_SCRIPT_URL`, or the `StorePolicy` switch is off for that platform |
| "Please sign in" before paying | Normal: when login is set up, purchases need an account so they follow the user |
| Payment fails at once | Key mismatch between app and Apps Script, or Apps Script not deployed — check its **Executions** |
| UPI app does not open on phone | Make sure the UPI app is installed; try "Pay by UPI ID" instead |
