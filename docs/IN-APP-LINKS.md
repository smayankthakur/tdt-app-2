# Website pages → app screens

Rule: **everything the websites offer is a screen of the app itself** — no web pages. The app talks to the same
backends the websites use, so bookings, tickets, accounts and payments end up in the same places as before.

| Website | In the app | Backend it uses |
|---|---|---|
| `thedivinetarotonline.com` home | **Home** tab | — |
| `/about` | **Profile → About** (`src/app/about.tsx`, text in `src/data/about.ts`) | — |
| `/privacy` | **Profile → Privacy policy** (`src/app/privacy.tsx`, text in `src/data/legal.ts`) | — |
| `/kundli-milan` | **Kundli** tab (worked out on the phone) | — |
| `reading.thedivinetarotonline.com` (Ginni Ki Baatein) | **Reading** tab — same account, same 3 free readings for life, same Premium | Supabase project ginni2 (`tdt-auth`, `tdt_reading_status`, `tdt_use_reading`) |
| Ginni "Forgot password" | **Log in → Forgot password?** (native form) | `reading.…/api/auth/forgot-password` — the website emails the reset link |
| `learn.thedivinetarotonline.com` | **Courses** tab → course → **Enrol — pay ₹…** (Razorpay's native payment sheet) | Supabase `tdt-payments` (course products) |
| `booking.thedivinetarotonline.com` | **Personal Reading** screen (`src/app/booking/`) — prices, next free slot, pay, 3-step form, slot + Google Meet link | Booking site's app routes `/api/app/order`, `/api/app/verify` + `/api/booking`, `/api/slots`, `/api/form` |
| `support.thedivinetarotonline.com` | **Profile → Support** (native form with screenshots) | `support.…/api/support` (Tickets sheet + email reply) |

Entry points: Home → Personal reading, Profile → Book a personal reading, Kundli result → Book a personal reading,
Profile → Explore (Ginni / Courses / Kundli tabs).

## Things that still leave the app (on purpose)

| What | Opens |
|---|---|
| Paying with a UPI app (PhonePe, Google Pay, Paytm…) | The UPI app, from Razorpay's sheet, then back to the app. Nothing else can approve a UPI payment |
| Joining the Personal Reading call | The Google Meet app (the call itself) |
| WhatsApp us | The WhatsApp app |
| Instagram / YouTube / Facebook icons | Their own apps. Only if that app isn't installed does the profile open on the app's own browser screen |

The app's browser screen (`src/app/web.tsx`) is kept only for that last fallback and for links inside future content.

## Payments

All payments use **Razorpay's native payment sheet** (`react-native-razorpay`, Razorpay's own Android/iOS SDK) with
an order created on a server — never a web page:

- Ginni Unlimited (₹199), Kundli report (₹99), courses → Supabase function `tdt-payments`.
- Personal Reading → the booking site's `/api/app/order`; the booking is marked paid by `/api/app/verify`, by the
  booking site re-checking Razorpay, and by its webhook (`order.paid`).

After any payment the server confirms it with Razorpay before unlocking anything, so a payment finished in a UPI app or
on a slow bank page is picked up even if the app was closed.

## Web version of the app

The booking, support and Ginni websites don't accept calls from another website, so on the **web** build those three
screens send people to the website page itself. The phone apps are fully native.
