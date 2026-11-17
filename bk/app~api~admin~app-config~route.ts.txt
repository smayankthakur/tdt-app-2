import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminFrom } from "@/lib/adminAuth";
import { logActivity } from "@/lib/activity";
import { getAppConfig, saveAppConfig, validateAppConfig } from "@/lib/appConfig";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

const unauth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

// /admin → App Control: settings + the latest course orders from the app.
export async function GET(req: Request) {
  if (!(await adminFrom(req))) return unauth();
  const os = await db.collection("courseOrders").orderBy("createdAt", "desc").limit(150).get();
  return NextResponse.json({ config: await getAppConfig(true), courseOrders: os.docs.map((d) => d.data()) });
}

export async function PUT(req: Request) {
  const who = await adminFrom(req); if (!who) return unauth();
  const v = validateAppConfig(await req.json().catch(() => ({})));
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
  const c = v.cfg;
  await saveAppConfig(c, who);
  const on = (x: boolean) => (x ? "ON" : "OFF");
  await logActivity(who, "App Control save kiya",
    `Kundli ${on(c.kundli.enabled)} ₹${c.kundli.price} · Report ${on(c.reports.enabled)} ₹${c.reports.plans.standard.rupees}/${c.reports.plans.standard.days}d${c.reports.plans.standard.enabled ? "" : " OFF"}, ₹${c.reports.plans.express.rupees}/${c.reports.plans.express.days}d${c.reports.plans.express.enabled ? "" : " OFF"} · Courses ${on(c.courses.enabled)}: ${c.courses.list.map((x) => `${x.id} ₹${x.price}${x.enabled ? "" : " OFF"}`).join(", ")}`);
  return NextResponse.json({ ok: true, config: await getAppConfig(true) });
}
