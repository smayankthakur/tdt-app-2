// Supabase Edge Function: app-delete-account  (The Divine Tarot mobile app)
// Deletes the signed-in user's account. app_profiles, app_readings, app_entitlements, ginni_access and the
// other per-user rows go with it (ON DELETE CASCADE); app_payments keeps the sales record with user_id = null.
// This is the same login as Ginni on the web, so that login is removed too.
// Deploy WITH JWT verification ON.
import { CORS, HttpError, json, requireUser, SB_SERVICE, SB_URL } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const user = await requireUser(req);
    const r = await fetch(`${SB_URL}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` },
    });
    if (!r.ok) throw new Error(`delete_failed_${r.status}: ${(await r.text()).slice(0, 200)}`);
    return json({ ok: true });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error("app-delete-account", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, status);
  }
});
