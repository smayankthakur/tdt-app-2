// Supabase Edge Function: tdt-delete-account  (The Divine Tarot mobile app, on the Ginni website project)
// Deletes the signed-in user's account. The app account IS the Ginni website account, so:
//   - the website account's chats and reset tokens are deleted, then the "User" row itself; if it has payment orders
//     (kept for accounts) or other rows point at it, it is anonymised instead (email, password and name removed);
//   - the Supabase Auth user is deleted, which removes all tdt_* app data (cascade). tdt_payments keeps the sale.
// requireUser() checks the login with Supabase Auth, so the legacy "Verify JWT" switch can stay off.
import { authAdmin, CORS, HttpError, json, requireUser, rest } from "../_tdt/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const user = await requireUser(req);
    const gid = encodeURIComponent(user.gid);
    await rest(`ChatMessage?userId=eq.${gid}`, { method: "DELETE", prefer: "return=minimal" });
    await rest(`PasswordResetToken?userId=eq.${gid}`, { method: "DELETE", prefer: "return=minimal" });
    const orders = await rest(`Order?userId=eq.${gid}&select=id&limit=1`);
    let deleted = false;
    if (!orders?.length) {
      // Fails if other website rows still point at this account (e.g. people they referred) — then anonymise.
      deleted = await rest(`User?id=eq.${gid}`, { method: "DELETE", prefer: "return=minimal" }).then(() => true, (e) => {
        console.warn("tdt-delete-account: anonymising instead", String(e));
        return false;
      });
    }
    if (!deleted) {
      await rest(`User?id=eq.${gid}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({ email: `deleted-${user.gid}@deleted.invalid`, passwordHash: "!account-deleted", name: null }),
      });
    }
    const r = await authAdmin("DELETE", `users/${user.id}`);
    if (!r.ok && r.status !== 404) throw new Error(`delete_failed_${r.status}`);
    return json({ ok: true });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error("tdt-delete-account", e);
    return json({ ok: false, error: e instanceof HttpError ? e.message : "server_error" }, status);
  }
});
