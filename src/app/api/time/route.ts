import { NextRequest, NextResponse } from 'next/server';
import { getAuthoritativeUtc, todayInTimezone, safeTz } from '@/lib/time/serverTime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const tz = safeTz(req.nextUrl.searchParams.get('tz'));
  const utc = await getAuthoritativeUtc();
  return NextResponse.json({ utc, tz, today: todayInTimezone(utc, tz) });
}
