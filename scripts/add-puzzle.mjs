/**
 * Add a new daily puzzle set to the database.
 *
 * Usage:
 *   node scripts/add-puzzle.mjs <path-to-puzzle.json>
 *
 * The JSON file must contain { date, easy, medium, hard } where each
 * difficulty is a full Puzzle object (matching src/types/puzzle.ts).
 *
 * Example:
 *   node scripts/add-puzzle.mjs puzzles/2026-06-03.json
 */
import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '..', 'data');
const DB_PATH   = join(DATA_DIR, 'puzzles.db');

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/add-puzzle.mjs <path-to-puzzle.json>');
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(readFileSync(resolve(arg), 'utf8'));
} catch (e) {
  console.error('Failed to read/parse JSON:', e.message);
  process.exit(1);
}

const { date, easy, medium, hard } = payload;
if (!date || !easy || !medium || !hard) {
  console.error('JSON must have top-level keys: date, easy, medium, hard');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('date must be YYYY-MM-DD');
  process.exit(1);
}

mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS puzzles (
    date       TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
    data       TEXT NOT NULL,
    PRIMARY KEY (date, difficulty)
  )
`);

const insert = db.prepare('INSERT OR REPLACE INTO puzzles (date, difficulty, data) VALUES (?, ?, ?)');
const run = db.transaction(() => {
  insert.run(date, 'easy',   JSON.stringify({ ...easy,   date, difficulty: 'easy'   }));
  insert.run(date, 'medium', JSON.stringify({ ...medium, date, difficulty: 'medium' }));
  insert.run(date, 'hard',   JSON.stringify({ ...hard,   date, difficulty: 'hard'   }));
});
run();

console.log(`✓ Inserted puzzle for ${date}`);
db.close();
