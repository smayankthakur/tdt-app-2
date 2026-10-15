# Daily features, sharing, invites and tracking

What brings people back every day, what helps them bring friends, and how you see what's working.

## Daily reasons to open the app

| Feature | Where | How it works |
|---|---|---|
| **Daily horoscope** | Home card → **Horoscope** screen | Worked out on the phone from the birth date, time and city in the profile (Vedic, Lahiri): today's Moon house from the birth Moon sign + Tarabala, plus the day's best time. No profile? The user picks a Moon sign. Offline, free, English / हिंदी / Hinglish. Text: `src/data/horoscope.ts`, maths: `src/lib/horoscope.ts` |
| **Panchang + muhurat** | Home card → **Panchang** screen | Tithi, nakshatra, yoga, karana, vaar, sunrise/sunset, Rahu kaal, Yamaganda, Gulika, Abhijit and the day's choghadiya with "now" highlighted, for the chosen city (daylight saving handled for overseas cities). Maths: `src/lib/kundli/panchang.ts`, checked against Drik Panchang by `npm run test:panchang` |
| **Festival & vrat calendar** | Panchang → **Festivals** | Dates for New Delhi, Oct 2026 – Dec 2027, from Drik Panchang cross-checked with prokerala.com and Government holiday lists (`src/data/festivals.json`). **Extend it every year** (add 2028 before Dec 2027) |
| **Notifications** | Profile → Notifications | Local, no server: daily card at the chosen time; "your streak ends tonight" at 8:30 PM only when the streak is really at risk; festival / Ekadashi mornings at 7 AM |
| **Streak badges** | Home + Profile | Milestones at 3, 7, 11, 21, 51 and 108 days (badges only — no free readings) |
| **Ginni remembers** | Reading chat | A new reading on the same topic as one in the last 6 months gets a line like "Last time you asked about work, the Tower came up…". From saved history (phone + account); offline |

## Sharing and invites

- **Share as story** (9:16 image for WhatsApp status / Instagram): readings, Card of the Day and the horoscope. The question is hidden unless the user turns it on.
- **Invite friends** (Profile, logged in): shows the user's website referral code and a share message with the store link (`support.thedivinetarotonline.com/app` sends phones to the right store).
- **Invite code at sign-up**: recorded in the website's own `"User"."referredByUserId"`. The app gives **no free readings** for it. The website's own rule still applies there: both people get bonus website readings when the invited friend first buys a subscription on the website.

## Crash reports (Sentry)

- Project **tdt-app** in Sentry organisation **sitelytc-digital-media** (sentry.io). Only release builds report; no name, email or IP is sent.
- **Readable stack traces:** `SENTRY_AUTH_TOKEN` is an EAS secret (production environment), so production builds upload source maps. Development and preview builds skip the upload (`SENTRY_DISABLE_AUTO_UPLOAD` in `eas.json`). If the token is ever revoked, make a new one in Sentry → Settings → Organization Tokens and replace it with `eas env:update`.
- Recommended: Sentry → Project **tdt-app** → Settings → Security & Privacy → turn on **Prevent Storing of IP Addresses**.

## Funnel numbers

- Steps sent (only while **Profile → Privacy → Share anonymous usage data** is on, phone builds only): install, app open, sign-up, login, reading started, paywall seen, checkout started, payment success/failed, reading done, horoscope/Panchang views, shares, invites, booking, course views. No questions, topics or profile details; no account id — just a random install id.
- **See them in the app:** log in as an owner account → Profile → **Business numbers** (last 30 days, plus real payments and revenue from `tdt_payments`). Owners are in table `tdt_admins` (Mayank's and thedivinetarot111's website accounts). Add one:
  `insert into tdt_admins select id from "User" where email = 'someone@example.com';`
- **Or in Supabase:** SQL Editor → `select * from tdt_funnel_daily;`
- Server side: `supabase/migrations/20261014120000_tdt_invites_and_events.sql` and `20261015090000_tdt_events_hardening.sql` (both already applied on ginni2). Rate limited per install and overall; deleting an account removes its link to events.

## Cheap Android phones

The animated star background drops to a light version on low-memory Android phones and when "Reduce motion" is on.
Before launch, test on one real budget phone (2–3 GB RAM): Home scroll, Reading card flip, Panchang, sharing a story.

## Store payment backup

Not built (your choice: only if a store rejects Razorpay). The switches are in `src/constants/config.ts` → `StorePolicy`.
