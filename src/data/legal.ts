/**
 * The app's privacy policy, shown natively on Profile → Privacy policy (src/app/privacy.tsx).
 * Keep it true to what the app does; update it together with the Play Store / App Store privacy forms.
 * Have it reviewed by a lawyer before launch (see docs/PRIVACY-POLICY.md).
 */
export const PRIVACY_UPDATED = '16 Oct 2026';
export const PRIVACY_CONTACT = 'thedivinetarot111@gmail.com';

export const PRIVACY: { h: string; p: string[] }[] = [
  {
    h: '',
    p: [
      'This policy explains how The Divine Tarot ("we", "us") collects and uses information in The Divine Tarot app for Android, iPhone and web (the "App"). By using the App you agree to this policy.',
    ],
  },
  {
    h: '1. Information we collect',
    p: [
      'Account: if you create an account or log in, your email address, your name and your password. The password is stored only in scrambled ("hashed") form — nobody can read it. The account is the same as Ginni Ki Baatein on our website (reading.thedivinetarotonline.com), and Ginni Unlimited (bought in the App) and Ginni Premium (bought on the website) both work in the App and on that website.',
      'Profile details you choose to enter (all optional): gender, date, time and place of birth, marital status, occupation and a profile photo. They are used to personalise your readings.',
      'Saved readings: the question you typed, the topic, the cards drawn and the date. If you are logged in they are saved to your account so they appear on your other phones.',
      'Purchases: which product you bought, the amount, the date, the Razorpay order and payment IDs, and until when it is active. We never see or store your card, UPI or bank details — Razorpay handles those.',
      'Personal Reading bookings: after you pay, the form asks for your name, WhatsApp number, email, place, date and time of birth and a photo, and the same for up to two other people you ask about, plus your concern. These go to our reader so she can prepare your reading, and your slot and Google Meet link are emailed to you.',
      'Support requests: your name, email, the problem you describe and any screenshots you attach.',
      'Newsletter (optional): if you subscribe on the Home screen, your email and, if you add it, your WhatsApp number, so we can send daily insights, course news and offers. You can unsubscribe from any email.',
      'Usage data (optional, ON by default): each time the App opens we may record the date and time, a random session code, platform, operating-system version, device model, app version, App language and, if logged in, your user ID; and which steps you reach in the App (for example: opened the App, started a reading, saw a price, paid, shared), with a random install code and labels such as the product or screen. Turn it off any time in Profile → Privacy. Your questions, readings and profile are never sent with it.',
      'Crash reports: if the App crashes or hits an error, a technical report (error details, app version, phone model and operating system) is sent to our crash-reporting provider so we can fix it. It contains no name, email, IP address, questions or readings.',
      'Invites: if you enter a friend’s invite code when you sign up, we record who invited you. No reward is given in the App.',
      'Approximate location (optional, OFF by default): only if you turn on Profile → Privacy → Share approximate city and allow location permission, we record your city, state and country — never your exact position.',
      'Stored only on your phone: Kundli Milan names and birth details, your daily card, streak and badges, the Moon sign you pick for your horoscope, the city you choose for Panchang, your journal entries and moods, your mantra and meditation counts, and reminder settings. Journal entries are never sent to us (only your phone’s own backup, if you have it on, may include them) and are removed from the phone when you log out. Your horoscope, numerology and Panchang are worked out on your phone. Reminders (daily card, streak, festivals, journal) are scheduled on your phone; we do not run a push-notification server.',
    ],
  },
  {
    h: '2. How we use it',
    p: [
      'To log you in and keep your profile, readings and purchases across phones; to personalise readings and Kundli features; to process payments, unlock what you bought and handle support; to arrange and hold your Personal Reading; to understand, in total, how the App is used and improve it (only with usage data on); and to meet legal, tax and accounting duties.',
      'We do not sell your data, show third-party ads, or track you across other companies’ apps or websites.',
    ],
  },
  {
    h: '3. Who processes it',
    p: [
      'Supabase (database, login and server functions): account, profile, saved readings, purchases, and usage steps (when usage data is on).',
      'Sentry: crash reports.',
      'Razorpay: payments.',
      'Google (Firebase, Calendar, Sheets and Drive): Personal Reading bookings, Google Meet links, support tickets and optional usage records.',
      'Our email providers (including Resend): booking confirmations, support replies, password-reset emails and the newsletter.',
      'These providers process data for us under their own terms and security measures, and their servers may be outside India.',
    ],
  },
  {
    h: '4. How long we keep it',
    p: [
      'Account, profile and saved readings: until you delete your account (or a reading). Purchase and booking payment records: as long as Indian tax and accounting law requires, even after account deletion. Booking details: as long as needed to hold and follow up your reading. Usage records: up to 24 months, then deleted or made fully anonymous. Crash reports: up to 90 days.',
    ],
  },
  {
    h: '5. Your choices and rights',
    p: [
      'Delete your account in the App: Profile → Delete account. This permanently deletes your login, profile, saved readings and purchases from our servers — and, because it is the same account, your Ginni Ki Baatein login on the website. A record of each payment is kept, without your account, as explained above.',
      'Turn usage data or location sharing on or off in Profile → Privacy, and edit your profile any time.',
      `You can ask us to access, correct or erase your personal data, or raise a grievance, by writing to ${PRIVACY_CONTACT}. We reply within 30 days.`,
      'If you use the App without logging in, your data stays on your phone; uninstalling the App removes it.',
    ],
  },
  {
    h: '6. Children',
    p: ['The App is meant only for people aged 18 and above, because it offers paid astrology and tarot services. We do not knowingly collect data from anyone under 18. If you believe a minor has given us data, contact us and we will delete it.'],
  },
  {
    h: '7. Security',
    p: ['Data is sent over encrypted connections (HTTPS). Security rules let each user read only their own profile and readings. No method is 100% secure, but we take reasonable steps to protect your data.'],
  },
  {
    h: '8. Readings are for guidance',
    p: ['Tarot, Kundli and astrology content is for guidance and entertainment. It is not medical, legal, financial or professional advice.'],
  },
  {
    h: '9. Changes',
    p: ['We may update this policy. We will change the "Last updated" date and, for important changes, tell you in the App.'],
  },
  {
    h: '10. Contact',
    p: [`The Divine Tarot · ${PRIVACY_CONTACT} · WhatsApp +91 88281 16545`],
  },
];
