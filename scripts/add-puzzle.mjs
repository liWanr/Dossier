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
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// 支持 Turso（Vercel 部署）和本地开发
const db = createClient({
  url: process.env.TURSO_CONNECTION_URL || 'file:' + join(__dirname, '..', 'data', 'puzzles.db'),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 初始化数据库表
await db.execute(`
  CREATE TABLE IF NOT EXISTS puzzles (
    date       TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
    data       TEXT NOT NULL,
    PRIMARY KEY (date, difficulty)
  )
`);

// 插入三个难度等级
await db.execute({
  sql: 'INSERT OR REPLACE INTO puzzles (date, difficulty, data) VALUES (?, ?, ?)',
  args: [date, 'easy', JSON.stringify({ ...easy, date, difficulty: 'easy' })],
});

await db.execute({
  sql: 'INSERT OR REPLACE INTO puzzles (date, difficulty, data) VALUES (?, ?, ?)',
  args: [date, 'medium', JSON.stringify({ ...medium, date, difficulty: 'medium' })],
});

await db.execute({
  sql: 'INSERT OR REPLACE INTO puzzles (date, difficulty, data) VALUES (?, ?, ?)',
  args: [date, 'hard', JSON.stringify({ ...hard, date, difficulty: 'hard' })],
});

console.log(`✓ Inserted puzzle for ${date}`);
