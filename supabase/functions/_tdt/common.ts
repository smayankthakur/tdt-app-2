// Shared helpers for The Divine Tarot app's functions on the Ginni website project (ginni2).
export const SB_URL = Deno.env.get("SUPABASE_URL")!;
export const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const serviceHeaders = () => ({ apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Type": "application/json" });

/** PostgREST with the service role (server only). */
export async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const headers: Record<string, string> = serviceHeaders();
  if (init.prefer) headers.Prefer = init.prefer;
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers });
  const text = await r.text();
  if (!r.ok) throw new Error(`db ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

export const rpc = (fn: string, args: Record<string, unknown>) => rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });

/** Supabase Auth admin API (server only). */
export async function authAdmin(method: string, path: string, body?: unknown) {
  const r = await fetch(`${SB_URL}/auth/v1/admin/${path}`, { method, headers: serviceHeaders(), body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: r.ok, status: r.status, data };
}

/** The signed-in app user (checked with Supabase Auth) and their Ginni website account id. */
export async function requireUser(req: Request): Promise<{ id: string; gid: string }> {
  const auth = req.headers.get("Authorization") || "";
  if (!/^Bearer .+/.test(auth)) throw new HttpError(401, "auth_required");
  const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_SERVICE, Authorization: auth } });
  // Only a definite "not valid" means auth_required (the app then signs out); outages are temporary.
  if (r.status === 401 || r.status === 403) throw new HttpError(401, "auth_required");
  if (!r.ok) throw new HttpError(503, "auth_unavailable");
  const u = await r.json();
  if (!u?.id || u.is_anonymous) throw new HttpError(401, "auth_required");
  const link = await rest(`tdt_accounts?auth_user_id=eq.${u.id}&select=ginni_user_id`);
  if (!link?.[0]?.ginni_user_id) throw new HttpError(401, "auth_required");
  return { id: u.id, gid: link[0].ginni_user_id };
}
