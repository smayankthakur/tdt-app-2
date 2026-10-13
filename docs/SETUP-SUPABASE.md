# Supabase setup (login, profiles, saved readings, purchases)

**Supabase** is the online service that holds the app's accounts and cloud data.
The app uses the **same Supabase project as Ginni Ki Baatein** on the website (`reading.thedivinetarotonline.com`):

- Project name: **Tdt-Ginni**
- Project ref: **`agwpfisykktphrrmnnzu`**
- URL: **`https://agwpfisykktphrrmnnzu.supabase.co`**
- Dashboard: <https://supabase.com/dashboard/project/agwpfisykktphrrmnnzu>

So **one account works in both places**: a user who already uses Ginni on the website logs in to the app with the
same email and password, and the other way round.

> **Most of the work is already done.** Read "What is already done" first, then go through
> "Settings to check" (about 15 minutes). You do **not** need to create a project, tables or keys.

---

## What is already done (do not redo)

- [x] **Tables** created on the live project (file `supabase/migrations/20261013000000_divine_tarot_app.sql` is the record):

  | Table | What it holds | Who can write it |
  |---|---|---|
  | `app_profiles` | Each user's profile (name, gender, birth date/time/place, marital status, occupation, photo) | The user (own row only) |
  | `app_readings` | Saved readings | The user (own rows only) |
  | `app_entitlements` | What the user has bought and until when | **Only the server** (the payment function) |
  | `app_payments` | One row per paid order — your sales record, and it stops one payment from unlocking twice | **Only the server**. Admins can read it |

- [x] **Row Level Security (RLS)** is on for all four tables: each user sees only their own rows.
  Anonymous visitors of the Ginni website cannot write app data. Nobody can give themselves a purchase from the app.
- [x] **Two server functions ("Edge Functions") are deployed:**
  - `app-payments` — creates Razorpay orders and checks payments (see [SETUP-RAZORPAY.md](SETUP-RAZORPAY.md)).
  - `app-delete-account` — deletes a user's account when they tap **Profile → Delete account**.
- [x] **The app already knows the project.** The URL and the publishable key are built into
  `src/constants/config.ts`. They are public by design (RLS protects the data). **No `.env` values are needed to build.**
- [x] **Checked live on 13 Oct 2026** with a temporary test account (created, then deleted): sign-up, log in,
  profile save, reading save, RLS blocking a self-made purchase, the shared 3-a-day count, creating a ₹99 order,
  checking an unpaid order, a fake payment signature being rejected, and account deletion.

No Ginni table was changed. The app only **reads** Ginni's `ginni_access` table, and the payment function
updates `premium_until` in it when someone buys Ginni Unlimited.

---

## How login works

- **Email + password only.** There is no Google, Apple or phone-OTP login.
- Screen: `src/app/login.tsx` — **Log in**, **Sign up**, **Forgot password?** and **Continue as guest**.
- **Profile tab** shows a **"Your Divine Tarot account"** card with **Log in** and **Create account** buttons.
- **Guests** (no login) can still use the free features. Their profile and readings are saved on that phone only.
- **Buying something needs a login**, so the purchase follows the user to other phones and to the website.

### Sharing with Ginni Ki Baatein (website)

