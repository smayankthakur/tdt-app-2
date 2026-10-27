/**
 * The app's privacy policy, shown natively on Profile → Privacy policy (src/app/privacy.tsx).
 * Keep it true to what the app does; update it together with the Play Store / App Store privacy forms.
 * Have it reviewed by a lawyer before launch (see docs/PRIVACY-POLICY.md).
 */
export const PRIVACY_UPDATED = '27 Oct 2026';
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
      'Ginni chat: the last 30 messages of your chat with Ginni are kept only on your phone (not on our servers), so they are there when you come back. They are deleted when you log out. Your readings themselves are saved to your account as described above.',
      'Personal Reading bookings: before you pay we ask for your email; after you pay, the form asks for your name, WhatsApp number, email (confirmed with a one-time code), place, date and time of birth and a photo, and the same for up to two other people you ask about, plus your concern. These go to our reader so she can prepare your reading, and your slot and Google Meet link are emailed to you.',
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

/** Terms of use and refund & cancellation policy (Profile → Terms / Refunds). Have a lawyer review before launch. */
export const TERMS_UPDATED = '27 Oct 2026';
export const SUPPORT_CONTACT = 'thedivinetarotsupport@gmail.com';

export const TERMS_OF_USE: { h: string; p: string[] }[] = [
  {
    h: '',
    p: [
      'These terms apply to The Divine Tarot app (the "App") and its services by The Divine Tarot (thedivinetarotonline.com) and tarot reader Bharti Singh. By using the App you agree to them.',
    ],
  },
  {
    h: '1. Who can use the App',
    p: ['You must be 18 or older. One account is for one person: please don\'t share your account or your plan with others.'],
  },
  {
    h: '2. Your account',
    p: [
      'Your App account is the same as your Ginni Ki Baatein account on our website (same email and password). Keep your password safe; you are responsible for activity on your account.',
      'You can change your password in Profile → Change password, and delete your account in Profile → Delete account.',
    ],
  },
  {
    h: '3. Guidance only',
    p: [
      'Tarot readings, horoscopes, numerology, Panchang and Kundli content are for spiritual guidance and entertainment. They are not medical, legal, financial or other professional advice, and they do not guarantee any outcome. For health, legal or money decisions, please speak to a qualified professional.',
      'We do not offer Tantra, Vashikaran, black magic or similar services, and we do not answer questions on legal cases, share market, lottery or gambling, a child\'s gender, or sexual matters.',
    ],
  },
  {
    h: '4. Plans and payments',
    p: [
      'Prices are shown in Indian rupees before you pay. Payments are processed by Razorpay; we never see your card or bank details.',
      'Ginni Unlimited: ₹199 for 30 days of unlimited Ginni readings, the full daily horoscope, the weekly rashifal, numerology and the Kundli report. It does not renew by itself — buy again to continue; paying early adds 30 days to the time left.',
      'Personal Reading: a 40-minute Google Meet voice call. Your slot is assigned after you pay and fill the form. See the Refund & cancellation policy.',
    ],
  },
  {
    h: '5. Fair use',
    p: ['Please don\'t misuse the App: no attempts to break or overload it, copy its content in bulk, or send abusive, unlawful or harmful content (including in support tickets and booking forms).'],
  },
  {
    h: '6. Content',
    p: ['The App\'s text, card meanings, images and design belong to The Divine Tarot or its licensors. You may share your own readings for personal use (for example with the Share button).'],
  },
  {
    h: '7. Our responsibility',
    p: ['We work to keep the App available and correct, but it is provided "as is". To the extent the law allows, our total responsibility for any claim is limited to the amount you paid us for the service in question.'],
  },
  {
    h: '8. Changes and law',
    p: ['We may update these terms; the "Last updated" date will change and important changes are shown in the App. These terms are governed by the laws of India.'],
  },
  {
    h: '9. Contact and grievances',
    p: [`Support: ${SUPPORT_CONTACT} or Profile → Help & support (we reply within 24 hours). Privacy and grievances: ${PRIVACY_CONTACT} — we acknowledge within 24 hours and resolve within 30 days. WhatsApp +91 88281 16545.`],
  },
];

export const REFUND_POLICY: { h: string; p: string[] }[] = [
  {
    h: '',
    p: ['This policy explains refunds and cancellations for purchases made in The Divine Tarot app.'],
  },
  {
    h: '1. Ginni Unlimited, Kundli report and courses',
    p: [
      'These are digital services that unlock as soon as payment is confirmed, so they are not refundable once unlocked.',
      'We refund in full if you were charged twice for the same purchase, or if you were charged and it did not unlock within 24 hours and we could not unlock it for you.',
      'Ginni Unlimited does not renew automatically, so there is nothing to cancel — it simply ends after 30 days.',
    ],
  },
  {
    h: '2. Personal Reading (call with Bharti Singh)',
    p: [
      'Payments for Personal Readings are non-refundable, and a booked slot cannot be rescheduled.',
      'Please join the Google Meet on time from a stable network. We wait 5 minutes after your slot starts; after that the appointment counts as missed.',
      'If we cannot hold your reading at the booked time from our side, we will offer a new slot or a full refund.',
    ],
  },
  {
    h: '3. How to ask for a refund',
    p: [
      `Open Profile → Help & support, choose "Billing / double charge", and attach your payment proof — or email ${SUPPORT_CONTACT} within 7 days of the payment.`,
      'Approved refunds go back to the original payment method through Razorpay, usually within 5–7 working days.',
    ],
  },
];
