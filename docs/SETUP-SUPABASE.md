# Supabase setup (login, profiles, saved readings, purchases)

**Supabase** is the online service that holds the app's accounts and cloud data.
The app uses the **Ginni Ki Baatein website's own Supabase project** (`reading.thedivinetarotonline.com`):

- Project name: **ginni2**
- Project ref: **`hnaggjopklxcgzxsyswc`**
- URL: **`https://hnaggjopklxcgzxsyswc.supabase.co`**
- Dashboard: <https://supabase.com/dashboard/project/hnaggjopklxcgzxsyswc>

**One account works in both places.** The app logs in against the website's own `"User"` table, so a user who already
uses Ginni on the website logs in to the app with the **same email and password**, and an account made in the app
works on the website too. The **3 free readings for life** and **Ginni Premium** are shared with the website as well.

---

## One-time setup (about 10 minutes)

Nothing of the website is changed or removed. Everything the app adds is named `tdt_…`.

### 1. Add the app's tables and database functions

1. Open the dashboard → **SQL Editor** → **New query**.
2. Paste the whole file `supabase/migrations/20261013120000_tdt_app_on_ginni2.sql` → **Run**.
3. It should say **Success. No rows returned.** Running it twice gives "already exists" — that is harmless.

- [ ] SQL ran

### 2. Deploy the four server functions

On your computer, in `D:\tdt-app-2`:

```bash
npx supabase login                                              # once per computer; opens the browser
npx supabase functions deploy --project-ref hnaggjopklxcgzxsyswc
```

That deploys all four with the right settings from `supabase/config.toml`:

