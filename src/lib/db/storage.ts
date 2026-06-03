'use client';

import { openDB, type IDBPDatabase, type IDBPTransaction } from 'idb';
import type { HistoryRecord } from '@/types/game';
import type { Difficulty } from '@/types/puzzle';

const DB_NAME = 'detective-bureau';
// Bump this when adding a new entry to `migrations` below.
const DB_VERSION = 1;

type UpgradeTx = IDBPTransaction<unknown, string[], 'versionchange'>;
type Migration = (db: IDBPDatabase, tx: UpgradeTx) => void | Promise<void>;

// Each entry migrates the database FROM index i TO i+1. v0 is "fresh install".
// IMPORTANT: never call `db.deleteObjectStore` on user data unless the data is
// being moved into another store. Old user data must always survive an upgrade.
// When adding a new migration:
//   1. Append the migration function to this array.
//   2. Increment DB_VERSION by 1.
//   3. If renaming/moving stores, COPY old → new inside the migration's `tx`,
//      then delete the old store only after all writes succeed.
const migrations: Migration[] = [
  // v0 → v1: initial schema (history + gameStates)
  (db) => {
    if (!db.objectStoreNames.contains('history')) {
      db.createObjectStore('history', { keyPath: 'date' });
    }
    if (!db.objectStoreNames.contains('gameStates')) {
      db.createObjectStore('gameStates', { keyPath: 'key' });
    }
  },
  // Future migrations go here. Examples:
  //
  // v1 → v2: add `hintCount` field to all gameStates (default 0)
  // async (db, tx) => {
  //   const store = tx.objectStore('gameStates');
  //   for await (const cursor of store) {
  //     if (typeof cursor.value.hintCount !== 'number') {
  //       await cursor.update({ ...cursor.value, hintCount: 0 });
  //     }
  //   }
  // },
  //
  // v2 → v3: split history per-difficulty for future cross-device sync
  // async (db, tx) => {
  //   if (!db.objectStoreNames.contains('completions')) {
  //     db.createObjectStore('completions', { keyPath: 'id' });
  //   }
  //   const old = tx.objectStore('history');
  //   const next = tx.objectStore('completions');
  //   for await (const c of old) {
  //     const r = c.value as HistoryRecord;
  //     for (const d of ['easy','medium','hard'] as const) {
  //       if (r[d]) await next.put({ id: `${r.date}__${d}`, date: r.date, difficulty: d, ...r[d] });
  //     }
  //   }
  //   // KEEP `history` store around for one more version as fallback before deletion.
  // },
];

let dbPromise: Promise<IDBPDatabase> | null = null;

// Storage health — set on first failed IDB open (Safari private mode, disabled
// IDB, quota exceeded, etc.). UI can read via getStorageStatus() to surface a
// friendly warning instead of silently losing data.
type StorageStatus = { ok: true } | { ok: false; reason: string };
let _storageStatus: StorageStatus = { ok: true };
const _storageStatusListeners = new Set<(s: StorageStatus) => void>();

export function getStorageStatus(): StorageStatus { return _storageStatus; }
export function onStorageStatusChange(cb: (s: StorageStatus) => void): () => void {
  _storageStatusListeners.add(cb);
  return () => _storageStatusListeners.delete(cb);
}
function setStorageFailure(reason: string) {
  if (_storageStatus.ok) {
    _storageStatus = { ok: false, reason };
    _storageStatusListeners.forEach(cb => { try { cb(_storageStatus); } catch { /* ignore */ } });
  }
}

