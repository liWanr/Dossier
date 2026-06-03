/**
 * One-time seed: import existing TypeScript puzzle data into puzzles.db
 * Usage: node scripts/seed.mjs
 */
import { createClient } from '@libsql/client';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 支持 Turso（Vercel 部署）和本地开发
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:' + join(__dirname, '..', 'data', 'puzzles.db'),
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

// ── Puzzle data ──────────────────────────────────────────────────────────────

const DATE = '2026-06-02';

const easy = {
  id: 'easy-2026-06-02', date: DATE, difficulty: 'easy',
  title: '珠宝失窃案',
  description: '侦探事务所接到报案：城中四件珍贵珠宝相继失窃。四名侦探分别负责调查，请根据线索还原每位侦探的调查案件、关键证物与发案时间。',
  categories: [
    { id: 'detective', name: '侦探', icon: '🕵️', items: [{ id: 'd1', name: '顾川' }, { id: 'd2', name: '阮宁' }, { id: 'd3', name: '邵杰' }, { id: 'd4', name: '和宸' }] },
    { id: 'case',      name: '案件', icon: '📁',  items: [{ id: 'c1', name: '珠宝失窃' }, { id: 'c2', name: '连环纵火' }, { id: 'c3', name: '神秘失踪' }, { id: 'c4', name: '密室谋杀' }] },
    { id: 'evidence',  name: '证物', icon: '🔍',  items: [{ id: 'e1', name: '监控录像' }, { id: 'e2', name: '血迹刀具' }, { id: 'e3', name: '撕碎信件' }, { id: 'e4', name: '神秘纸条' }] },
    { id: 'time',      name: '时间', icon: '🕐',  items: [{ id: 't1', name: '上午9点' }, { id: 't2', name: '下午1点' }, { id: 't3', name: '下午4点' }, { id: 't4', name: '晚上10点' }] },
  ],
  solution: {
    primaryCategoryId: 'detective',
    assignments: {
      d1: { case: 'c3', evidence: 'e1', time: 't2' },
      d2: { case: 'c1', evidence: 'e4', time: 't1' },
      d3: { case: 'c4', evidence: 'e2', time: 't4' },
      d4: { case: 'c2', evidence: 'e3', time: 't3' },
    },
  },
  clues: [
    { id: 'cl1', type: 'direct_negative', text: '调查密室谋杀案的侦探不是顾川',             params: { categoryA: 'detective', itemA: 'd1', categoryB: 'case',     itemB: 'c4' } },
    { id: 'cl2', type: 'direct_positive', text: '持有监控录像的侦探调查的是神秘失踪案',       params: { categoryA: 'evidence',  itemA: 'e1', categoryB: 'case',     itemB: 'c3' } },
    { id: 'cl3', type: 'direct_positive', text: '和宸调查的是连环纵火案',                   params: { categoryA: 'detective', itemA: 'd4', categoryB: 'case',     itemB: 'c2' } },
    { id: 'cl4', type: 'direct_negative', text: '阮宁持有的证物不是血迹刀具',               params: { categoryA: 'detective', itemA: 'd2', categoryB: 'evidence', itemB: 'e2' } },
    { id: 'cl5', type: 'direct_positive', text: '邵杰的案件发生在晚上10点',                 params: { categoryA: 'detective', itemA: 'd3', categoryB: 'time',     itemB: 't4' } },
    { id: 'cl6', type: 'direct_positive', text: '调查珠宝失窃案的侦探在上午9点接到报案',     params: { categoryA: 'case',      itemA: 'c1', categoryB: 'time',     itemB: 't1' } },
    { id: 'cl7', type: 'direct_negative', text: '顾川的案件不是在上午9点',                   params: { categoryA: 'detective', itemA: 'd1', categoryB: 'time',     itemB: 't1' } },
    { id: 'cl8', type: 'direct_positive', text: '持有撕碎信件的侦探在下午4点出现在现场',     params: { categoryA: 'evidence',  itemA: 'e3', categoryB: 'time',     itemB: 't3' } },
  ],
};

