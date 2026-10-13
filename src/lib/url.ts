/**
 * Decides where a link goes. Rule of the app: every web page stays INSIDE the app.
 * Only things that are not web pages (UPI apps, phone, email, WhatsApp, Play Store) go to the phone,
 * and Google's own sign-in page, which Google refuses to show inside an embedded web view.
 */

/** Every *.thedivinetarotonline.com site (and the old .co.in name that some pages still use). */
export const SITE_HOSTS = /(^|\.)thedivinetarotonline\.(com|co\.in)$/i;

/** Razorpay checkout, payment links (rzp.io), payment pages and bank-redirect pages. */
export const RAZORPAY_HOSTS = /(^|\.)(razorpay\.com|rzp\.io|razorpay\.in)$/i;

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function isOurSite(url: string): boolean {
  return SITE_HOSTS.test(hostOf(url));
}

export function isRazorpay(url: string): boolean {
  return RAZORPAY_HOSTS.test(hostOf(url));
}

/** Real web pages (the only thing the in-app browser loads as a page). */
export function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** about:blank, data: and blob: — only ever allowed inside a page's frames (payment widgets use them), never as the page. */
export function isFrameOnlyUrl(url: string): boolean {
  return /^(about:|data:|blob:)/i.test(url);
}

/**
 * Sites the in-app browser may be OPENED with. The /web screen can be reached by a deep link
 * (divinetarot://web?url=…), so it must not show any page someone sends it — that would allow fake
 * pages dressed up as the app. Once open, the user can still follow links anywhere.
 */
const START_HOSTS = [
  SITE_HOSTS,
  RAZORPAY_HOSTS,
  /(^|\.)(instagram\.com|facebook\.com|fb\.com|youtube\.com|youtu\.be|sitelytc\.com|forms\.gle|wa\.me)$/i,
  /^(docs|forms|meet|play)\.google\.com$/i,
];

export function isStartAllowed(url: string): boolean {
  if (!/^https:\/\//i.test(url)) return false;
  const host = hostOf(url);
  return !!host && START_HOSTS.some((re) => re.test(host));
}

/**
 * Google refuses sign-in inside embedded web views ("disallowed_useragent").
 * Those few pages open in a sign-in sheet on top of the app, then return to it.
 */
export function needsSystemAuth(url: string): boolean {
  return /^https:\/\/accounts\.google\.com\//i.test(url);
}

/** Android "intent://pay?…#Intent;scheme=upi;…;end" → "upi://pay?…" so the UPI app opens. */
export function intentToUrl(url: string): string {
  if (!url.startsWith('intent://')) return url;
  const scheme = /[#;]scheme=([^;]+)/.exec(url)?.[1];
  const body = url.slice('intent://'.length).split('#Intent')[0];
  return scheme ? `${scheme}://${body}` : url;
}

function intentFallback(url: string): string | undefined {
  const raw = /;S\.browser_fallback_url=([^;]+)/.exec(url)?.[1];
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return undefined;
  }
}

export type LinkRoute =
  /** load inside the app's web view */
  | { kind: 'web'; url: string }
  /** hand to another app on the phone; if that app is missing, `fallback` loads in the web view */
  | { kind: 'app'; url: string; fallback?: string }
  /** about:/data:/blob: — allowed only inside frames of a page */
  | { kind: 'frame'; url: string }
  /** Google sign-in sheet */
  | { kind: 'auth'; url: string };

/**
 * Where should this link go?
 *  - http(s) pages (incl. every subdomain, rzp.io, Razorpay, bank pages) → in-app web view
 *  - about:/data:/blob: → only inside a page's frames
 *  - "open in Chrome / Edge / Firefox" links → the same page, in-app
 *  - intent:// links that point to a web page → in-app
 *  - upi:, tel:, mailto:, whatsapp:, market: … → the phone's app
 */
export function routeLink(url: string): LinkRoute {
  if (needsSystemAuth(url)) return { kind: 'auth', url };
  if (isWebUrl(url)) return { kind: 'web', url };
  if (isFrameOnlyUrl(url)) return { kind: 'frame', url };

  // Links that try to push the page out to another browser app: keep the page here instead.
  const browser = /^(googlechromes?|microsoft-edge(-https?)?|firefox|opera-https?|brave|samsunginternet):\/\/(.*)$/i.exec(url);
  if (browser) {
    const rest = decodeURIComponentSafe(browser[3].replace(/^(open-url|navigate)\?url=/i, ''));
    if (/^https?:/i.test(rest)) return { kind: 'web', url: rest };
    const scheme = browser[1].toLowerCase();
    const secure = scheme !== 'googlechrome' && !scheme.endsWith('-http');
    return { kind: 'web', url: `${secure ? 'https' : 'http'}://${rest}` };
  }

  if (url.startsWith('intent://')) {
    const target = intentToUrl(url);
    const fallback = intentFallback(url);
    if (isWebUrl(target)) return { kind: 'web', url: target };
    return { kind: 'app', url: target, fallback };
  }

  if (/^market:\/\/details\?/i.test(url)) {
    return { kind: 'app', url, fallback: url.replace(/^market:\/\/details/i, 'https://play.google.com/store/apps/details') };
  }

  return { kind: 'app', url };
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Runs in every page of the in-app browser before the page's own code.
 *  - links with target="_blank" open in the same view (no new tab, no outside browser)
 *  - window.open(url) loads the page in the same view
 *  - window.open() with no address returns null, the standard "pop-up blocked" signal; Razorpay then
 *    shows bank / card OTP pages in the same view and returns to the page's callback URL
 */
export const KEEP_IN_APP_JS = `(function () {
  if (window.__tdtInApp) return;
  window.__tdtInApp = true;
  try {
    window.open = function (url) {
      if (!url || url === 'about:blank') return null;
      try { window.location.assign(new URL(String(url), window.location.href).href); } catch (e) { return null; }
      return window;
    };
  } catch (e) {}
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el) return;
    var t = (el.getAttribute('target') || '').toLowerCase();
    if (t && t !== '_self' && t !== '_top' && t !== '_parent') el.setAttribute('target', '_self');
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.getAttribute && f.getAttribute('target') === '_blank') f.setAttribute('target', '_self');
  }, true);
})();
true;`;
