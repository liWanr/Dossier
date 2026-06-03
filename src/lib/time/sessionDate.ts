'use client';

// "Active puzzle date" — the date the player STARTED their current session on.
// Locked in sessionStorage so midnight crossings don't switch the puzzle out
// from under them. Per-tab so opening a new tab gets a fresh "today" check.

const KEY = 'active-puzzle-date';
const EXPIRY_KEY = 'active-puzzle-date-expires-at';
// 18h gives "night owl" margin without keeping the date forever — if the tab
// has been idle for almost a day, treat it as a new session and re-fetch today.
const TTL_MS = 18 * 60 * 60 * 1000;

function isValidDate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function getActiveDate(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const date = sessionStorage.getItem(KEY);
    const exp = parseInt(sessionStorage.getItem(EXPIRY_KEY) ?? '0', 10);
    if (!isValidDate(date)) return null;
    if (!Number.isFinite(exp) || exp <= Date.now()) {
      // expired — drop it
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem(EXPIRY_KEY);
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

export function setActiveDate(date: string): void {
  if (typeof window === 'undefined' || !isValidDate(date)) return;
  try {
    sessionStorage.setItem(KEY, date);
    sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS));
  } catch { /* quota / private mode — ignore */ }
}

export function clearActiveDate(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
  } catch { /* ignore */ }
}