function getDB() {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (typeof indexedDB === 'undefined') {
    setStorageFailure('当前浏览器不支持本地存储（IndexedDB）');
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, newVersion, tx) {
        const target = newVersion ?? DB_VERSION;
        for (let v = oldVersion; v < target; v++) {
          const step = migrations[v];
          if (!step) {
            console.warn(`[IDB] No migration for v${v} → v${v + 1}; skipping`);
            continue;
          }
          try {
            await step(db, tx as UpgradeTx);
          } catch (e) {
            console.error(`[IDB] Migration v${v} → v${v + 1} failed:`, e);
            throw e;
          }
        }
      },
      blocked() {
        console.warn('[IDB] upgrade blocked by another open connection in this browser');
      },
      blocking() {
        dbPromise = null;
      },
      terminated() {
        console.warn('[IDB] connection terminated unexpectedly');
        dbPromise = null;
      },
    }).catch(err => {
      // Common Safari private-mode + iOS storage-disabled error path
      const msg = (err && err.name === 'InvalidStateError')
        ? '本地存储不可用，可能是隐私 / 无痕浏览模式'
        : `本地存储初始化失败：${err?.message ?? '未知错误'}`;
      setStorageFailure(msg);
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

// ---- public API ----

export async function getAllHistory(): Promise<Record<string, HistoryRecord>> {
  const db = await getDB();
  const records: HistoryRecord[] = await db.getAll('history');
  const result: Record<string, HistoryRecord> = {};
  for (const r of records) result[r.date] = r;
  return result;
}

export async function saveHistoryRecord(record: HistoryRecord): Promise<void> {
  const db = await getDB();
  await db.put('history', record);
  broadcast({ kind: 'history', date: record.date });
}

export async function deleteHistoryRecord(date: string): Promise<void> {
  const db = await getDB();
  await db.delete('history', date);
  broadcast({ kind: 'history', date });
}

interface PersistedState {
  key: string;
  cells: Record<string, string>;
  manualCells: Record<string, string>;
  // Optimistic lock: incremented on every write. Concurrent writers compare
  // and abort if their base version is stale.
  version?: number;
}

export async function saveGameState(
  date: string,
  difficulty: Difficulty,
  cells: Record<string, string>,
  manualCells: Record<string, string>,
): Promise<void> {
  const db = await getDB();
  const key = `${date}__${difficulty}`;
  // Optimistic locking inside a single transaction: read current, bump version,
  // write back. Another tab racing the same write will see a higher version
  // and its handler will reload from IDB rather than overwrite our work.
  const tx = db.transaction('gameStates', 'readwrite');
  const cur = (await tx.store.get(key)) as PersistedState | undefined;
  const nextVersion = (cur?.version ?? 0) + 1;
  await tx.store.put({ key, cells, manualCells, version: nextVersion });
  await tx.done;
  broadcast({ kind: 'gameState', date, difficulty, version: nextVersion });
}

export async function loadGameState(
  date: string,
  difficulty: Difficulty
): Promise<PersistedState | undefined> {
  const db = await getDB();
  return db.get('gameStates', `${date}__${difficulty}`);
}

export async function deleteGameState(date: string, difficulty: Difficulty): Promise<void> {
  const db = await getDB();
  await db.delete('gameStates', `${date}__${difficulty}`);
  broadcast({ kind: 'gameState', date, difficulty, version: 0 });
}

// ---- cross-tab synchronization ----

export type SyncMessage =
  | { kind: 'gameState'; date: string; difficulty: Difficulty; version: number }
  | { kind: 'history'; date: string };

const CHANNEL_NAME = 'detective-bureau-sync';
const LS_FALLBACK_KEY = 'detective-bureau-sync-ls';
let _channel: BroadcastChannel | null = null;

function hasBroadcastChannel(): boolean {
  return typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined';
}

function getChannel(): BroadcastChannel | null {
  if (!hasBroadcastChannel()) return null;
  if (!_channel) {
    try { _channel = new BroadcastChannel(CHANNEL_NAME); }
    catch { return null; }
  }
  return _channel;
}

function broadcast(msg: SyncMessage) {
  const ch = getChannel();
  if (ch) {
    try { ch.postMessage(msg); return; } catch { /* fall through to LS */ }
  }
  // Fallback for Safari < 15.4 and other browsers without BroadcastChannel:
  // write to localStorage and immediately clear; other tabs receive a `storage`
  // event regardless. Wrap the message with a timestamp so identical successive
  // writes still fire the event.
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify({ ts: Date.now(), msg }));
    localStorage.removeItem(LS_FALLBACK_KEY);
  } catch { /* private mode etc. — best effort */ }
}

export function subscribeToSync(handler: (msg: SyncMessage) => void): () => void {
  const ch = getChannel();
  if (ch) {
    const listener = (e: MessageEvent<SyncMessage>) => handler(e.data);
    ch.addEventListener('message', listener);
    return () => ch.removeEventListener('message', listener);
  }
  if (typeof window === 'undefined') return () => {};
  // Storage event fallback
  const onStorage = (e: StorageEvent) => {
    if (e.key !== LS_FALLBACK_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue) as { ts: number; msg: SyncMessage };
      handler(parsed.msg);
    } catch { /* ignore malformed */ }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
