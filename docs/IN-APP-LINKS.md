# Websites inside the app

Rule: **every web page opens inside the app** (the app's own browser screen, `src/app/web.tsx`).
Nothing is sent to Chrome or Safari.

## The sites (checked October 2026)

| Address | What it is | Where it is in the app |
|---|---|---|
| `thedivinetarotonline.com` (and `www.`) | Main website: home, `/about`, `/privacy`, `/kundli-milan` (free Kundli tool). `/reading` forwards to `reading.` | Profile → Our websites · Profile → About / Privacy policy |
| `reading.thedivinetarotonline.com` | **Ginni Ki Baatein**, web version. `/reading?upgrade=1` is its Premium page | Profile → Our websites → Ginni Ki Baatein (web). The app's own Reading tab does the same thing natively |
| `ginni.thedivinetarotonline.com` | Ginni again (same app as `reading.`) | Opens in-app if any page links to it |
| `chat.thedivinetarotonline.com` | Ginni again (its pages call themselves `tdt-ginni-1.vercel.app`) | Opens in-app if any page links to it |
| `learn.thedivinetarotonline.com` | Courses site — 5 courses, each with a Razorpay payment link (`rzp.io/…`) | Courses tab → Enrol · Profile → Our websites → Courses website |
| `booking.thedivinetarotonline.com` | Personal reading booking: Razorpay checkout (₹5,500 Diwali offer until 30 Nov 2026, normally ₹8,500; Urgent ₹17,000), then a form; the Google Meet link is emailed | Home → Personal reading · Profile → Book a personal reading · Kundli tab |
| `support.thedivinetarotonline.com` | Support ticket form with file uploads | Profile → Support |

Checked and **not live** (no site): `admin`, `app`, `api`, `kundli`, `blog`, `dashboard`, `course`, `courses`, `pay`,
`staging`, `dev`, `academy`, `cms`, `panel`, `personal`, `ai`, `tarot`.

The domain uses a wildcard DNS record and certificate on Vercel, so a full list can only come from the Vercel
project's **Settings → Domains** page. Any subdomain added later still opens inside the app automatically. Nothing needs
changing in the app.

## What happens to each kind of link

| Link | Goes to |
|---|---|
| Any `https://` page: all subdomains, `rzp.io`, `razorpay.com`, bank and card-OTP pages, Instagram, Facebook, YouTube, Google Forms | **In-app browser** |
| Link with `target="_blank"`, `window.open(...)`, a form that opens a new tab | **Same in-app screen** (no new tab, no outside browser) |
| "Open in Chrome / Edge / Firefox" links (`googlechrome://`, `intent://…;scheme=https`) | **The same page, in-app** |
| `upi://`, PhonePe / Google Pay / Paytm links | The **UPI app**. After paying, the user comes back to the app. Nothing else can approve a UPI payment |
| `tel:`, `mailto:`, `whatsapp:` | Phone dialler, mail app, WhatsApp |
| `market://` (Play Store) | Play Store app, or the Play Store web page in-app if the store is missing |
| `accounts.google.com` (Google sign-in) | A Google sign-in sheet **over** the app, which closes back into the app. Google blocks its sign-in page inside embedded browsers, so no app can avoid this. None of the sites above uses Google sign-in today |

## Payments

- **In-app purchases** (Ginni Unlimited ₹199, Kundli report ₹99): the Razorpay checkout runs in a sheet inside the app.
  - Cards, UPI ID, wallets: finish inside the sheet.
  - Netbanking or a card that needs an OTP: the bank page opens in the same sheet. When it finishes, Razorpay returns to
    `https://thedivinetarotonline.com/?tdt_payment_return=1`. The app catches that address, closes the sheet, and asks the
    server (the Supabase function `tdt-payments` → `checkOrder`) whether the order was paid.
  - UPI apps: the UPI app opens. When the user comes back and closes the sheet, the app checks the order once (same `checkOrder`).
- **Course links (`rzp.io`) and booking checkout**: these are Razorpay pages on the website. They run in the in-app browser.

### One website change recommended (`booking.` page)

Netbanking and OTP pages normally open as a pop-up. Inside an app a pop-up can't link back to the page that opened it,
so the app reports "pop-up blocked". Razorpay then shows the bank page in the same screen, and it needs a **`callback_url`**
to return to.

Ask your web developer to add these two options to the Razorpay checkout on **booking.thedivinetarotonline.com**:

```js
callback_url: 'https://booking.thedivinetarotonline.com/payment-done', // a page that confirms the booking
redirect: false, // keep the normal flow on desktop; Razorpay uses callback_url only when a pop-up can't open
```

Then test a **Netbanking** test payment on the booking page inside the app.

`rzp.io` course links are Razorpay-hosted pages and need no change.
