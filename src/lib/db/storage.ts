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

function getDB() {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, newVersion, tx) {
        const target = newVersion ?? DB_VERSION;
        // Run every pending migration in order. Each receives the same upgrade
        // transaction `tx`, so all step writes commit (or roll back) atomically.
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
            throw e; // abort the upgrade transaction; user data stays at oldVersion
          }
        }
      },
      blocked() {
        console.warn('[IDB] upgrade blocked by another open connection in this browser');
      },
      blocking() {
        // Another tab is trying to upgrade. Close so it can proceed; the caller
        // will reopen lazily on next access.
        dbPromise = null;
      },
      terminated() {
        console.warn('[IDB] connection terminated unexpectedly');
        dbPromise = null;
      },
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
let _channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!_channel) _channel = new BroadcastChannel(CHANNEL_NAME);
  return _channel;
}

function broadcast(msg: SyncMessage) {
  try { getChannel()?.postMessage(msg); } catch { /* ignore — best effort */ }
}

export function subscribeToSync(handler: (msg: SyncMessage) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const listener = (e: MessageEvent<SyncMessage>) => handler(e.data);
  ch.addEventListener('message', listener);
  return () => ch.removeEventListener('message', listener);
}
