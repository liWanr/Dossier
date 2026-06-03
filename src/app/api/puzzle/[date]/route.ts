import { NextRequest, NextResponse } from 'next/server';
import { getPuzzlesByDate, getLatestDate } from '@/lib/db/puzzleDb';
import { getAuthoritativeUtc, latestPlayableDate, serverToday, BASE_TZ } from '@/lib/time/serverTime';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  let { date } = await params;
  const utc = await getAuthoritativeUtc();
  // Server-controlled "today" — never trust the client tz parameter for gating.
  // BASE_TZ is fixed to Asia/Shanghai; safety window lets earlier timezones
  // unlock the next day's puzzle a few hours before midnight in BASE_TZ.
  const today  = serverToday(utc);
  const latest = latestPlayableDate(utc);

  if (date === 'today') date = today;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  // Anything past the latest playable date (today + safety window) is locked,
  // regardless of what the client claims its timezone is.
  if (date > latest) {
    return NextResponse.json(
      { error: 'locked', today, latest, baseTz: BASE_TZ },
      { status: 403 }
    );
  }

  let puzzles = await getPuzzlesByDate(date);

  if (!puzzles) {
    // Fallback to the most recent available puzzle that is also within the
    // latest playable date.
    const dbLatest = await getLatestDate();
    if (!dbLatest) return NextResponse.json({ error: 'No puzzle available' }, { status: 404 });
    const fallback = dbLatest > latest ? latest : dbLatest;
    puzzles = await getPuzzlesByDate(fallback);
    if (!puzzles) return NextResponse.json({ error: 'No puzzle available' }, { status: 404 });
  }

  return NextResponse.json({ ...puzzles, today, latest, baseTz: BASE_TZ });
}
