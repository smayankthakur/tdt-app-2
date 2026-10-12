# Apps Script setup (payment checks + usage sheet)

**Google Apps Script** is free Google code that runs on Google's servers, attached to a Google Sheet.
For this app it is the small "backend" (server) that:

1. **Creates the order** with Razorpay — the price is decided here, so nobody can change it on their phone.
2. **Checks each payment** using the Razorpay **Key Secret**, then unlocks the purchase for that user in Firebase
   and adds a row to the **Payments** sheet.
3. **Logs app opens** (only if the user allows it) to the **Sessions** sheet.

The secret key lives **only** here, never inside the app.

> **Without the Apps Script URL in the app, purchases unlock on that one phone only, without any server check
> (test mode). Never launch like that.**

Time needed: about 30 minutes. Do [Firebase setup](SETUP-FIREBASE.md) first, and have your Razorpay
**test** Key ID and Key Secret ready ([Razorpay setup](SETUP-RAZORPAY.md), Steps 1–2).

---

## Before you start: use the right Google account

The Google account you use here must be an **Owner** or **Editor** of the Firebase project
`the-divine-tarot-2-project` — otherwise unlocking purchases fails.

To check or add it: Firebase console → gear icon → **Project settings → Users and permissions** →
**Add member** → enter the email → role **Editor** → **Add member**.

Use a business account that will stay with the company (not a staff member's personal account).

## Step 1 — Create the Google Sheet

1. Go to <https://sheets.google.com> → **Blank spreadsheet**.
2. Name it **The Divine Tarot – App Backend**.
3. Do **not** share this sheet publicly. It contains user IDs and payment IDs.

## Step 2 — Open Apps Script from the sheet

1. In the sheet menu: **Extensions → Apps Script**. A new tab opens.
2. Click "Untitled project" at the top and rename it **Divine Tarot Backend**.

Creating it from the sheet "binds" the script to this sheet, which is how it knows where to write rows.

## Step 3 — Paste the code

1. In the left panel, click **Code.gs**. Select everything in the editor and delete it.
2. Open `apps-script/Code.gs` from this project, copy **all** of it, and paste it in.
3. Click the **Save project** icon (floppy disk) or press Ctrl+S.

## Step 4 — Paste the settings file (`appsscript.json`)

1. Left panel → **Project Settings** (gear icon).
2. Tick **Show "appsscript.json" manifest file in editor**.
3. Go back to **Editor** (`< >` icon). Click **appsscript.json**, select all, delete.
4. Paste the full contents of `apps-script/appsscript.json` from this project → **Save**.

This file sets the time zone to India and lists the permissions the script needs (this sheet, internet access, Firestore).

## Step 5 — Add the Script properties (the keys)

**Script properties** are private settings that only the script can read.

1. **Project Settings** (gear icon) → scroll to **Script Properties** → **Add script property**.
2. Add these three:

| Property | Value |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay Key ID, e.g. `rzp_test_…` (later `rzp_live_…`) |
| `RAZORPAY_KEY_SECRET` | The matching Razorpay Key Secret |
| `FIREBASE_PROJECT_ID` | `the-divine-tarot-2-project` |

3. Click **Save script properties**.

The Key ID and Key Secret must be a **matching pair from the same mode** (both test or both live).

## Step 6 — Run `testSetup` once (grants permissions)

1. Go to **Editor**. In the toolbar, open the function drop-down and choose **testSetup** → click **Run**.
2. A box "Authorization required" appears → **Review permissions** → pick your account.
3. If you see "Google hasn't verified this app": click **Advanced → Go to Divine Tarot Backend (unsafe)**.
   This is normal for your own script. Then click **Allow**.
4. The **Execution log** should show your key's first characters, the Firebase project name and `OAuth token OK: true`.
5. Back in the sheet you will now see two new tabs: **Payments** and **Sessions**.

If it says `missing-script-property-…`, re-check the property names in Step 5 (exact spelling, capital letters).

## Step 7 — Deploy as a Web app

1. Top-right: **Deploy → New deployment**.
2. Click the gear next to "Select type" → **Web app**.
3. Fill in:
   - Description: `v1`
   - **Execute as: Me** (your email)
   - **Who has access: Anyone**
4. Click **Deploy** (approve permissions again if asked).
5. Copy the **Web app URL**. It ends with **`/exec`**.

"Anyone" is needed because app users are not logged in to your Google account. The script only accepts
the three actions listed at the top and checks every payment with Razorpay.

## Step 8 — Put the URL in the app

1. In `.env`: `EXPO_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec`
2. For cloud builds, also add it to EAS (see `BUILD-AND-PUBLISH.md` → "Environment variables").
3. Test: open the URL in a browser. You should see `{"ok":true,"service":"The Divine Tarot backend"}`.

---

## Changing the code later (keep the same URL)

1. Paste the new code in the editor → **Save**.
2. **Deploy → Manage deployments** → select your web app → click the **pencil (Edit)** icon.
3. **Version** → **New version** → **Deploy**.

The URL stays the same, so the app needs no change. (Choosing **New deployment** instead would create a
*new* URL, and the app would keep using the old code.)

## Changing prices

Prices are written in **two** places and must match:

| File | Ginni Unlimited | Kundli full report |
|---|---|---|
| `src/constants/config.ts` → `Products` (rupees) | `price: 199` | `price: 99` |
| `apps-script/Code.gs` → `PRODUCTS` (paise = rupees × 100) | `amount: 19900` | `amount: 9900` |

Update Code.gs (and deploy a new version), then update the app (an over-the-air update is enough).
If they don't match, the shown price and the charged price differ — always change both.

## The two sheets

**Payments** — one row per successful, verified payment: Time, UID (Firebase user ID, or `guest`),
Product, Amount (₹), Order ID, Payment ID, Unlocked until.

> **Do not delete, sort or move columns in the Payments sheet.** The script looks at column E (Order ID)
> to make sure one payment unlocks only once.

**Sessions** — one row per app open, only when the user has **Profile → Privacy → Share anonymous usage data**
ON (it is ON by default; users can turn it off). Columns: Time, Session (random), Platform, OS, Device,
App version, Language, UID, City, Region, Country. City/Region/Country are filled only if the user also turned
on **Share approximate city** (OFF by default). No questions, readings or profile details are ever sent.

Tip: this sheet can grow large. Once a year, copy old Sessions rows to an archive file and delete them
(only from **Sessions**, never from **Payments**).

## Troubleshooting

Check **Executions** (left panel, list icon) in Apps Script to see each call and any error.

| Error in app / Executions | Meaning and fix |
|---|---|
| `missing-script-property-…` | A Script property is missing or misspelt (Step 5) |
| `razorpay-401` | Key ID / Secret wrong, or test and live keys mixed |
| `firestore-403` | The deploying account is not Owner/Editor of the Firebase project |
| `bad-signature` | Secret in Script properties does not match the Key ID used by the app |
| `order-amount-mismatch` | Prices in Code.gs were changed after the order was created; retry |
| Purchase "failed" right after paying | Check Executions; see "Paid but not unlocked" in `SETUP-RAZORPAY.md` |
