/** Android "intent://pay?…#Intent;scheme=upi;…;end" → "upi://pay?…" so the UPI app opens. */
export function intentToUrl(url: string): string {
  if (!url.startsWith('intent://')) return url;
  const scheme = /[#;]scheme=([^;]+)/.exec(url)?.[1];
  const body = url.slice('intent://'.length).split('#Intent')[0];
  return scheme ? `${scheme}://${body}` : url;
}

/** Pages the in-app browser can show (everything else — UPI, tel:, mailto:, WhatsApp — goes to the phone). */
export function isWebUrl(url: string): boolean {
  return /^(https?:|about:|data:|blob:)/i.test(url);
}

/**
 * Google refuses sign-in inside embedded web views ("disallowed_useragent").
 * Those few pages open in the system sign-in sheet instead, then return to the app.
 */
export function needsSystemAuth(url: string): boolean {
  return /^https:\/\/accounts\.google\.com\//i.test(url);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}
