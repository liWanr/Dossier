import { getTursoClient } from './tursoDb';
import type { Puzzle, DailyPuzzles } from '@/types/puzzle';

// Internal: returns full puzzles WITH solution (server-side use only — never expose to client)
export async function getPuzzlesByDateInternal(date: string): Promise<DailyPuzzles | null> {
  const client = getTursoClient();
  const result = await client.execute({
    sql: 'SELECT difficulty, data FROM puzzles WHERE date = ?',
    args: [date],
  });

  const rows = result.rows as unknown as { difficulty: string; data: string }[];

  if (rows.length < 3) return null;

  const record: Record<string, unknown> = { date };
  for (const row of rows) record[row.difficulty] = JSON.parse(row.data);

  if (!record.easy || !record.medium || !record.hard) return null;
  return record as unknown as DailyPuzzles;
}

// Strip solution; hoist primaryCategoryId as top-level field for client-side completion check.
function sanitizePuzzle(p: Puzzle): Puzzle {
  const { solution, ...rest } = p;
  return { ...rest, primaryCategoryId: solution?.primaryCategoryId };
}

// Public: sanitized puzzles for client API responses
export async function getPuzzlesByDate(date: string): Promise<DailyPuzzles | null> {
  const full = await getPuzzlesByDateInternal(date);
  if (!full) return null;
  return {
    date: full.date,
    easy: sanitizePuzzle(full.easy),
    medium: sanitizePuzzle(full.medium),
    hard: sanitizePuzzle(full.hard),
  };
}

export async function getLatestDate(): Promise<string | null> {
  const client = getTursoClient();
  const result = await client.execute(
    'SELECT DISTINCT date FROM puzzles ORDER BY date DESC LIMIT 1'
  );
  
  const row = result.rows[0] as unknown as { date: string } | undefined;
  return row?.date ?? null;
}

export async function insertPuzzle(date: string, difficulty: string, puzzle: Puzzle): Promise<void> {
  const client = getTursoClient();
  await client.execute({
    sql: 'INSERT OR REPLACE INTO puzzles (date, difficulty, data) VALUES (?, ?, ?)',
    args: [date, difficulty, JSON.stringify(puzzle)],
  });
}
