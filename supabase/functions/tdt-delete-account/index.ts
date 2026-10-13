// Supabase Edge Function: tdt-delete-account  (The Divine Tarot mobile app, on the Ginni website project)
// Deletes the signed-in user's account. The app account IS the Ginni website account, so:
//   - the website account ("User") is deleted with its chats and reset tokens; if it has payment orders
//     (which must be kept for accounts), the account is anonymised instead (email, password, name, chats removed);
//   - the Supabase Auth user is deleted, which removes all tdt_* app data (cascade). tdt_payments keeps the sale.
// Deploy WITH JWT verification.
import { authAdmin, CORS, HttpError, json, requireUser, rest } from "../_tdt/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const user = await requireUser(req);
    const gid = encodeURIComponent(user.gid);
    const orders = await rest(`Order?userId=eq.${gid}&select=id&limit=1`);
    if (orders?.length) {
      await rest(`ChatMessage?userId=eq.${gid}`, { method: "DELETE", prefer: "return=minimal" });
      await rest(`PasswordResetToken?userId=eq.${gid}`, { method: "DELETE", prefer: "return=minimal" });
      await rest(`User?id=eq.${gid}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({ email: `deleted-${user.gid}@deleted.invalid`, passwordHash: "!account-deleted", name: null }),
      });
    } else {
      await rest(`User?id=eq.${gid}`, { method: "DELETE", prefer: "return=minimal" });
    }
    const r = await authAdmin("DELETE", `users/${user.id}`);
    if (!r.ok && r.status !== 404) throw new Error(`delete_failed_${r.status}`);
    return json({ ok: true });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error("tdt-delete-account", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, status);
  }
});
