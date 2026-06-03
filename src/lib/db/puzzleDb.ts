import Database from 'better-sqlite3';
import path from 'path';
import type { Puzzle, DailyPuzzles } from '@/types/puzzle';

const DB_PATH = path.join(process.cwd(), 'data', 'puzzles.db');

let _db: ReturnType<typeof Database> | null = null;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.exec(`
      CREATE TABLE IF NOT EXISTS puzzles (
        date       TEXT NOT NULL,
        difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
        data       TEXT NOT NULL,
        PRIMARY KEY (date, difficulty)
      )
    `);
  }
  return _db;
}

// Internal: returns full puzzles WITH solution (server-side use only — never expose to client)
export function getPuzzlesByDateInternal(date: string): DailyPuzzles | null {
  const rows = getDb()
    .prepare('SELECT difficulty, data FROM puzzles WHERE date = ?')
    .all(date) as { difficulty: string; data: string }[];

  if (rows.length < 3) return null;

  const result: Record<string, unknown> = { date };
  for (const row of rows) result[row.difficulty] = JSON.parse(row.data);

  if (!result.easy || !result.medium || !result.hard) return null;
  return result as unknown as DailyPuzzles;
}

// Strip solution; hoist primaryCategoryId as top-level field for client-side completion check.
function sanitizePuzzle(p: Puzzle): Puzzle {
  const { solution, ...rest } = p;
  return { ...rest, primaryCategoryId: solution?.primaryCategoryId };
}

// Public: sanitized puzzles for client API responses
export function getPuzzlesByDate(date: string): DailyPuzzles | null {
  const full = getPuzzlesByDateInternal(date);
  if (!full) return null;
  return {
    date: full.date,
    easy: sanitizePuzzle(full.easy),
    medium: sanitizePuzzle(full.medium),
    hard: sanitizePuzzle(full.hard),
  };
}

export function getLatestDate(): string | null {
  const row = getDb()
    .prepare('SELECT DISTINCT date FROM puzzles ORDER BY date DESC LIMIT 1')
    .get() as { date: string } | undefined;
  return row?.date ?? null;
}

export function insertPuzzle(date: string, difficulty: string, puzzle: Puzzle): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO puzzles (date, difficulty, data) VALUES (?, ?, ?)')
    .run(date, difficulty, JSON.stringify(puzzle));
}