const medium = {
  id: 'medium-2026-06-02', date: DATE, difficulty: 'medium',
  title: '连环纵火疑云',
  description: '五名侦探分别追查五起连环案件，每人持有不同证物，出现在不同时间与地点。请根据线索还原完整关系。',
  categories: [
    { id: 'detective', name: '侦探', icon: '🕵️', items: [{ id: 'd1', name: '顾川' }, { id: 'd2', name: '阮宁' }, { id: 'd3', name: '邵杰' }, { id: 'd4', name: '和宸' }, { id: 'd5', name: '溯远' }] },
    { id: 'case',      name: '案件', icon: '📁',  items: [{ id: 'c1', name: '珠宝失窃' }, { id: 'c2', name: '连环纵火' }, { id: 'c3', name: '神秘失踪' }, { id: 'c4', name: '密室谋杀' }, { id: 'c5', name: '勒索绑架' }] },
    { id: 'evidence',  name: '证物', icon: '🔍',  items: [{ id: 'e1', name: '监控录像' }, { id: 'e2', name: '血迹刀具' }, { id: 'e3', name: '撕碎信件' }, { id: 'e4', name: '神秘纸条' }, { id: 'e5', name: '指纹手套' }] },
    { id: 'time',      name: '时间', icon: '🕐',  items: [{ id: 't1', name: '上午9点' }, { id: 't2', name: '下午1点' }, { id: 't3', name: '下午4点' }, { id: 't4', name: '晚上8点' }, { id: 't5', name: '晚上10点' }] },
    { id: 'location',  name: '地点', icon: '📍',  items: [{ id: 'l1', name: '旧城区' }, { id: 'l2', name: '港口码头' }, { id: 'l3', name: '豪华酒店' }, { id: 'l4', name: '废弃仓库' }, { id: 'l5', name: '火车站' }] },
  ],
  solution: {
    primaryCategoryId: 'detective',
    assignments: {
      d1: { case: 'c3', evidence: 'e1', time: 't2', location: 'l3' },
      d2: { case: 'c1', evidence: 'e4', time: 't1', location: 'l5' },
      d3: { case: 'c4', evidence: 'e2', time: 't5', location: 'l4' },
      d4: { case: 'c2', evidence: 'e3', time: 't3', location: 'l1' },
      d5: { case: 'c5', evidence: 'e5', time: 't4', location: 'l2' },
    },
  },
  clues: [
    { id: 'cl1',  type: 'direct_positive', text: '顾川调查的是神秘失踪案',               params: { categoryA: 'detective', itemA: 'd1', categoryB: 'case',     itemB: 'c3' } },
    { id: 'cl2',  type: 'direct_positive', text: '持有监控录像的侦探在豪华酒店展开调查', params: { categoryA: 'evidence',  itemA: 'e1', categoryB: 'location', itemB: 'l3' } },
    { id: 'cl3',  type: 'direct_negative', text: '调查密室谋杀案的侦探不在港口码头',     params: { categoryA: 'case',      itemA: 'c4', categoryB: 'location', itemB: 'l2' } },
    { id: 'cl4',  type: 'direct_positive', text: '和宸持有撕碎信件',                     params: { categoryA: 'detective', itemA: 'd4', categoryB: 'evidence', itemB: 'e3' } },
    { id: 'cl5',  type: 'direct_positive', text: '在废弃仓库出现的侦探调查的是密室谋杀案', params: { categoryA: 'location',  itemA: 'l4', categoryB: 'case',     itemB: 'c4' } },
    { id: 'cl6',  type: 'direct_positive', text: '邵杰的案发时间是晚上10点',             params: { categoryA: 'detective', itemA: 'd3', categoryB: 'time',     itemB: 't5' } },
    { id: 'cl7',  type: 'direct_negative', text: '阮宁不在旧城区',                       params: { categoryA: 'detective', itemA: 'd2', categoryB: 'location', itemB: 'l1' } },
    { id: 'cl8',  type: 'direct_positive', text: '调查连环纵火案的侦探在旧城区',         params: { categoryA: 'case',      itemA: 'c2', categoryB: 'location', itemB: 'l1' } },
    { id: 'cl9',  type: 'direct_positive', text: '溯远出现在港口码头',                   params: { categoryA: 'detective', itemA: 'd5', categoryB: 'location', itemB: 'l2' } },
    { id: 'cl10', type: 'direct_positive', text: '调查珠宝失窃案的侦探在上午9点接到报案', params: { categoryA: 'case',      itemA: 'c1', categoryB: 'time',     itemB: 't1' } },
    { id: 'cl11', type: 'direct_positive', text: '持有指纹手套的侦探在晚上8点出现',       params: { categoryA: 'evidence',  itemA: 'e5', categoryB: 'time',     itemB: 't4' } },
    { id: 'cl12', type: 'direct_negative', text: '溯远持有的不是监控录像',               params: { categoryA: 'detective', itemA: 'd5', categoryB: 'evidence', itemB: 'e1' } },
    { id: 'cl13', type: 'direct_positive', text: '邵杰在废弃仓库展开调查',               params: { categoryA: 'detective', itemA: 'd3', categoryB: 'location', itemB: 'l4' } },
    { id: 'cl14', type: 'direct_positive', text: '阮宁持有神秘纸条',                     params: { categoryA: 'detective', itemA: 'd2', categoryB: 'evidence', itemB: 'e4' } },
    { id: 'cl15', type: 'direct_positive', text: '和宸在下午4点抵达现场',                 params: { categoryA: 'detective', itemA: 'd4', categoryB: 'time',     itemB: 't3' } },
  ],
};

