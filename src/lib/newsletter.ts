import { Links } from '@/constants/config';

/**
 * The website's newsletter (thedivinetarotonline.com/api/subscribe): adds the email (and optional WhatsApp number)
 * to the Divine Insights list; new subscribers get the welcome email. Throws when it didn't go through.
 */
export async function subscribeNewsletter(email: string, whatsapp?: string): Promise<void> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    const res = await fetch(Links.newsletterApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), whatsapp: whatsapp || undefined }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`newsletter ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}
