import { NextResponse } from "next/server";
import { getAppConfig, publicAppConfig } from "@/lib/appConfig";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

// Public: what /admin → App Control switched on / off and priced. Read by the mobile app and by
// thedivinetarotonline.com (reports + Kundli Milan pages and their order APIs). Nothing secret in it.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

export async function GET() {
  const c = await getAppConfig();
  return NextResponse.json(publicAppConfig(c), { headers: { ...CORS, "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60" } });
}
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
