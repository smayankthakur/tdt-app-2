import { AppsScriptUrl } from '@/constants/config';

/**
 * Calls the Google Apps Script web app (see apps-script/Code.gs).
 * text/plain body avoids a CORS pre-flight on web; Apps Script redirects once and fetch follows it.
 */
export async function callAppsScript<T = Record<string, unknown>>(action: string, payload: Record<string, unknown>): Promise<T> {
  if (!AppsScriptUrl) throw new Error('apps-script-not-configured');
  const res = await fetch(AppsScriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
    redirect: 'follow',
  });
  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('apps-script-bad-response');
  }
  if (json.ok === false) throw new Error(String(json.error ?? 'apps-script-error'));
  return json as T;
}

export const appsScriptConfigured = !!AppsScriptUrl;
