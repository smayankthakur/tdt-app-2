import { NextResponse } from "next/server";
import { publicPricing } from "@/lib/pricing";
import { ALL_TIERS, TIER_INFO, bookingClosed, sessionText, whenText, type Tier } from "@/lib/slots";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

// Mobile app: every reading switched ON in /admin → Prices & Offers, in the website's order (components/Landing.tsx),
// with its price / offer and what the reading is. The app builds its Booking screen from this list, so a reading
// switched on, re-priced or added here shows up in the app without an app update. Public: nothing secret in it.
const ORDER: Tier[] = ["call", "callurgent", "f2f", "written", "writtenurgent", "standard", "q3", "video", "urgent", "q3urgent"];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

export async function GET() {
  const pub = await publicPricing();
  const order = [...ORDER, ...ALL_TIERS.filter((t) => !ORDER.includes(t))];
  const readings = order.filter((t) => pub[t]?.enabled).map((tier) => {
    const i = TIER_INFO[tier], p = pub[tier];
    return {
      tier, name: i.name, badge: i.badge, mins: i.mins, urgent: i.urgent, questions: i.questions, video: i.video, written: i.written,
      place: i.place || null, withinHours: i.withinHours || null, bookHours: i.bookHours || null,
      when: whenText(tier), session: sessionText(tier), closed: bookingClosed(tier) || null,
      regular: p.regular, price: p.price, offerName: p.offerName, offerUntil: p.offerUntil,
    };
  });
  return NextResponse.json({ readings }, { headers: { ...CORS, "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60" } });
}
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
