import { NextResponse } from 'next/server';
import { getAppControl } from '@/lib/appControl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The booking admin's App Control settings for this site's pages (same origin, so the CSP stays tight).
export async function GET() {
  return NextResponse.json(await getAppControl(), { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=30' } });
}
