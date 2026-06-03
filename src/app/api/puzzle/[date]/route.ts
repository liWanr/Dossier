import { NextRequest, NextResponse } from 'next/server';
import { getPuzzlesByDate, getLatestDate } from '@/lib/db/puzzleDb';
import { getAuthoritativeUtc, todayInTimezone, safeTz } from '@/lib/time/serverTime';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  let { date } = await params;
  const tz = safeTz(req.nextUrl.searchParams.get('tz'));
  const utc = await getAuthoritativeUtc();
  const today = todayInTimezone(utc, tz);

  if (date === 'today') date = today;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  // 未来日期：不在用户所在时区"今天"之前/等于的，全部锁定
  if (date > today) {
    return NextResponse.json({ error: 'locked', today, tz }, { status: 403 });
  }

  let puzzles = getPuzzlesByDate(date);

  if (!puzzles) {
    // 数据库没有这一天（例如还没生成到这里）—— 回退到最近一次有题且不超过 today 的日期
    const latest = getLatestDate();
    if (!latest) return NextResponse.json({ error: 'No puzzle available' }, { status: 404 });
    const fallback = latest > today ? today : latest;
    puzzles = getPuzzlesByDate(fallback);
    if (!puzzles) return NextResponse.json({ error: 'No puzzle available' }, { status: 404 });
  }

  return NextResponse.json({ ...puzzles, today, tz });
}