const hard = {
  id: 'hard-2026-06-02', date: DATE, difficulty: 'hard',
  title: '六案迷局',
  description: '六起离奇案件同时发生，六名侦探分头行动。每人持有独特证物，在不同时间抵达不同地点调查不同嫌疑人。所有线索相互关联，唯有最缜密的推理才能还原全貌。',
  categories: [
    { id: 'detective', name: '侦探',   icon: '🕵️', items: [{ id: 'd1', name: '顾川' }, { id: 'd2', name: '阮宁' }, { id: 'd3', name: '邵杰' }, { id: 'd4', name: '和宸' }, { id: 'd5', name: '溯远' }, { id: 'd6', name: '苏黎' }] },
    { id: 'case',      name: '案件',   icon: '📁',  items: [{ id: 'c1', name: '珠宝失窃' }, { id: 'c2', name: '连环纵火' }, { id: 'c3', name: '神秘失踪' }, { id: 'c4', name: '密室谋杀' }, { id: 'c5', name: '勒索绑架' }, { id: 'c6', name: '伪造文书' }] },
    { id: 'suspect',   name: '嫌疑人', icon: '👤',  items: [{ id: 's1', name: '黑衣男子' }, { id: 's2', name: '红发女子' }, { id: 's3', name: '戴帽男子' }, { id: 's4', name: '神秘访客' }, { id: 's5', name: '独臂商人' }, { id: 's6', name: '蒙面歌手' }] },
    { id: 'evidence',  name: '证物',   icon: '🔍',  items: [{ id: 'e1', name: '监控录像' }, { id: 'e2', name: '血迹刀具' }, { id: 'e3', name: '撕碎信件' }, { id: 'e4', name: '神秘纸条' }, { id: 'e5', name: '指纹手套' }, { id: 'e6', name: '伪造印章' }] },
    { id: 'time',      name: '时间',   icon: '🕐',  items: [{ id: 't1', name: '上午9点' }, { id: 't2', name: '上午11点' }, { id: 't3', name: '下午1点' }, { id: 't4', name: '下午4点' }, { id: 't5', name: '晚上8点' }, { id: 't6', name: '晚上10点' }] },
    { id: 'location',  name: '地点',   icon: '📍',  items: [{ id: 'l1', name: '旧城区' }, { id: 'l2', name: '港口码头' }, { id: 'l3', name: '豪华酒店' }, { id: 'l4', name: '废弃仓库' }, { id: 'l5', name: '火车站' }, { id: 'l6', name: '地下赌场' }] },
  ],
  solution: {
    primaryCategoryId: 'detective',
    assignments: {
      d1: { case: 'c3', suspect: 's4', evidence: 'e1', time: 't3', location: 'l3' },
      d2: { case: 'c1', suspect: 's2', evidence: 'e4', time: 't1', location: 'l5' },
      d3: { case: 'c4', suspect: 's1', evidence: 'e2', time: 't6', location: 'l4' },
      d4: { case: 'c2', suspect: 's3', evidence: 'e3', time: 't4', location: 'l1' },
      d5: { case: 'c5', suspect: 's6', evidence: 'e5', time: 't5', location: 'l2' },
      d6: { case: 'c6', suspect: 's5', evidence: 'e6', time: 't2', location: 'l6' },
    },
  },
  clues: [
    { id: 'cl1',  type: 'direct_positive', text: '调查神秘失踪案的侦探在豪华酒店展开调查',   params: { categoryA: 'case',      itemA: 'c3', categoryB: 'location', itemB: 'l3' } },
    { id: 'cl2',  type: 'direct_positive', text: '持有监控录像的侦探锁定的嫌疑人是神秘访客', params: { categoryA: 'evidence',  itemA: 'e1', categoryB: 'suspect',  itemB: 's4' } },
    { id: 'cl3',  type: 'direct_negative', text: '邵杰不在豪华酒店',                         params: { categoryA: 'detective', itemA: 'd3', categoryB: 'location', itemB: 'l3' } },
    { id: 'cl4',  type: 'direct_positive', text: '和宸手持撕碎信件追查连环纵火案',           params: { categoryA: 'detective', itemA: 'd4', categoryB: 'evidence', itemB: 'e3' } },
    { id: 'cl5',  type: 'direct_positive', text: '在废弃仓库出现的侦探追查的是密室谋杀案',   params: { categoryA: 'location',  itemA: 'l4', categoryB: 'case',     itemB: 'c4' } },
    { id: 'cl6',  type: 'direct_positive', text: '邵杰的出现时间是晚上10点',                 params: { categoryA: 'detective', itemA: 'd3', categoryB: 'time',     itemB: 't6' } },
    { id: 'cl7',  type: 'direct_positive', text: '调查伪造文书案的侦探在地下赌场',           params: { categoryA: 'case',      itemA: 'c6', categoryB: 'location', itemB: 'l6' } },
    { id: 'cl8',  type: 'direct_positive', text: '苏黎在上午11点抵达现场',                   params: { categoryA: 'detective', itemA: 'd6', categoryB: 'time',     itemB: 't2' } },
    { id: 'cl9',  type: 'direct_positive', text: '红发女子与珠宝失窃案有关',                 params: { categoryA: 'suspect',   itemA: 's2', categoryB: 'case',     itemB: 'c1' } },
    { id: 'cl10', type: 'direct_positive', text: '溯远在港口码头出现',                       params: { categoryA: 'detective', itemA: 'd5', categoryB: 'location', itemB: 'l2' } },
    { id: 'cl11', type: 'direct_positive', text: '调查勒索绑架案的侦探锁定了蒙面歌手',       params: { categoryA: 'case',      itemA: 'c5', categoryB: 'suspect',  itemB: 's6' } },
    { id: 'cl12', type: 'direct_positive', text: '持有指纹手套的侦探在晚上8点行动',           params: { categoryA: 'evidence',  itemA: 'e5', categoryB: 'time',     itemB: 't5' } },
    { id: 'cl13', type: 'direct_negative', text: '顾川持有的证物不是血迹刀具',               params: { categoryA: 'detective', itemA: 'd1', categoryB: 'evidence', itemB: 'e2' } },
    { id: 'cl14', type: 'direct_positive', text: '阮宁在火车站追查珠宝失窃案',               params: { categoryA: 'detective', itemA: 'd2', categoryB: 'location', itemB: 'l5' } },
    { id: 'cl15', type: 'direct_positive', text: '调查珠宝失窃案的侦探在上午9点接到报案',     params: { categoryA: 'case',      itemA: 'c1', categoryB: 'time',     itemB: 't1' } },
    { id: 'cl16', type: 'direct_positive', text: '黑衣男子是密室谋杀案的嫌疑人',             params: { categoryA: 'suspect',   itemA: 's1', categoryB: 'case',     itemB: 'c4' } },
    { id: 'cl17', type: 'direct_positive', text: '独臂商人与伪造文书案有关联',               params: { categoryA: 'suspect',   itemA: 's5', categoryB: 'case',     itemB: 'c6' } },
    { id: 'cl18', type: 'direct_positive', text: '和宸的案发地点在旧城区',                   params: { categoryA: 'detective', itemA: 'd4', categoryB: 'location', itemB: 'l1' } },
  ],
};

// ── Insert ────────────────────────────────────────────────────────────────────

await db.execute({
  sql: 'INSERT OR REPLACE INTO puzzles (date, difficulty, data) VALUES (?, ?, ?)',
  args: [DATE, 'easy', JSON.stringify(easy)],
});

await db.execute({
  sql: 'INSERT OR REPLACE INTO puzzles (date, difficulty, data) VALUES (?, ?, ?)',
  args: [DATE, 'medium', JSON.stringify(medium)],
});

await db.execute({
  sql: 'INSERT OR REPLACE INTO puzzles (date, difficulty, data) VALUES (?, ?, ?)',
  args: [DATE, 'hard', JSON.stringify(hard)],
});

const result = await db.execute('SELECT COUNT(*) AS n FROM puzzles');
const count = result.rows[0];
console.log(`✓ Seeded ${count.n} puzzle rows`);