- A user who has **Ginni Premium on the website** gets **unlimited readings in the app** automatically
  (the app reads Ginni's `ginni_access` table).
- **Logged-in users:** the 3 free readings a day are counted by Ginni's existing server function **`reading-gate`**.
  So the 3 a day are **shared** between the app and the website (not 3 + 3).
- **Guests:** the 3 a day are counted on the phone.
- Buying **Ginni Unlimited** in the app (₹199 / 30 days) also unlocks Ginni on the website.

### Where the code is

| What | File |
|---|---|
| Login screen | `src/app/login.tsx` |
| Supabase connection | `src/lib/cloud/supabase.ts` |
| Log in / sign up / reset / log out | `src/lib/cloud/auth.ts` |
| Profile, readings, purchases in the cloud | `src/lib/cloud/db.ts` |
| Ginni sharing (premium + 3-a-day count) | `src/lib/cloud/ginni.ts` |
| Server functions | `supabase/functions/` |
| Tables and security rules | `supabase/migrations/` |

To point the app at a different Supabase project (normally never), put `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env` (see `.env.example`).

---

## Settings to check in the Supabase Dashboard

Open <https://supabase.com/dashboard/project/agwpfisykktphrrmnnzu>.

### 1. Password reset link (URL Configuration)

**Forgot password?** in the app sends Supabase's reset email. The link in that email opens **Ginni on the website**
(`https://reading.thedivinetarotonline.com/` if it is allowed, otherwise the project's **Site URL**).
The user sets the new password there, then logs in to the app.

1. Go to **Authentication → URL Configuration**.
2. Check that **Site URL** or **Redirect URLs** includes `https://reading.thedivinetarotonline.com`
   (add `https://reading.thedivinetarotonline.com/**` under **Redirect URLs** if it is missing → **Save**).
3. Ask whoever maintains the Ginni website to confirm that, after clicking the reset link, the website lets the user
   **type a new password**.
4. **Test once:** in the app tap **Log in → Forgot password?**, enter your own email, open the email, set a new
   password, then log in to the app with it.

- [ ] Redirect URL checked
- [ ] Reset tested end to end

### 2. Leaked password protection (recommended)

1. **Authentication → Settings** (in some dashboard versions this is under **Authentication → Attack Protection** or **Passwords**).
2. Turn on **"Leaked password protection"** (blocks passwords known from data leaks) → **Save**.

- [ ] Leaked password protection on

### 3. Email confirmation (auto-confirm)

Right now **email auto-confirm is ON**: a new user who signs up is logged in straight away.

- **Keep it ON** for the smoothest sign-up.
- If you turn it **OFF** (**Authentication → Sign In / Providers → Email → "Confirm email"**), new users must click a
  link in an email before they can log in. The app handles this: after **Sign up** it shows a **"Check your email"** screen.
  This setting also affects the Ginni website, so agree with whoever maintains it first.

Google and phone login are **OFF** in this project. Leave them off — the app does not use them.

### 4. See your users

**Authentication → Users** lists every account (app and Ginni website together). From here you can find a user by email,
send a password reset, or delete a user.

To see app data: **Table Editor** → `app_profiles`, `app_readings`, `app_entitlements`, `app_payments`.

---

## Account for the app store reviewers

Apple and Google need a login to test the app.

1. In the app, tap **Profile → Create account** and sign up with an email you control, for example
   `review@thedivinetarotonline.com`, and a strong password.
2. Give that **email + password** in Play Console (**App access**) and App Store Connect
   (**App Review Information → Sign-in required**). See [BUILD-AND-PUBLISH.md](BUILD-AND-PUBLISH.md).
3. Do **not** delete this account while a review is in progress.

---

## Changing or redeploying the server functions

Only needed if a developer changes code in `supabase/functions/` (for example, new prices).

```bash
npx supabase login                                                      # once per computer
npx supabase functions deploy app-payments --project-ref agwpfisykktphrrmnnzu
npx supabase functions deploy app-delete-account --project-ref agwpfisykktphrrmnnzu
```

Deploy only the function that changed. Keep JWT verification **on** (the default) — both functions need a logged-in user.
The Razorpay keys are already stored as function secrets (**Edge Functions → Secrets**); you do not need to set them again.

To see what a function did: **Edge Functions → (function name) → Logs**.

---

## Security warnings that belong to the Ginni website

Supabase's **Advisors → Security Advisor** shows some older warnings that come from the Ginni website, not from this app.
They were **not touched**:

- Two views, `user_retention` and `funnel_summary`, are marked **SECURITY DEFINER**.
- Some database functions can be called by **anon** (not-logged-in) users.

They are worth a look by whoever maintains Ginni Ki Baatein.

---

## Troubleshooting

| Problem | What to do |
|---|---|
| "Email or password is incorrect." | Check spelling. Use **Forgot password?**. Remember it is the same password as on Ginni |
| "This email already has an account." on Sign up | The user already has a Ginni or app account — tap **Log in** instead |
| Sign up shows "Check your email", or log in says "Please confirm your email first" | Email confirmation is ON (see Setting 3). The user must click the link in the email, then log in |
| Reset email link opens the wrong page, or no way to set a new password | Check **URL Configuration** (Setting 1) and the Ginni website's reset page |
| Reset email never arrives | Check spam. Supabase's built-in email has a low hourly limit; for many users, set up your own email sender under **Authentication → Emails → SMTP Settings** |
| Profile or readings don't appear on another phone | The user must be logged in with the **same email** on both phones |
| "Please log out, log in again, and then try once more." | The login expired — log out and log in again |
| Delete account fails | **Edge Functions → app-delete-account → Logs** |
| Paid but not unlocked | See "I paid but it is not unlocked" in [SETUP-RAZORPAY.md](SETUP-RAZORPAY.md) |
