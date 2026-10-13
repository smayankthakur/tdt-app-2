# Razorpay setup (in-app payments)

**Razorpay** is the Indian payment company that collects money in the app (UPI, cards, net banking, wallets).
The app uses **Razorpay Standard Checkout** — the normal Razorpay payment screen.

What users can buy:

| Product | Price | What it unlocks |
|---|---|---|
| Ginni Unlimited | ₹199 | Unlimited Ginni readings for 30 days (every account gets 3 free readings for life). **Also unlocks Ginni Ki Baatein on the website** for the same 30 days |
| Kundli full report | ₹99 | Full 8-koota Kundli Milan reports |

**Buying needs a login** (email + password), so the purchase follows the user to other phones.

> **App payments are real money (LIVE keys).** The payment functions run in the Ginni website's Supabase project
> **ginni2** (`hnaggjopklxcgzxsyswc`). One-time setup: add the two keys below as function secrets, then set up the webhook.

---

## How it works

The payments run on a small server program in Supabase, the Edge Function **`tdt-payments`**
(code: `supabase/functions/tdt-payments/index.ts` and `supabase/functions/_tdt/payments.ts`). It does three things:

1. **`createOrder`** — creates the Razorpay order. The price is decided here, so nobody can change it on their phone.
2. **`verifyPayment`** — checks Razorpay's payment signature with the secret key, then unlocks the purchase for the user.
3. **`checkOrder`** — for payments that finish on a bank page or in a UPI app: asks Razorpay directly whether the order was paid.

Each paid order is saved once in the Supabase table **`tdt_payments`**, so one payment can never unlock twice.

## Where the keys are

Razorpay has **two keys**. **You** add both in the Supabase project **ginni2** as function secrets
(use the same live keys as the Ginni Ki Baatein website):

| Secret | Where it lives |
|---|---|
| `RAZORPAY_KEY_ID` (`rzp_live_…`) | Supabase Dashboard → **Edge Functions → Secrets** |
| `RAZORPAY_KEY_SECRET` | Supabase Dashboard → **Edge Functions → Secrets** |

- The app gets the public **Key ID** from the server when it creates an order. There is **nothing to put in `.env`**
  and no Razorpay key inside the app.
- The **Key Secret** lives **only** in Supabase. Never put it in `.env`, the app, WhatsApp or email.
- These are **LIVE** keys (`rzp_live_…`). If you ever change them, it changes payments for **both** the app and the Ginni website.

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

## Testing

The server uses the **live** keys, so there is no "test mode" for the app on its own. Switching the function to test keys
would also switch the **Ginni website** to test payments. So the simple, safe way is:

**Do one real ₹99 purchase yourself, then refund it.**

1. In the app, log in (**Profile → Log in**), open **Kundli** and tap **Pay ₹99**.
2. Pay with your own UPI or card.
3. Check:
   - [ ] The app shows the plan in **Profile → Your plan**.
   - [ ] Supabase Dashboard → **Table Editor → `tdt_payments`** has a new row (order ID, product, amount in paise, payment ID).
   - [ ] Razorpay Dashboard (Live Mode) → **Transactions → Payments** shows the payment as **Captured**.
4. Refund it: Razorpay Dashboard → **Transactions → Payments** → open the payment → **Refund**.
5. Also try **cancelling** the payment screen once — nothing should unlock.

### Bank pages and UPI apps

- **Netbanking** and **cards that ask for an OTP** open their bank page inside the same payment screen. When it finishes,
  Razorpay returns to `https://thedivinetarotonline.com/?tdt_payment_return=1`. The app catches that address
  (nobody actually lands on the website), closes the screen, and asks the server (**`tdt-payments` → `checkOrder`**)
  whether the order was paid. It tries a few times, because banks can take a few seconds.
- **UPI apps** (PhonePe, Google Pay, Paytm…): the UPI app opens. When the user comes back and closes the payment screen,
  the app checks the order once with `checkOrder`.

**Late payments are covered twice:**
- The app remembers every order it opened. Each time the app opens or comes back to the screen (for example after
  paying in a UPI app), it asks the server about any order that isn't confirmed yet, for up to 3 days.
- A **Razorpay webhook** tells the server the moment a payment is captured, even if the user never opens the app again.
  This one needs a 5-minute setup — see **Set up the payment webhook** below.

### Set up the payment webhook (do this once)

