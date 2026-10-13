# Apps Script setup (optional usage sheet)

> **This is optional.** The app works fully without it. Login, profiles, readings and payments run on Supabase
> ([SETUP-SUPABASE.md](SETUP-SUPABASE.md), [SETUP-RAZORPAY.md](SETUP-RAZORPAY.md)) — **not** on Apps Script.

**Google Apps Script** is free Google code that runs on Google's servers, attached to a Google Sheet.
For this app it does only **one** thing: it adds a row to a **Sessions** sheet each time the app opens —
an anonymous usage count — **only if the user allows it**.

If you don't want this sheet, skip this page and leave `EXPO_PUBLIC_APPS_SCRIPT_URL` empty.

Time needed: about 15 minutes. No keys or Script properties are needed.

---

## Step 1 — Create the Google Sheet

1. Go to <https://sheets.google.com> → **Blank spreadsheet**.
2. Name it **The Divine Tarot – App Usage**.
3. Do **not** share this sheet publicly.

Use a business Google account that will stay with the company (not a staff member's personal account).

## Step 2 — Open Apps Script from the sheet

1. In the sheet menu: **Extensions → Apps Script**. A new tab opens.
2. Click "Untitled project" at the top and rename it **Divine Tarot Usage**.

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

This file sets the time zone to India and asks for only one permission: to write to **this sheet**.

## Step 5 — Run `testSetup` once (grants permission)

1. Go to **Editor**. In the toolbar, open the function drop-down and choose **testSetup** → click **Run**.
2. A box "Authorization required" appears → **Review permissions** → pick your account.
3. If you see "Google hasn't verified this app": click **Advanced → Go to Divine Tarot Usage (unsafe)**.
   This is normal for your own script. Then click **Allow**.
4. The **Execution log** shows `Sessions sheet ready`, and the sheet now has a **Sessions** tab.

## Step 6 — Deploy as a Web app

1. Top-right: **Deploy → New deployment**.
2. Click the gear next to "Select type" → **Web app**.
3. Fill in:
   - Description: `v1`
   - **Execute as: Me** (your email)
   - **Who has access: Anyone**
4. Click **Deploy** (approve permission again if asked).
5. Copy the **Web app URL**. It ends with **`/exec`**.

"Anyone" is needed because app users are not logged in to your Google account. The script accepts only one action
(`logSession`) and can only add rows to this sheet.

## Step 7 — Put the URL in the app

1. In `.env`: `EXPO_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec`
2. For cloud builds, also add it to EAS (see `BUILD-AND-PUBLISH.md` → "Environment variables").
3. Test: open the URL in a browser. You should see `{"ok":true,"service":"The Divine Tarot usage sheet"}`.

The new URL reaches users with the next build or over-the-air update.

---

## Already set up the old version (with Payments)?

Older app versions used Apps Script for payments too. That is **all gone** now — payments run on Supabase.

1. Paste the new `apps-script/Code.gs` and `apps-script/appsscript.json` over the old ones → **Save**.
2. Deploy a **new version** with the same URL (see below).
3. You can delete the old Script properties (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `FIREBASE_PROJECT_ID`):
   **Project Settings → Script Properties**. Deleting `RAZORPAY_KEY_SECRET` from here is a good idea — the secret
   should live only in Supabase.
4. Keep the old **Payments** tab as an archive of past sales. New sales are recorded in Supabase → `tdt_payments`.

## Changing the code later (keep the same URL)

1. Paste the new code in the editor → **Save**.
2. **Deploy → Manage deployments** → select your web app → click the **pencil (Edit)** icon.
3. **Version** → **New version** → **Deploy**.

The URL stays the same, so the app needs no change. (Choosing **New deployment** instead would create a
*new* URL, and the app would keep using the old code.)

## The Sessions sheet

One row per app open, only when the user has **Profile → Privacy → Share anonymous usage data**
ON (it is ON by default; users can turn it off). Columns: Time, Session (random), Platform, OS, Device,
App version, Language, UID, City, Region, Country. City/Region/Country are filled only if the user also turned
on **Share approximate city** (OFF by default). No questions, readings or profile details are ever sent.

Tip: this sheet can grow large. Once a year, copy old rows to an archive file and delete them.

## Troubleshooting

Check **Executions** (left panel, list icon) in Apps Script to see each call and any error.

| Problem | Fix |
|---|---|
| No rows appear | `EXPO_PUBLIC_APPS_SCRIPT_URL` empty in this build, or the user turned off usage sharing |
| Opening the URL shows a Google login page | **Who has access** is not **Anyone** — edit the deployment (Step 6) |
| Old service name in the browser test | You are still on the old code — deploy a **new version** (see above) |
| `unknown-action` in Executions | Something other than the app called the URL; it is ignored |
