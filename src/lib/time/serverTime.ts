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