1. Think of a long random password for the webhook (30+ letters and numbers). This is the **webhook secret**.
2. Razorpay Dashboard → **Accounts & Settings → Webhooks → + Add New Webhook**:
   - **Webhook URL:** `https://hnaggjopklxcgzxsyswc.supabase.co/functions/v1/tdt-razorpay-webhook`
   - **Secret:** the password from step 1
   - **Active events:** tick **payment.captured**
   - Save. (Make sure the toggle at the top is on **Live Mode**.)
3. Supabase → **Edge Functions → Secrets → Add new secret**:
   - **Name:** `TDT_RAZORPAY_WEBHOOK_SECRET`
   - **Value:** the same password from step 1
4. Check: after your test ₹99 purchase, Supabase → **Edge Functions → tdt-razorpay-webhook → Logs** should show a
   call with status 200. Ginni website payments also reach this webhook; they're ignored safely.

The website's own Razorpay webhook (if any) stays as it is — this is a separate one just for the app.

If Razorpay ever shows **"callback URL not allowed"**, add **thedivinetarotonline.com** under
**Account & Settings → Website and app details** in the Razorpay Dashboard.

If a payment shows **Authorized** but not **Captured**, go to **Account & Settings → Payment capture** and set it to
**Automatic**. (The server only counts **captured** payments.)

---

## Money, refunds and records

- Settlements (money to your bank) follow Razorpay's schedule — see **Settlements** in the Razorpay Dashboard.
- Refunds: **Transactions → Payments** → open the payment → **Refund**. A refund does **not** automatically
  remove the unlock in the app. (Ginni Unlimited expires on its own after 30 days.)
- **Your sales record** = Supabase **Table Editor → `tdt_payments`** + the Razorpay Dashboard.
  Keep them for accounts/GST. `tdt_payments` has: `order_id`, `user_id`, `product_id`, `amount_paise`
  (₹ × 100), `payment_id`, `expires_at`, `created_at`.
- If a user deletes their account, their `tdt_payments` rows stay (with an empty `user_id`) as the sales record.

## "I paid but it is not unlocked"

The app re-checks unconfirmed orders every time it opens (for 3 days), and the webhook unlocks a captured payment
on the server straight away. So this should be very rare — check first that the webhook is set up (above).

1. Ask the user for the **email** they log in with and the **Razorpay payment ID** (in their Razorpay SMS/email).
2. In the Razorpay Dashboard, find the payment and confirm it is **Captured**. Note its **Order ID** (`order_…`).
3. In Supabase → **Table Editor → `tdt_payments`**, search for that Order ID.
   - **If it is there:** the unlock is saved. Ask the user to log out and log in again (or close and reopen the app) with the same email.
   - **If it is not there:** open Supabase → **Edge Functions → tdt-razorpay-webhook → Logs** and **tdt-payments → Logs**
     and look for an error at that time.
     Then either **refund** the payment, or ask your developer to add the unlock by hand
     (a row in `tdt_entitlements` for that user and product — and, for Ginni Unlimited, `subscriptionExpires` in `User` —
     plus a matching row in `tdt_payments`).
4. To find the user's app ID: Supabase → **Authentication → Users** → search by email (their website row is in Table Editor → `User`).

## Changing prices

Prices are written in **two** places and must match:

| File | Ginni Unlimited | Kundli full report |
|---|---|---|
| `src/constants/config.ts` → `Products` (rupees — what the app **shows**) | `price: 199` | `price: 99` |
| `supabase/functions/_tdt/payments.ts` → `PRODUCTS` (paise = rupees × 100 — what is **charged**) | `amount: 19900` | `amount: 9900` |

1. Change both files.
2. Redeploy the function (needs `npx supabase login` once on your computer):

   ```bash
   npx supabase functions deploy tdt-payments tdt-razorpay-webhook --project-ref hnaggjopklxcgzxsyswc
   ```

3. Publish an app update for the new shown price (an over-the-air update is enough — see `BUILD-AND-PUBLISH.md`).

If they don't match, the shown price and the charged price differ — always change both.

## Common problems

| Symptom | Fix |
|---|---|
| No paywall / Pay button appears | The `StorePolicy` switch is off for that platform, or the app cannot reach Supabase |
| "Please log in first so your purchase is saved to your account." | Normal: purchases need an account. Log in or create one |
| Payment fails at once | Supabase → **Edge Functions → tdt-payments → Logs**. `razorpay_401` means the keys in **Edge Functions → Secrets** are wrong |
| `order_amount_mismatch` in the logs | The price in `tdt-payments` was changed after the order was made; the user should try again |
| Paid, but the screen says it failed | See "I paid but it is not unlocked" above |
| UPI app does not open on phone | Make sure the UPI app is installed; try "Pay by UPI ID" instead |
