// Shared helpers for The Divine Tarot app's edge functions.
export const SB_URL = Deno.env.get("SUPABASE_URL")!;
export const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** The signed-in user, checked with Supabase Auth (not just decoded). Anonymous sessions are refused. */
export async function requireUser(req: Request): Promise<{ id: string; email: string | null }> {
  const auth = req.headers.get("Authorization") || "";
  if (!/^Bearer .+/.test(auth)) throw new HttpError(401, "auth_required");
  const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_SERVICE, Authorization: auth } });
  if (!r.ok) throw new HttpError(401, "auth_required");
  const u = await r.json();
  if (!u?.id || u.is_anonymous) throw new HttpError(401, "auth_required");
  return { id: u.id, email: u.email ?? null };
}

/** PostgREST call with the service role (server only). */
export async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const headers: Record<string, string> = {
    apikey: SB_SERVICE,
    Authorization: `Bearer ${SB_SERVICE}`,
    "Content-Type": "application/json",
  };
  if (init.prefer) headers.Prefer = init.prefer;
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers });
  const text = await r.text();
  if (!r.ok) throw new Error(`db ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
