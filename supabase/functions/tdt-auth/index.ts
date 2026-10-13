// Supabase Edge Function: tdt-auth  (The Divine Tarot mobile app, on the Ginni website project)
// Log in / sign up with the SAME email + password as Ginni Ki Baatein (reading.thedivinetarotonline.com).
//
//   { action: "login",  email, password }        → { ok, email, password: <one-time app password> }
//   { action: "signup", name, email, password }  → same; also creates the website account
//
// The password is checked against the website's "User" table (bcrypt). The function then makes sure a matching
// Supabase Auth user exists (linked in tdt_accounts), gives it a fresh random one-time password, and returns it;
// the app signs in with that through Supabase Auth on the phone. The website password itself is never stored in
// Supabase Auth.
// Deploy WITHOUT JWT verification (nobody is logged in yet). Rate-limited per email and per IP.
import { authAdmin, CORS, HttpError, json, rest, rpc } from "../_tdt/common.ts";

const WINDOW_MS = 15 * 60_000;
const MAX_PER_EMAIL = 10;
const MAX_PER_IP = 40;
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

async function rateLimit(key: string, max: number) {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const rows = await rest(`tdt_login_attempts?key=eq.${encodeURIComponent(key)}&at=gt.${since}&select=id&limit=${max}`);
  if ((rows?.length ?? 0) >= max) throw new HttpError(429, "rate_limited");
  await rest("tdt_login_attempts", { method: "POST", prefer: "return=minimal", body: JSON.stringify([{ key }]) });
}

function randomPassword() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/[+/=]/g, "x");
}

/** The Supabase Auth user linked to this website account (created on first app login). */
async function ensureAuthUser(gid: string, email: string, name: string | null): Promise<string> {
  const link = await rest(`tdt_accounts?ginni_user_id=eq.${encodeURIComponent(gid)}&select=auth_user_id`);
  if (link?.[0]?.auth_user_id) return link[0].auth_user_id;

  let id: string | undefined;
  const created = await authAdmin("POST", "users", {
    email,
    email_confirm: true,
    password: randomPassword(),
    user_metadata: { name: name ?? "", source: "tdt-app" },
    app_metadata: { ginni_user_id: gid },
  });
  if (created.ok) id = created.data?.id;
  else if (created.status === 422 || created.status === 400) {
    // An Auth user with this email already exists: look it up without sending any e-mail.
    const link2 = await authAdmin("POST", "generate_link", { type: "magiclink", email });
    id = link2.data?.id ?? link2.data?.user?.id;
  }
  if (!id) throw new Error(`auth_create_failed_${created.status}`);
  await rest("tdt_accounts?on_conflict=auth_user_id", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify([{ auth_user_id: id, ginni_user_id: gid }]),
  });
  return id;
}

async function oneTimePassword(authId: string, email: string) {
  const pw = randomPassword();
  // Also copies the website email, in case the user changed it on the website since their last app login.
  const r = await authAdmin("PUT", `users/${authId}`, { email, password: pw, email_confirm: true });
  if (!r.ok) throw new Error(`auth_update_failed_${r.status}`);
  return pw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!isEmail(email)) throw new HttpError(400, "invalid_email");
    if (password.length < 6 || password.length > 200) throw new HttpError(400, body.action === "signup" ? "weak_password" : "invalid_credentials");

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    await rateLimit(`ip:${ip}`, MAX_PER_IP);
    await rateLimit(`email:${email}`, MAX_PER_EMAIL);

    let account: { id: string; email: string; name: string | null } | undefined;
    if (body.action === "signup") {
      const name = String(body.name ?? "").trim().slice(0, 120);
      if (name.length < 2) throw new HttpError(400, "name_required");
      try {
        await rpc("tdt_create_user", { p_email: email, p_password: password, p_name: name });
      } catch (e) {
        if (String(e).includes("already_registered") || String(e).includes("23505")) throw new HttpError(409, "already_registered");
        throw e;
      }
      account = (await rpc("tdt_check_password", { p_email: email, p_password: password }))?.[0];
    } else if (body.action === "login") {
      account = (await rpc("tdt_check_password", { p_email: email, p_password: password }))?.[0];
      if (!account) throw new HttpError(400, "invalid_credentials");
    } else {
      throw new HttpError(400, "unknown_action");
    }
    if (!account) throw new Error("account_missing_after_signup");

    const authId = await ensureAuthUser(account.id, account.email, account.name);
    return json({ ok: true, email: account.email, password: await oneTimePassword(authId, account.email), name: account.name ?? "" });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error("tdt-auth", e);
    return json({ ok: false, error: e instanceof HttpError ? e.message : "server_error" }, status);
  }
});
