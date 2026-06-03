// 权威时间源：优先用第三方公共 HTTP Date 头（Cloudflare）
// 缓存 5 分钟，缓存内用单调时间增量计算当前 UTC，避开本地系统时钟漂移。
// 全部失败时回退到 Date.now()。

let cached: { utc: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 2000;

async function fetchExternalUtc(): Promise<number | null> {
  const sources = [
    'https://www.cloudflare.com/cdn-cgi/trace',
    'https://www.google.com/generate_204',
  ];
  for (const url of sources) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const r = await fetch(url, { method: 'HEAD', signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
      const dateHeader = r.headers.get('date');
      if (!dateHeader) continue;
      const ms = Date.parse(dateHeader);
      if (!Number.isNaN(ms)) return ms;
    } catch {
      // try next
    }
  }
  return null;
}

export async function getAuthoritativeUtc(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.utc + (Date.now() - cached.fetchedAt);
  }
  const ext = await fetchExternalUtc();
  const now = Date.now();
  if (ext != null) {
    cached = { utc: ext, fetchedAt: now };
    return ext;
  }
  // 没拿到外部权威，用服务器时钟兜底（仍然比客户端可靠：NTP 同步，集中可控）
  return now;
}

// 在指定 IANA 时区内对 UTC 毫秒计算"今天"的 YYYY-MM-DD
export function todayInTimezone(utcMs: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(utcMs));
  } catch {
    return new Date(utcMs).toISOString().slice(0, 10);
  }
}

// 校验 IANA 时区字符串；非法则返回 'UTC'
export function safeTz(tz: string | null): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return 'UTC';
  }
}

// ---- Date gating ------------------------------------------------------------
//
// The "today" that decides which puzzles are unlocked is computed SERVER-SIDE
// against a fixed timezone — never trusting the client's tz parameter.
// A safety window lets users in earlier timezones (e.g. UTC-10 Hawaii) play the
// new puzzle a few hours before midnight Asia/Shanghai.

export const BASE_TZ = 'Asia/Shanghai';
const SAFETY_WINDOW_HOURS = 6;

// Hard cap on how many days past "today" any puzzle can ever be served by the
// API. Set via env var `PUZZLE_MAX_DAYS_AHEAD` (default 1). This is defense in
// depth on top of `latestPlayableDate`: even if BASE_TZ + safety-window math
// drifts or is bypassed, the API still refuses dates beyond this many days
// from server "today" in BASE_TZ.
const MAX_DAYS_AHEAD = (() => {
  const raw = parseInt(process.env.PUZZLE_MAX_DAYS_AHEAD ?? '1', 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : 1;
})();

function addDaysInBaseTz(dateStr: string, days: number): string {
  // dateStr is YYYY-MM-DD in BASE_TZ. Convert via local midnight + offset.
  // Safe approximation: parse YYYY-MM-DD as a UTC date, add `days * 86400_000`,
  // then format back. BASE_TZ shifts are constant 8h so day boundaries align.
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Latest date (YYYY-MM-DD in BASE_TZ) the player is allowed to access right now.
 * = min( today-in-base + safety-window-hours, today-in-base + MAX_DAYS_AHEAD )
 */
export function latestPlayableDate(utcMs: number): string {
  const safety = todayInTimezone(utcMs + SAFETY_WINDOW_HOURS * 3600_000, BASE_TZ);
  const today  = todayInTimezone(utcMs, BASE_TZ);
  const hardCap = addDaysInBaseTz(today, MAX_DAYS_AHEAD);
  return safety < hardCap ? safety : hardCap;
}

/** Date the server considers "today" right now (no safety window). */
export function serverToday(utcMs: number): string {
  return todayInTimezone(utcMs, BASE_TZ);
}
