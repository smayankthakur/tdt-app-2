// supabase/functions/_tdt/common.ts
var SB_URL = Deno.env.get("SUPABASE_URL");
function secretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return keys.default ?? Object.values(keys)[0] ?? "";
  } catch {
    return "";
  }
}
var SB_SERVICE = secretKey();
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var serviceHeaders = () => SB_SERVICE.startsWith("sb_") ? { apikey: SB_SERVICE, "Content-Type": "application/json" } : { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Type": "application/json" };
async function rest(path, init = {}) {
  const headers = serviceHeaders();
  if (init.prefer) headers.Prefer = init.prefer;
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers });
  const text = await r.text();
  if (!r.ok) throw new Error(`db ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
var rpc = (fn, args) => rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
async function authAdmin(method, path, body) {
  const r = await fetch(`${SB_URL}/auth/v1/admin/${path}`, { method, headers: serviceHeaders(), body: body ? JSON.stringify(body) : void 0 });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: r.ok, status: r.status, data };
}
async function requireUser(req) {
  const auth = req.headers.get("Authorization") || "";
  if (!/^Bearer .+/.test(auth)) throw new HttpError(401, "auth_required");
  const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_SERVICE, Authorization: auth } });
  if (r.status === 401 || r.status === 403) throw new HttpError(401, "auth_required");
  if (!r.ok) throw new HttpError(503, "auth_unavailable");
  const u = await r.json();
  if (!u?.id || u.is_anonymous) throw new HttpError(401, "auth_required");
  const link = await rest(`tdt_accounts?auth_user_id=eq.${u.id}&select=ginni_user_id`);
  if (!link?.[0]?.ginni_user_id) throw new HttpError(401, "auth_required");
  return { id: u.id, gid: link[0].ginni_user_id };
}

// supabase/functions/tdt-auth/index.ts
var WINDOW_MS = 15 * 6e4;
var MAX_PER_EMAIL = 10;
var MAX_PER_IP = 40;
var isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
async function rateLimit(key, max) {
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
async function ensureAuthUser(gid, email, name) {
  const link = await rest(`tdt_accounts?ginni_user_id=eq.${encodeURIComponent(gid)}&select=auth_user_id`);
  if (link?.[0]?.auth_user_id) return link[0].auth_user_id;
  let id;
  const created = await authAdmin("POST", "users", {
    email,
    email_confirm: true,
    password: randomPassword(),
    user_metadata: { name: name ?? "", source: "tdt-app" },
    app_metadata: { ginni_user_id: gid }
  });
  if (created.ok) id = created.data?.id;
  else if (created.status === 422 || created.status === 400) {
    const link2 = await authAdmin("POST", "generate_link", { type: "magiclink", email });
    id = link2.data?.id ?? link2.data?.user?.id;
  }
  if (!id) throw new Error(`auth_create_failed_${created.status}`);
  await rest("tdt_accounts?on_conflict=auth_user_id", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify([{ auth_user_id: id, ginni_user_id: gid }])
  });
  return id;
}
async function loginToken(authId, email) {
  const cur = await authAdmin("GET", `users/${authId}`);
  if (cur.ok && cur.data?.email !== email) {
    const upd = await authAdmin("PUT", `users/${authId}`, { email, email_confirm: true });
    if (!upd.ok) throw new Error(`auth_update_failed_${upd.status}`);
  }
  const link = await authAdmin("POST", "generate_link", { type: "magiclink", email });
  const hash = link.data?.properties?.hashed_token ?? link.data?.hashed_token;
  if (!link.ok || !hash) throw new Error(`auth_link_failed_${link.status}`);
  return hash;
}
async function changePassword(req, body) {
  const user = await requireUser(req);
  const current = String(body.password ?? "");
  const next = String(body.new_password ?? "");
  if (next.length < 8 || next.length > 200) throw new HttpError(400, "weak_password");
  await rateLimit(`chpw:${user.gid}`, MAX_PER_EMAIL);
  const acc = await rest(`User?id=eq.${encodeURIComponent(user.gid)}&select=email`);
  const email = String(acc?.[0]?.email ?? "").toLowerCase();
  if (!email || !(await rpc("tdt_check_password", { p_email: email, p_password: current }))?.[0]) throw new HttpError(400, "invalid_credentials");
  await rpc("tdt_set_password", { p_gid: user.gid, p_password: next });
  await fetch(`${SB_URL}/auth/v1/logout?scope=others`, {
    method: "POST",
    headers: { apikey: SB_SERVICE, Authorization: req.headers.get("Authorization") || "" }
  }).catch(() => {
  });
  return { ok: true };
}
var GINNI_SITE = "https://reading.thedivinetarotonline.com";
async function siteAccount(token) {
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token) || token.length > 2e3) throw new HttpError(400, "invalid_credentials");
  const r = await fetch(`${GINNI_SITE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }).catch(() => null);
  if (!r || !r.ok) throw new HttpError(503, "site_unavailable");
  const me = await r.json().catch(() => null);
  const email = String(me?.email ?? "").trim().toLowerCase();
  if (!me?.loggedIn || !isEmail(email)) throw new HttpError(400, "invalid_credentials");
  return { email, name: typeof me.name === "string" ? me.name : null };
}
async function mirrorUser(email, name) {
  const find = async () => (await rest(`User?email=eq.${encodeURIComponent(email)}&select=id,email,name&limit=1`))?.[0];
  let acc = await find();
  if (!acc) {
    try {
      await rpc("tdt_create_user", { p_email: email, p_password: randomPassword(), p_name: (name || email.split("@")[0]).slice(0, 120) });
    } catch (e) {
      if (!String(e).includes("already_registered") && !String(e).includes("23505")) throw e;
    }
    acc = await find();
  }
  if (!acc) throw new Error("mirror_user_missing");
  return { id: acc.id, email: String(acc.email).toLowerCase(), name: acc.name ?? name };
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "change_password") return json(await changePassword(req, body));
    if (body.action === "site") {
      const ip2 = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
      await rateLimit(`ip:${ip2}`, MAX_PER_IP);
      const site = await siteAccount(String(body.token ?? ""));
      const acc = await mirrorUser(site.email, site.name);
      const authId2 = await ensureAuthUser(acc.id, acc.email, acc.name);
      return json({ ok: true, email: acc.email, token_hash: await loginToken(authId2, acc.email), name: site.name ?? acc.name ?? "" });
    }
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!isEmail(email)) throw new HttpError(400, "invalid_email");
    if (password.length < 6 || password.length > 200) throw new HttpError(400, body.action === "signup" ? "weak_password" : "invalid_credentials");
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    await rateLimit(`ip:${ip}`, MAX_PER_IP);
    await rateLimit(`email:${email}`, MAX_PER_EMAIL);
    let account;
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
    return json({ ok: true, email: account.email, token_hash: await loginToken(authId, account.email), name: account.name ?? "" });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error("tdt-auth", e);
    return json({ ok: false, error: e instanceof HttpError ? e.message : "server_error" }, status);
  }
});
