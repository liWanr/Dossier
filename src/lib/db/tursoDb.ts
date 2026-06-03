import { createClient, type Client } from '@libsql/client';

let _client: Client | null = null;

export function getTursoClient(): Client {
  if (!_client) {
    // 优先使用 Turso 连接（Vercel 部署时设置）
    const url = process.env.TURSO_CONNECTION_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (url) {
      _client = createClient({
        url,
        authToken,
      });
    } else {
      // 本地开发时使用内存数据库
      _client = createClient({
        url: 'file:local.db',
      });
    }
  }
  return _client;
}

export async function initTursoDb(): Promise<void> {
  const client = getTursoClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS puzzles (
      date       TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
      data       TEXT NOT NULL,
      PRIMARY KEY (date, difficulty)
    )
  `);
}
