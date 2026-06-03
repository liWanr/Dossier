#!/usr/bin/env node
/**
 * 批量生成每日逻辑推理题（主题包驱动版）
 *
 * 每天按日期 hash 选一个主题（5 个），同一天三档共享主题。
 * 每个主题有自己的类别名、素材池、线索文案模板。
 *
 * 算法层不变：
 *   - 简单 / 中等 / 困难分级
 *   - AC-3 传播验证唯一解 & 推理可达性
 *   - 多次随机种子尝试 + 同长度多样性优选
 *   - 涉侦探类模板每题至多 1 次，避免「侦探名 + 动作」重复
 */

import { createClient } from '@libsql/client';
import { fileURLToPath } from 'url';
import path from 'path';
import { themeForDate, posTxt, negTxt, ordTxt, rangeTxt, formatItem } from './themes/index.mjs';
import { TIME_ITEMS, getTimePeriod } from './themes/_shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 支持 Turso（Vercel 部署）和本地开发
const db = createClient({
  url: process.env.TURSO_CONNECTION_URL || 'file:' + path.join(__dirname, '../data/puzzles.db'),
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

// ===================== 伪随机数生成器 =====================

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return {
    next()  { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; },
    int(n)  { return Math.floor(this.next() * n); },
    shuffle(arr) {
      const a = [...arr];
      for (let i = a.length-1; i > 0; i--) { const j=this.int(i+1); [a[i],a[j]]=[a[j],a[i]]; }
      return a;
    },
    pick(arr, n) { return this.shuffle(arr).slice(0, n); },
  };
}

function seed(dateStr, diff) {
  const n = parseInt(dateStr.replace(/-/g, ''));
  return (n * 6271 + { easy: 0, medium: 7777, hard: 31337 }[diff]) >>> 0;
}

// ===================== 时段分组 =====================

function buildTimeGroups(timeItems) {
  const g = {};
  timeItems.forEach((t,i) => { const p = getTimePeriod(t); (g[p]=g[p]||[]).push(i); });
  return Object.fromEntries(Object.entries(g).filter(([,v]) => v.length >= 2));
}

// ===================== AC-3 唯一解 & 推理可达性验证 =====================
//
// `ambiguousCount` 返回值的语义：
//   -1 → 矛盾（线索集互相冲突）—— 不可解
//    0 → 仅靠传播即可求解到唯一解 —— 步步可推
//   >0 → 仅靠传播无法收敛，剩余 N 个未确定格 —— 需要试错 / 假设
//
// 本生成器只接受返回 0 的线索集，因此输出的题目都满足:
//   * 唯一解（数学上）
//   * 推理可达（玩家用以下方法即可一步步求解，无需假设链）：
//       1. 显性正向 / 负向直接约束
//       2. 同行同列的"唯一可能"消解（naked single + hidden single）
//       3. 跨类传递（A=B 且 B=C → A=C）
//       4. 时序前后约束在时段域上的传递
//       5. 时段范围约束的负面派生
const pc = n => { let c=0; while(n){c+=n&1;n>>=1;} return c; };
const lo = n => { let i=0; while(n && !(n&1)){n>>=1;i++;} return i; };
const hi = n => n > 0 ? Math.floor(Math.log2(n)) : 0;

function ambiguousCount(clueList, N, M, timeCatIdx = -1) {
  const ALL = (1 << N) - 1;
  const dom = Array.from({length:M}, () => new Int32Array(N).fill(ALL));
  const pos = [], neg = [], ordering = [];

  for (const cl of clueList) {
    if (cl.isOrdered) { ordering.push(cl); continue; }
    const {cA, iA, cB, iB, isNeg} = cl;
    if (!isNeg) {
      if      (cA < 0) { dom[cB][iA] &= (1 << iB); }
      else if (cB < 0) { dom[cA][iB] &= (1 << iA); }
      else             { pos.push([cA,iA,cB,iB]); pos.push([cB,iB,cA,iA]); }
    } else {
      if      (cA < 0) { dom[cB][iA] &= ~(1 << iB); }
      else if (cB < 0) { dom[cA][iB] &= ~(1 << iA); }
      else             { neg.push([cA,iA,cB,iB]); neg.push([cB,iB,cA,iA]); }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let c=0; c<M; c++) for (let d=0; d<N; d++) {
      if (!dom[c][d]) return -1;
      if (pc(dom[c][d])===1) {
        const v = lo(dom[c][d]);
        for (let d2=0; d2<N; d2++)
          if (d2!==d && (dom[c][d2]&(1<<v))) { dom[c][d2]&=~(1<<v); changed=true; }
      }
    }
    for (const [cA,iA,cB,iB] of pos) for (let d=0; d<N; d++) {
      if (dom[cA][d]===(1<<iA)) {
        if (!(dom[cB][d]&(1<<iB))) return -1;
        if (dom[cB][d]!==(1<<iB)) { dom[cB][d]=(1<<iB); changed=true; }
      }
      if (!(dom[cB][d]&(1<<iB)) && (dom[cA][d]&(1<<iA))) { dom[cA][d]&=~(1<<iA); changed=true; }
    }
    for (const [cA,iA,cB,iB] of neg) for (let d=0; d<N; d++) {
      if (dom[cA][d]===(1<<iA) && (dom[cB][d]&(1<<iB))) { dom[cB][d]&=~(1<<iB); changed=true; }
      if (dom[cB][d]===(1<<iB) && (dom[cA][d]&(1<<iA))) { dom[cA][d]&=~(1<<iA); changed=true; }
    }
    if (timeCatIdx >= 0) {
      for (const {cA, iA, cB, iB} of ordering) {
        if (cA < 0 && cB < 0) {
          const D1=dom[timeCatIdx][iA], D2=dom[timeCatIdx][iB];
          if (!D1||!D2) return -1;
          const k1=(1<<hi(D2))-1; if (k1<=0) return -1;
          if ((D1&k1)!==D1) { dom[timeCatIdx][iA]&=k1; if(!dom[timeCatIdx][iA]) return -1; changed=true; }
          const k2=ALL&~((1<<(lo(dom[timeCatIdx][iA])+1))-1);
          if ((D2&k2)!==D2) { dom[timeCatIdx][iB]&=k2; if(!dom[timeCatIdx][iB]) return -1; changed=true; }
        } else {
          let d1=-1,d2=-1,ca=0,cb=0;
          for (let d=0; d<N; d++) {
            if (dom[cA][d]&(1<<iA)) { d1=d; ca++; }
            if (dom[cB][d]&(1<<iB)) { d2=d; cb++; }
          }
          if (ca===0||cb===0) return -1;
          if (ca===1&&cb===1) {
            if (d1===d2) return -1;
            const D1=dom[timeCatIdx][d1], D2=dom[timeCatIdx][d2];
            if (!D1||!D2) return -1;
            const k1=(1<<hi(D2))-1; if(k1<=0) return -1;
            if ((D1&k1)!==D1) { dom[timeCatIdx][d1]&=k1; if(!dom[timeCatIdx][d1]) return -1; changed=true; }
            const k2=ALL&~((1<<(lo(dom[timeCatIdx][d1])+1))-1);
            if ((D2&k2)!==D2) { dom[timeCatIdx][d2]&=k2; if(!dom[timeCatIdx][d2]) return -1; changed=true; }
          }
        }
      }
    }
  }
  if (timeCatIdx >= 0) {
    for (const {cA,iA,cB,iB} of ordering) {
      let t1=-1,t2=-1;
      if (cA<0&&cB<0) {
        if (pc(dom[timeCatIdx][iA])===1&&pc(dom[timeCatIdx][iB])===1) {
          t1=lo(dom[timeCatIdx][iA]); t2=lo(dom[timeCatIdx][iB]);
        }
      } else {
        let d1=-1,d2=-1;
        for (let d=0; d<N; d++) {
          if (pc(dom[cA][d])===1&&lo(dom[cA][d])===iA) d1=d;
          if (pc(dom[cB][d])===1&&lo(dom[cB][d])===iB) d2=d;
        }
        if (d1>=0&&d2>=0&&pc(dom[timeCatIdx][d1])===1&&pc(dom[timeCatIdx][d2])===1) {
          t1=lo(dom[timeCatIdx][d1]); t2=lo(dom[timeCatIdx][d2]);
        }
      }
      if (t1>=0&&t2>=0&&t1>=t2) return -1;
    }
  }
  let ambig=0;
  for (let c=0; c<M; c++) for (let d=0; d<N; d++) if(pc(dom[c][d])>1) ambig++;
  return ambig;
}

// ===================== 题目生成 =====================

function generatePuzzle(date, difficulty) {
  const theme = themeForDate(date);
  const cfg   = theme.difficulties[difficulty];
  const { n, cats } = cfg;
  const rng = makeRng(seed(date, difficulty));
  // The primary category is by convention the first one in the difficulty's
  // cats list. All themes follow this convention (detective / captain /
  // student / astronaut as first).
  const primary    = cats[0];
  const nonDetCats = cats.slice(1);
  const M = nonDetCats.length;
  const timeCatIdx = nonDetCats.indexOf('time');

  // 选取素材
  const items = {};
  for (const cat of cats) {
    if (cat === 'time') {
      items.time = rng.pick(TIME_ITEMS, n).sort((a,b) => TIME_ITEMS.indexOf(a) - TIME_ITEMS.indexOf(b));
    } else {
      items[cat] = rng.pick(theme.pool[cat], n);
    }
  }

  // 生成答案排列
  const sol = nonDetCats.map(() => rng.shuffle(Array.from({length:n}, (_,i)=>i)));

  // ---- 各类候选线索 ----

  // 正向跨类别（两个非 primary 类别，推理链核心）
  const crossPos = [];
  for (let ci=0; ci<M; ci++) for (let cj=ci+1; cj<M; cj++) for (let d=0; d<n; d++)
    crossPos.push({ cA:ci, iA:sol[ci][d], cB:cj, iB:sol[cj][d], isNeg:false });

  // primary 正向线索（indirect = 非 case；case = primary→case 直接）
  const detPosIndirect = [];
  const detPosCase = [];
  for (let d=0; d<n; d++) for (let ci=0; ci<M; ci++) {
    const fact = { cA:-1, iA:d, cB:ci, iB:sol[ci][d], isNeg:false };
    if (nonDetCats[ci] === 'case') detPosCase.push(fact);
    else detPosIndirect.push(fact);
  }

  // primary 负向线索（困难模式用作排除法补充）
  const detNegIndirect = [];
  const detNegCase = [];
  for (let d=0; d<n; d++) for (let ci=0; ci<M; ci++) {
    for (let v=0; v<n; v++) {
      if (v === sol[ci][d]) continue;
      const fact = { cA:-1, iA:d, cB:ci, iB:v, isNeg:true };
      if (nonDetCats[ci] === 'case') detNegCase.push(fact);
      else detNegIndirect.push(fact);
    }
  }

  // primary 时段范围线索
  const detRangeFacts = [];
  if (timeCatIdx >= 0) {
    const timeGroups = buildTimeGroups(items.time);
    for (let d=0; d<n; d++) {
      const tIdx = sol[timeCatIdx][d];
      for (const [period, validIdxs] of Object.entries(timeGroups)) {
        if (validIdxs.includes(tIdx))
          detRangeFacts.push({ isRange:true, cA:-1, iA:d, validTimeIndices:validIdxs, period });
      }
    }
  }

  // 时序线索（同类别先后）
  const orderFacts = [];
  if (timeCatIdx >= 0) {
    const ordCats = nonDetCats.filter(c => c!=='time' && c!=='location');
    for (let d1=0; d1<n; d1++) for (let d2=d1+1; d2<n; d2++) {
      const t1=sol[timeCatIdx][d1], t2=sol[timeCatIdx][d2];
      if (t1===t2) continue;
      const [e,l] = t1<t2 ? [d1,d2] : [d2,d1];
      for (const cat of ordCats) {
        const ci = nonDetCats.indexOf(cat);
        orderFacts.push({ isOrdered:true, cA:ci, iA:sol[ci][e], cB:ci, iB:sol[ci][l] });
      }
    }
  }

  // 范围线索
  const rangeFacts = [];
  if (timeCatIdx >= 0) {
    const timeGroups = buildTimeGroups(items.time);
    const rangeCats = nonDetCats.filter(c => c!=='time' && c!=='location');
    for (const [period, validIdxs] of Object.entries(timeGroups)) {
      for (const cat of rangeCats) {
        const ci = nonDetCats.indexOf(cat);
        for (let d=0; d<n; d++) {
          if (!validIdxs.includes(sol[timeCatIdx][d])) continue;
          rangeFacts.push({ isRange:true, cA:ci, iA:sol[ci][d], validTimeIndices:validIdxs, period });
        }
      }
    }
  }

  const TARGET = { easy: 9, medium: 14, hard: 19 }[difficulty];

  const buildOrdered = (r) => {
    const pairGroups = {};
    for (const f of crossPos) {
      const k = `${f.cA}_${f.cB}`;
      (pairGroups[k] = pairGroups[k] || []).push(f);
    }
    const gs = Object.values(pairGroups).map(g => r.shuffle([...g]));
    const il = [];
    for (let i = 0; gs.some(g => g.length); i++) { const g = gs[i%gs.length]; if (g.length) il.push(g.shift()); }

    const detNegSample = r.pick([...detNegIndirect, ...detNegCase],
      Math.min(difficulty === 'hard' ? 20 : 15, detNegIndirect.length + detNegCase.length));

    const secondaryGroups = [
      r.shuffle(orderFacts),
      r.shuffle(rangeFacts),
      r.shuffle(detRangeFacts),
      r.shuffle(detPosIndirect),
      r.shuffle(detPosCase),
      r.shuffle(detNegSample),
    ];
    const shuffledSecondary = r.shuffle(secondaryGroups).flatMap(g => g);
    return [...il, ...shuffledSecondary];
  };

  function expand(facts) {
    return facts.flatMap(f => {
      if (!f.isRange) return [f];
      const excl = [];
      for (let t=0; t<n; t++)
        if (!f.validTimeIndices.includes(t))
          excl.push({ cA:f.cA, iA:f.iA, cB:timeCatIdx, iB:t, isNeg:true });
      return excl;
    });
  }

  const detPosCaseMax = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 1 : 0;
  const rangeMax = difficulty === 'hard' ? 2 : 1;
  const ordMax   = difficulty === 'hard' ? 3 : 2;

  function templateInfo(fact, caps) {
    if (fact.isRange)   return { key: 'range_' + (fact.cA < 0 ? primary : nonDetCats[fact.cA]), cap: caps.range };
    if (fact.isOrdered) return { key: 'ord_'   + nonDetCats[fact.cA], cap: caps.ord };
    const cAkey = fact.cA < 0 ? primary : nonDetCats[fact.cA];
    const cBkey = fact.cB < 0 ? primary : nonDetCats[fact.cB];
    const pair  = [cAkey, cBkey].sort().join('_');
    const involvesPrimary = (fact.cA < 0 || fact.cB < 0);
    const cap = involvesPrimary ? 1 : Infinity;
    return { key: (fact.isNeg ? 'neg_' : 'pos_') + pair, cap };
  }

  function runGreedy(ord) {
    const tc = {}, used = [];
    let detPosCaseCount = 0;
    const caps = { range: rangeMax, ord: ordMax };
    for (const fact of ord) {
      const { key: tKey, cap } = templateInfo(fact, caps);
      if ((tc[tKey] || 0) >= cap) continue;
      if (!fact.isRange && !fact.isOrdered && !fact.isNeg && fact.cA < 0
          && nonDetCats[fact.cB] === 'case' && detPosCaseCount >= detPosCaseMax) continue;
      used.push(fact);
      const a = ambiguousCount(expand(used), n, M, timeCatIdx);
      if (a < 0) { used.pop(); continue; }
      tc[tKey] = (tc[tKey] || 0) + 1;
      if (!fact.isRange && !fact.isOrdered && !fact.isNeg && fact.cA < 0
          && nonDetCats[fact.cB] === 'case') detPosCaseCount++;
      if (a === 0) break;
    }
    for (let i = used.length-1; i >= 0; i--) {
      const without = used.filter((_,j) => j!==i);
      if (ambiguousCount(expand(without), n, M, timeCatIdx) === 0) used.splice(i, 1);
    }
    return used;
  }

  const diversityScore = (cs) => {
    const t = new Set();
    for (const f of cs) {
      if (f.isRange) t.add('range');
      else if (f.isOrdered) t.add('ord');
      else if (f.isNeg) t.add('neg');
      else t.add('pos');
    }
    return t.size;
  };
  const isBetter = (cand, cur) => {
    if (!cur) return true;
    if (cand.length !== cur.length) return cand.length < cur.length;
    return diversityScore(cand) > diversityScore(cur);
  };

  const baseSeed = seed(date, difficulty);
  const offsets = [0, 99991, 199993, 299989, 399979, 499967, 599959, 699937, 799991, 899981,
                   999983, 1099997, 1200007, 1300019, 1400003, 1500017, 1600033, 1700023, 1800011, 1900007];
  let used = null;
  for (const offset of offsets) {
    const candidate = runGreedy(buildOrdered(makeRng(baseSeed + offset)));
    if (isBetter(candidate, used)) used = candidate;
    if (used.length <= TARGET && diversityScore(used) >= 2) break;
  }

  // 困难后备
  if (difficulty === 'hard' && used.length > TARGET) {
    const moreOffsets = [
      4100027, 4200017, 4300007, 4400031, 4500041, 4600003, 4700019, 4800001,
      4900013, 5000003, 5100029, 5200037, 5300027, 5400031, 5500003, 5600021,
    ];
    for (const offset of moreOffsets) {
      const candidate = runGreedy(buildOrdered(makeRng(baseSeed + offset)));
      if (candidate.length < used.length) used = candidate;
      if (used.length <= TARGET) break;
    }
  }
  if (difficulty === 'hard' && used.length > TARGET) {
    function runGreedyFallback(ord) {
      const tc = {}, fb = [];
      let detPosCaseCount = 0;
      const caps = { range: rangeMax, ord: ordMax };
      for (const fact of ord) {
        const { key: tKey, cap } = templateInfo(fact, caps);
        if ((tc[tKey] || 0) >= cap) continue;
        if (!fact.isRange && !fact.isOrdered && !fact.isNeg && fact.cA < 0
            && nonDetCats[fact.cB] === 'case' && detPosCaseCount >= 1) continue;
        fb.push(fact);
        const a = ambiguousCount(expand(fb), n, M, timeCatIdx);
        if (a < 0) { fb.pop(); continue; }
        tc[tKey] = (tc[tKey] || 0) + 1;
        if (!fact.isRange && !fact.isOrdered && !fact.isNeg && fact.cA < 0
            && nonDetCats[fact.cB] === 'case') detPosCaseCount++;
        if (a === 0) break;
      }
      for (let i = fb.length-1; i >= 0; i--) {
        const without = fb.filter((_,j) => j!==i);
        if (ambiguousCount(expand(without), n, M, timeCatIdx) === 0) fb.splice(i, 1);
      }
      return fb;
    }

    const fbOffsets = [
      2000003, 2100019, 2200013, 2300009, 2400007, 2500043, 2600041, 2700023, 2800031, 2900017,
      3000041, 3100003, 3200023, 3300007, 3400031, 3500017, 3600011, 3700043, 3800003, 3900029,
    ];
    for (const offset of fbOffsets) {
      const r = makeRng(baseSeed + offset);
      const pairGroups = {};
      for (const f of crossPos) {
        const k = `${f.cA}_${f.cB}`;
        (pairGroups[k] = pairGroups[k] || []).push(f);
      }
      const gs = Object.values(pairGroups).map(g => r.shuffle([...g]));
      const il = [];
      for (let i = 0; gs.some(g => g.length); i++) { const g = gs[i%gs.length]; if (g.length) il.push(g.shift()); }
      const detNegSample = r.pick([...detNegIndirect, ...detNegCase],
        Math.min(20, detNegIndirect.length + detNegCase.length));
      const fbOrd = [
        ...r.shuffle(detPosCase),
        ...il,
        ...r.shuffle(orderFacts),
        ...r.shuffle(rangeFacts),
        ...r.shuffle(detRangeFacts),
        ...r.shuffle(detPosIndirect),
        ...r.shuffle(detNegSample),
      ];
      const candidate = runGreedyFallback(fbOrd);
      if (candidate.length < used.length) used = candidate;
      if (used.length <= TARGET) break;
    }
  }

  // ---- 构造题目 JSON ----

  const categories = cats.map(cat => ({
    id: cat,
    name: theme.cats[cat].name,
    icon: theme.cats[cat].icon,
    items: items[cat].map((name,i) => ({ id: theme.cats[cat].prefix + (i+1), name: formatItem(theme, cat, name) })),
  }));

  const ck = c => c < 0 ? primary : nonDetCats[c];
  const nmRaw = (c,i) => c < 0 ? items[primary][i] : items[nonDetCats[c]][i];
  const idOf = (c,i) => (c < 0 ? theme.cats[primary].prefix : theme.cats[nonDetCats[c]].prefix) + (i+1);

  // Per-puzzle RNG for template variant selection (deterministic per (date, diff))
  const textRng = makeRng((baseSeed ^ 0x5bd1e995) >>> 0);

  const clues = used.map((fact, idx) => {
    if (fact.isRange) {
      const cAkey = ck(fact.cA);
      const validItemIds = fact.validTimeIndices.map(t => theme.cats.time.prefix + (t+1));
      return {
        id: `cl${idx+1}`, type: 'category_range',
        text: rangeTxt(theme, cAkey, nmRaw(fact.cA, fact.iA), fact.period, textRng),
        params: { categoryA:cAkey, itemA:idOf(fact.cA,fact.iA), categoryB:'time', itemB:'', validItems:validItemIds },
      };
    }
    if (fact.isOrdered) {
      const cAkey=ck(fact.cA), cBkey=ck(fact.cB);
      return {
        id: `cl${idx+1}`, type: 'ordered_before',
        text: ordTxt(theme, cAkey, nmRaw(fact.cA,fact.iA), cBkey, nmRaw(fact.cB,fact.iB), textRng),
        params: { categoryA:cAkey, itemA:idOf(fact.cA,fact.iA), categoryB:cBkey, itemB:idOf(fact.cB,fact.iB), categoryC:'time' },
      };
    }
    const cAkey=ck(fact.cA), cBkey=ck(fact.cB);
    const a=nmRaw(fact.cA,fact.iA), b=nmRaw(fact.cB,fact.iB);
    return {
      id: `cl${idx+1}`,
      type: fact.isNeg ? 'direct_negative' : 'direct_positive',
      text: fact.isNeg
        ? negTxt(theme, cAkey, a, cBkey, b, textRng)
        : posTxt(theme, cAkey, a, cBkey, b, textRng),
      params: { categoryA:cAkey, itemA:idOf(fact.cA,fact.iA), categoryB:cBkey, itemB:idOf(fact.cB,fact.iB) },
    };
  });

  const assignments = {};
  for (let d=0; d<n; d++)
    assignments[theme.cats[primary].prefix + (d+1)] = Object.fromEntries(
      nonDetCats.map((cat,ci) => [cat, theme.cats[cat].prefix + (sol[ci][d]+1)])
    );

  const title = theme.titles[difficulty][parseInt(date.replace(/-/g,'')) % theme.titles[difficulty].length];
  return {
    id:`${difficulty}-${date}`, date, difficulty, title,
    description: cfg.desc(n),
    categories, clues,
    solution: { primaryCategoryId: primary, assignments },
    themeId: theme.id,
    themeLabel: theme.label,
  };
}

// ===================== 批量生成 =====================

function dateRange(start, end) {
  const dates = [];
  const cur = new Date(start+'T00:00:00Z'), endD = new Date(end+'T00:00:00Z');
  while (cur <= endD) { dates.push(cur.toISOString().split('T')[0]); cur.setUTCDate(cur.getUTCDate()+1); }
  return dates;
}

const dates = dateRange('2026-01-01', '2026-12-31');

console.log(`生成 ${dates.length} 天 × 3 档难度 = ${dates.length*3} 道题…`);
const rows = [];
let failed = 0;
const typeStats = { easy: {}, medium: {}, hard: {} };
const themeStats = {};
for (const date of dates) {
  for (const diff of ['easy','medium','hard']) {
    const puzzle = generatePuzzle(date, diff);
    const cfg = puzzle.categories; // raw categories list
    const allCats = cfg.map(c => c.id);
    const primary = puzzle.solution.primaryCategoryId;
    const nonDetCats = allCats.filter(c => c !== primary);
    const timeCatIdx = nonDetCats.indexOf('time');
    const clueList = puzzle.clues.flatMap(cl => {
      if (cl.type === 'category_range') {
        const validIdxs = (cl.params.validItems??[]).map(id => parseInt(id.slice(1))-1);
        const cA = cl.params.categoryA===primary ? -1 : nonDetCats.indexOf(cl.params.categoryA);
        const iA = parseInt(cl.params.itemA.slice(1))-1;
        return Array.from({length:cfg[0].items.length}, (_,t) => validIdxs.includes(t)?null:{cA,iA,cB:timeCatIdx,iB:t,isNeg:true}).filter(Boolean);
      }
      if (cl.type === 'ordered_before') {
        const cA = cl.params.categoryA===primary ? -1 : nonDetCats.indexOf(cl.params.categoryA);
        const cB = cl.params.categoryB===primary ? -1 : nonDetCats.indexOf(cl.params.categoryB);
        return [{ isOrdered:true, cA, iA:parseInt(cl.params.itemA.slice(1))-1, cB, iB:parseInt(cl.params.itemB.slice(1))-1 }];
      }
      const cA = cl.params.categoryA===primary ? -1 : nonDetCats.indexOf(cl.params.categoryA);
      const cB = cl.params.categoryB===primary ? -1 : nonDetCats.indexOf(cl.params.categoryB);
      return [{ cA, iA:parseInt(cl.params.itemA.slice(1))-1, cB, iB:parseInt(cl.params.itemB.slice(1))-1, isNeg:cl.type==='direct_negative' }];
    });
    const N = cfg.find(c => c.id === primary).items.length;
    const ambig = ambiguousCount(clueList, N, nonDetCats.length, timeCatIdx);
    if (ambig !== 0) { console.warn(`  ⚠ ${date} ${diff}: 歧义=${ambig} (theme=${puzzle.themeId})`); failed++; }
    const types = new Set(puzzle.clues.map(c => c.type));
    const k = [...types].sort().join('+');
    typeStats[diff][k] = (typeStats[diff][k] || 0) + 1;
    themeStats[puzzle.themeId] = (themeStats[puzzle.themeId] || 0) + 1;
    rows.push({ date, diff, data: JSON.stringify(puzzle) });
  }
}

// 异步插入所有数据
for (const row of rows) {
  await db.execute({
    sql: 'INSERT OR REPLACE INTO puzzles (date, difficulty, data) VALUES (?, ?, ?)',
    args: [row.date, row.diff, row.data],
  });
}

console.log(`完成！插入 ${rows.length} 道题，验证失败 ${failed} 道。`);
console.log('主题分布:');
for (const [id, c] of Object.entries(themeStats).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${id}: ${c}`);
}
console.log('线索类型组合分布:');
for (const diff of ['easy', 'medium', 'hard']) {
  const entries = Object.entries(typeStats[diff]).sort((a, b) => b[1] - a[1]);
  console.log(`  ${diff}: ${entries.map(([k, v]) => `${k}×${v}`).join(', ')}`);
}