| Function | What it does | JWT verification |
|---|---|---|
| `tdt-auth` | Log in / sign up with the website email + password | **Off** (nobody is logged in yet; it checks the password itself and is rate limited) |
| `tdt-payments` | Creates Razorpay orders and checks payments | On |
| `tdt-delete-account` | **Profile → Delete account** | On |
| `tdt-razorpay-webhook` | Unlocks late payments when Razorpay captures them | **Off** (checks Razorpay's signature instead) |

- [ ] Functions deployed (Dashboard → **Edge Functions** lists all four)

### 3. Add the Razorpay secrets (you type these — never put them in the app or in Git)

Dashboard → **Edge Functions → Secrets** → add:

| Name | Value |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → Account & Settings → API Keys → Key ID (`rzp_live_…`) |
| `RAZORPAY_KEY_SECRET` | The Key Secret that goes with it |
| `TDT_RAZORPAY_WEBHOOK_SECRET` | The secret you type when creating the webhook (see [SETUP-RAZORPAY.md](SETUP-RAZORPAY.md)) |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions automatically — do not add them.

- [ ] Secrets added

### 4. Leaked password protection (recommended)

**Authentication → Attack Protection** (or **Settings / Passwords**) → turn on **Leaked password protection**.

---

## How login works

- **Email + password only** (the website's own accounts). No Google, Apple or phone-OTP login.
- Screen: `src/app/login.tsx` — **Log in**, **Sign up**, **Forgot password?** and **Continue as guest**.
- Behind the scenes: the `tdt-auth` function checks the password against `"User"` (bcrypt, same as the website),
  makes sure a linked Supabase Auth user exists (table `tdt_accounts`) and hands the app a one-time password for it.
  The app then holds a normal Supabase login on the phone that refreshes itself. The website password is **never**
  copied into Supabase Auth.
- **Sign up** in the app creates the `"User"` row (with its own referral code), so the account works on the website.
- **Forgot password?** opens the Ginni website inside the app, where the user resets it with the website's own flow.
- Passwords must be at least 6 characters. Login is limited to 10 tries per email and 40 per network in 15 minutes.
- **Ginni readings and buying need a login.** Guests can still use Card of the Day, Kundli Milan, courses and the card library.

### Shared with the website

- **Free readings:** the website's own lifetime counter `"User"."readingsUsed"` — 3 for life, plus any referral
  `bonusReadings`. A reading used in the app counts on the website, and the other way round.
- **Premium:** active if `"User"."subscriptionExpires"` or `"subscriptionEndsAt"` is in the future, or the user bought
  Ginni Unlimited in the app. Buying **Ginni Unlimited** in the app (₹199 / 30 days) moves `subscriptionExpires`
  forward, so it unlocks the website too.

### Tables the app adds

| Table | What it holds | Who can write it |
|---|---|---|
| `tdt_accounts` | Links each app login (Supabase Auth user) to its website `"User"` | Only the server |
| `tdt_login_attempts` | Recent login tries, for rate limiting | Only the server |
| `tdt_profiles` | Profile screen (name, gender, birth date/time/place, marital status, occupation, photo) | The user (own row) |
| `tdt_readings` | Saved readings | The user (own rows) |
| `tdt_entitlements` | What the user bought in the app and until when | Only the server |
| `tdt_payments` | One row per paid Razorpay order — your sales record; stops one payment unlocking twice | Only the server |

Row Level Security is on for all of them. Database functions: `tdt_check_password` and `tdt_create_user`
(server only), `tdt_reading_status` and `tdt_use_reading` (logged-in users, own account only).

### Where the code is

| What | File |
|---|---|
| Login screen | `src/app/login.tsx` |
| Supabase connection | `src/lib/cloud/supabase.ts` |
| Log in / sign up / log out / delete | `src/lib/cloud/auth.ts` |
| Profile, readings, purchases in the cloud | `src/lib/cloud/db.ts` |
| Free-reading count + Premium | `src/lib/cloud/ginni.ts`, `src/lib/quota.ts` |
| Server functions | `supabase/functions/` (`_tdt/` is shared code) |
| Tables and security rules | `supabase/migrations/20261013120000_tdt_app_on_ginni2.sql` |

The project URL and publishable key are built into `src/constants/config.ts` (public by design) and also in `.env.eas`.

---

## Account for the app store reviewers

1. In the app, tap **Profile → Create account** with an email you control (e.g. `review@thedivinetarotonline.com`).
2. Give that email + password in Play Console (**App access**) and App Store Connect (**Sign-in required**).
3. Don't delete it while a review is in progress. To let reviewers try readings freely, give it Premium:
   Table Editor → `User` → that row → set `subscriptionExpires` to a date next year.

---

## Everyday admin

- **Users:** Table Editor → `User` (website and app together). **Authentication → Users** only lists people who
  have logged in to the app.
- **Extra free readings for someone:** Table Editor → `User` → their row → raise `bonusReadings` (or lower `readingsUsed`).
- **Sales from the app:** Table Editor → `tdt_payments`, plus the Razorpay Dashboard.

## Changing the server functions

After a developer changes `supabase/functions/` (e.g. new prices in `_tdt/payments.ts`), redeploy:

```bash
npx supabase functions deploy --project-ref hnaggjopklxcgzxsyswc
```

Logs: **Edge Functions → (name) → Logs**.

---

## Troubleshooting

| Problem | What to do |
|---|---|
| "Email or password is incorrect." | Same password as the Ginni website. Use **Forgot password?** to reset it there |
| "This email already has an account." on Sign up | They already have a Ginni account — tap **Log in** |
| "Too many attempts" | Wait 15 minutes |
| Log in fails with "Something went wrong" | **Edge Functions → tdt-auth → Logs**. Check the SQL from step 1 ran and the function is deployed |
| Profile or readings don't appear on another phone | Must be logged in with the same email on both |
| "Please log out, log in again, and then try once more." | The login expired — log out and in again |
| Delete account fails | **Edge Functions → tdt-delete-account → Logs** |
| Paid but not unlocked | See "I paid but it is not unlocked" in [SETUP-RAZORPAY.md](SETUP-RAZORPAY.md) |

**Deleting an account** removes the app data and the website account. If the user ever paid on the website
(rows in `Order`), the `"User"` row is anonymised instead of deleted so the order records stay intact.
