import { NextResponse } from 'next/server';
import { getAuthoritativeUtc, serverToday, latestPlayableDate, BASE_TZ } from '@/lib/time/serverTime';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Server controls the timezone for gating. Client tz parameter is intentionally
  // ignored here — it used to be honored but allowed a trivial bypass where
  // a client passed `tz=Pacific/Kiritimati` to unlock tomorrow's puzzle.
  const utc    = await getAuthoritativeUtc();
  const today  = serverToday(utc);
  const latest = latestPlayableDate(utc);
  return NextResponse.json({ utc, baseTz: BASE_TZ, today, latest });
}
