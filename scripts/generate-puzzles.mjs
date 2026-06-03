#!/usr/bin/env node
/**
 * 批量生成每日逻辑推理题
 *
 * 真正的难度差异来自"线索类型"，而不仅仅是"人数多少"：
 *   简单 —— 跨类别正向 + 时段范围 + 时序（不直接点名侦探）
 *   中等 —— 加入负向跨类别（"A案与B证物无关"）
 *   困难 —— 大量负向跨类别 + 时序 + 范围，侦探直接线索只作最后兜底
 *
 * 线索质量原则：
 *   - 简单不出 detective_case 直接线索（"顾川负责X案"），改用 detective_time / detective_evidence
 *   - 中等出部分负向跨类别（需要排除法思考）
 *   - 困难重用负向跨类别 + 时序，减少 detective_case 直接定位
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '../data/puzzles.db'));

// ===================== 素材池 =====================

const POOL = {
  detective: ['顾川','阮宁','邵杰','和宸','溯远','苏黎','沈澈','裴宴','谢璟','陆深','江宁','钟离','方晴','林越','叶修'],
  case:      ['珠宝失窃','连环纵火','神秘失踪','密室谋杀','勒索绑架','伪造文书','毒杀疑云','古董被盗','商业间谍','黑市交易','码头命案','豪宅入室','列车劫案','深夜凶案','双重身份'],
  suspect:   ['黑衣男子','红发女子','戴帽男子','神秘访客','独臂商人','蒙面歌手','秃顶老人','修女打扮','跛脚流浪者','双胞胎兄弟','假冒警察','富商太太','外国学者','哑巴店主','纹身男子'],
  evidence:  ['监控录像','血迹刀具','撕碎信件','神秘纸条','指纹手套','伪造印章','遗失钱包','毒药残留','藏匿地图','密码本册','伪造证件','脚印模具','染血手帕','匿名信件','黑色头套'],
  time:      ['上午9点','上午11点','正午12点','下午2点','下午4点','傍晚6点','晚上8点','晚上10点'],
  location:  ['旧城区','港口码头','豪华酒店','废弃仓库','火车站','地下赌场','古玩市场','停尸间','高档餐厅','郊外别墅','地铁站台','大学校园','银行金库','夜总会','集装箱区'],
};

const CONF = {
  easy: {
    n: 4,
    cats:  ['detective','case','evidence','time'],
    names: { detective:'侦探', case:'案件', evidence:'证物', time:'时间' },
    icons: { detective:'🕵️', case:'📁', evidence:'🔍', time:'🕐' },
    prefix:{ detective:'d', case:'c', evidence:'e', time:'t' },
    desc: n => `${n}名侦探分别追查不同案件，请根据线索推断每位侦探的案件、证物与案发时间。`,
  },
  medium: {
    n: 5,
    cats:  ['detective','case','evidence','time','location'],
    names: { detective:'侦探', case:'案件', evidence:'证物', time:'时间', location:'地点' },
    icons: { detective:'🕵️', case:'📁', evidence:'🔍', time:'🕐', location:'📍' },
    prefix:{ detective:'d', case:'c', evidence:'e', time:'t', location:'l' },
    desc: n => `${n}名侦探各自负责调查案件，请根据线索推断每位侦探的案件、证物、时间与案发地点。`,
  },
  hard: {
    n: 6,
    cats:  ['detective','case','suspect','evidence','time','location'],
    names: { detective:'侦探', case:'案件', suspect:'嫌疑人', evidence:'证物', time:'时间', location:'地点' },
    icons: { detective:'🕵️', case:'📁', suspect:'👤', evidence:'🔍', time:'🕐', location:'📍' },
    prefix:{ detective:'d', case:'c', suspect:'s', evidence:'e', time:'t', location:'l' },
    desc: n => `${n}名侦探各自追查迷案，请根据线索推断每位侦探的案件、嫌疑人、证物、时间与地点。`,
  },
};

const TITLES = {
  easy:   ['初探案情','四案追踪','简案寻迹','案发现场','四路并查','线索初现','初判案情','明察四案'],
  medium: ['五案迷局','重重疑云','暗流涌动','五线追凶','错综线索','迷雾寻踪','谜案五重','疑案五宗'],
  hard:   ['六案悬局','错综复杂','疑云密布','六线迷局','险局破解','迷阵探案','悬案六重','谜局险境'],
};

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

function getTimePeriod(t) {
  if (t.includes('上午')) return '上午';
  if (t.includes('正午') || t.includes('下午')) return '下午';
  return '晚上';
}

// 返回 { period: [itemIndices...] }，只保留 size>=2 的组
function buildTimeGroups(timeItems) {
  const g = {};
  timeItems.forEach((t,i) => { const p = getTimePeriod(t); (g[p]=g[p]||[]).push(i); });
  return Object.fromEntries(Object.entries(g).filter(([,v]) => v.length >= 2));
}

// ===================== AC-3 唯一解 & 推理可达性验证 =====================
//
// `ambiguousCount` 返回值的语义：
//   -1 → 矛盾（线索集互相冲突）—— 不可解
//    0 → 仅靠传播即可求解到唯一解 ——「步步可推」
//   >0 → 仅靠传播无法收敛，剩余 N 个未确定格 —— 玩家需要试错 / 假设
//
// 本生成器只接受返回 0 的线索集，因此输出的题目都满足:
//   * 唯一解（数学上）
//   * 推理可达（玩家用以下方法即可一步步求解，无需"如果 X 是 Y 则…"的假设链）：
//       1. 显性正向 / 负向直接约束
//       2. 同行同列的"唯一可能"消解（naked single + hidden single）
//       3. 跨类传递（A=B 且 B=C → A=C）
//       4. 时序前后约束在时段域上的传递
//       5. 时段范围约束的负面派生
// AC-3 propagation 实现的就是上述 5 类，所以若返回 0，玩家也能用同样规则走通。

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

// ===================== 线索文案模板 =====================

// 案件名有些以"案"结尾（如"码头命案"），拼模板时不重复追加
const cs = n => n.endsWith('案') ? n : n + '案';

const POS = {
  detective_case:     (a,b) => `${a}负责追查的就是${cs(b)}`,
  detective_evidence: (a,b) => `${a}从现场带走了${b}`,
  detective_time:     (a,b) => `${a}在${b}接到出警通知`,
  detective_location: (a,b) => `${a}在${b}展开了调查`,
  detective_suspect:  (a,b) => `${a}最终锁定的嫌疑人是${b}`,
  case_evidence:      (a,b) => `${cs(a)}的现场发现了${b}`,
  case_time:          (a,b) => `${cs(a)}的报案时间是${b}`,
  case_location:      (a,b) => `${cs(a)}的案发现场在${b}`,
  case_suspect:       (a,b) => `${cs(a)}的主要嫌疑人是${b}`,
  evidence_time:      (a,b) => `${a}是在${b}被发现的`,
  evidence_location:  (a,b) => `${a}是在${b}找到的`,
  suspect_evidence:   (a,b) => `${a}留下了${b}`,
  time_location:      (a,b) => `${b}的案发时间恰好是${a}`,
  suspect_time:       (a,b) => `${a}在${b}出现过`,
  suspect_location:   (a,b) => `${a}被目击于${b}`,
};

const NEG = {
  detective_case:     (a,b) => `${a}与${cs(b)}毫无关联`,
  detective_evidence: (a,b) => `${a}未曾接触过${b}`,
  detective_time:     (a,b) => `${a}在${b}没有行动`,
  detective_location: (a,b) => `${a}没有前往${b}`,
  detective_suspect:  (a,b) => `${a}排除了${b}的嫌疑`,
  case_evidence:      (a,b) => `${cs(a)}与${b}没有关联`,
  case_time:          (a,b) => `${cs(a)}并非在${b}报案`,
  case_location:      (a,b) => `${cs(a)}并非发生在${b}`,
  case_suspect:       (a,b) => `${cs(a)}的嫌疑人不是${b}`,
  evidence_time:      (a,b) => `${a}并非在${b}被发现`,
  evidence_location:  (a,b) => `${a}并非在${b}找到`,
  suspect_evidence:   (a,b) => `${a}没有留下${b}`,
  time_location:      (a,b) => `${b}的案发时间并非${a}`,
  suspect_time:       (a,b) => `${a}在${b}没有出现`,
  suspect_location:   (a,b) => `${a}未在${b}露面`,
};

const ORD = {
  case_case:         (a,b) => `${cs(a)}的报案时间早于${cs(b)}`,
  evidence_evidence: (a,b) => `${a}比${b}更早被发现`,
  suspect_suspect:   (a,b) => `${a}比${b}更早出现在案发区域`,
  location_location: (a,b) => `${b}的案发时间晚于${a}`,
};

const RANGE = {
  case:      (a,p) => `${cs(a)}发生在${p}时段`,
  evidence:  (a,p) => `${a}是在${p}时段被发现的`,
  suspect:   (a,p) => `${a}在${p}时段出现在案发区域`,
  detective: (a,p) => `${a}是在${p}时段接到出警通知的`,
};

function posTxt(ck,a,dk,b) { return (POS[`${ck}_${dk}`]??POS[`${dk}_${ck}`]??((x,y)=>`${x}与${y}有关`))(a,b); }
function negTxt(ck,a,dk,b) { return (NEG[`${ck}_${dk}`]??NEG[`${dk}_${ck}`]??((x,y)=>`${x}与${y}无关`))(a,b); }
function ordTxt(ck,a,dk,b) { return (ORD[`${ck}_${dk}`]??ORD[`${dk}_${ck}`]??((x,y)=>`${x}早于${y}`))(a,b); }

// ===================== 题目生成 =====================

function generatePuzzle(date, difficulty) {
  const cfg = CONF[difficulty];
  const { n, cats, prefix } = cfg;
  const rng = makeRng(seed(date, difficulty));
  const nonDetCats = cats.filter(c => c !== 'detective');
  const M = nonDetCats.length;
  const timeCatIdx = nonDetCats.indexOf('time');

  // 选取素材（时间按时序排序）
  const items = {};
  for (const cat of cats) items[cat] = rng.pick(POOL[cat], n);
  if (timeCatIdx >= 0)
    items.time.sort((a,b) => POOL.time.indexOf(a) - POOL.time.indexOf(b));

  // 生成答案排列
  const sol = nonDetCats.map(() => rng.shuffle(Array.from({length:n}, (_,i)=>i)));

  // ---- 各类候选线索 ----

  // 正向跨类别（两个非侦探类别，推理链核心）
  const crossPos = [];
  for (let ci=0; ci<M; ci++) for (let cj=ci+1; cj<M; cj++) for (let d=0; d<n; d++)
    crossPos.push({ cA:ci, iA:sol[ci][d], cB:cj, iB:sol[cj][d], isNeg:false });

  // 负向跨类别（需要排除法，难度更高）
  const crossNeg = [];
  for (let ci=0; ci<M; ci++) for (let cj=ci+1; cj<M; cj++) for (let d=0; d<n; d++)
    for (let v=0; v<n; v++) if (v!==sol[cj][d])
      crossNeg.push({ cA:ci, iA:sol[ci][d], cB:cj, iB:v, isNeg:true });

  // 侦探正向线索（indirect = 非 case；case = detective_case 直接）
  const detPosIndirect = [];
  const detPosCase = [];
  for (let d=0; d<n; d++) for (let ci=0; ci<M; ci++) {
    const fact = { cA:-1, iA:d, cB:ci, iB:sol[ci][d], isNeg:false };
    if (nonDetCats[ci] === 'case') detPosCase.push(fact);
    else detPosIndirect.push(fact);
  }

  // 侦探负向线索（用于困难模式代替正向直接线索）
  const detNegIndirect = [];  // detective→non-case 否定
  const detNegCase = [];      // detective→case 否定
  for (let d=0; d<n; d++) for (let ci=0; ci<M; ci++) {
    for (let v=0; v<n; v++) {
      if (v === sol[ci][d]) continue;
      const fact = { cA:-1, iA:d, cB:ci, iB:v, isNeg:true };
      if (nonDetCats[ci] === 'case') detNegCase.push(fact);
      else detNegIndirect.push(fact);
    }
  }

  // 侦探时段范围线索（与 rangeFacts 同格式，cA=-1 表示侦探）
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

  // 时序线索（案件/证物/嫌疑人，不含地点）
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

  // 范围线索（时段分组，案件/证物/嫌疑人）
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

  // ---- 按难度构建候选排列（用于多次尝试取最优） ----
  // 目标线索数：简单≤9，中等≤14，困难≤19
  // 统一策略：正向跨类别（crossPos）交替排列为主干，保证推理链多样性
  //   - 困难：禁止 detective→case 直接线索
  //   - 中等：最多 1 条 detective→case 直接线索
  //   - 简单：最多 3 条 detective→case 直接线索
  const TARGET = { easy: 9, medium: 14, hard: 19 }[difficulty];

  const buildOrdered = (r) => {
    // 将 crossPos 按类别对分组后交替排列，确保覆盖所有推理链方向。
    // crossPos 永远是推理主干（每条编码一对实体关系，最高密度），故置于首位。
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

    // 二级线索分组：每次随机洗牌它们之间的优先级顺序，让不同日期的题目
    // 在"先用比较线索 / 先用直接锚点 / 先用排除"上表现出不同口味，避免审美疲劳。
    const secondaryGroups = [
      r.shuffle(orderFacts),
      r.shuffle(rangeFacts),
      r.shuffle(detRangeFacts),
      r.shuffle(detPosIndirect), // 间接侦探锚点（非案件）
      r.shuffle(detPosCase),     // 直接侦探→案件（困难禁止，中等≤1，简单≤3）
      r.shuffle(detNegSample),   // 侦探负向：排除法补足
    ];
    const shuffledSecondary = r.shuffle(secondaryGroups).flatMap(g => g);

    return [...il, ...shuffledSecondary];
  };

  // 展开范围线索为负向集合（供 AC-3 验证）
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

  // 贪心约束：
  //   detective→case：easy≤3, medium≤1, hard=0
  //   范围模板：困难≤2，其余≤1
  //   时序模板：困难≤3，其余≤2
  const detPosCaseMax = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 1 : 0;
  const rangeMax = difficulty === 'hard' ? 2 : 1;
  const ordMax   = difficulty === 'hard' ? 3 : 2;

  // 计算线索模板键 & 上限
  //   - 范围 / 时序：保留原上限（rangeMax / ordMax）
  //   - 凡是涉及侦探的 direct 模板（detective_X）：每个模板至多 1 次
  //     （因这类模板都是「侦探名+动作」，重复会显得突兀）
  //   - 非侦探间的 direct 模板：不限次（推理链主干，需要多次使用）
  function templateInfo(fact, caps) {
    if (fact.isRange)   return { key: 'range_' + (fact.cA < 0 ? 'detective' : nonDetCats[fact.cA]), cap: caps.range };
    if (fact.isOrdered) return { key: 'ord_'   + nonDetCats[fact.cA], cap: caps.ord };
    const cAkey = fact.cA < 0 ? 'detective' : nonDetCats[fact.cA];
    const cBkey = fact.cB < 0 ? 'detective' : nonDetCats[fact.cB];
    const pair  = [cAkey, cBkey].sort().join('_');
    const involvesDetective = (fact.cA < 0 || fact.cB < 0);
    const cap = involvesDetective ? 1 : Infinity;
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
    // 去冗余
    for (let i = used.length-1; i >= 0; i--) {
      const without = used.filter((_,j) => j!==i);
      if (ambiguousCount(expand(without), n, M, timeCatIdx) === 0) used.splice(i, 1);
    }
    return used;
  }

  // 候选多样性：同长度时优先选含更多线索类型的候选，避免"全是直接正向"的单调感
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

  // 多次尝试不同随机排列，取线索最少 + 多样性最高的结果
  const baseSeed = seed(date, difficulty);
  const offsets = [0, 99991, 199993, 299989, 399979, 499967, 599959, 699937, 799991, 899981,
                   999983, 1099997, 1200007, 1300019, 1400003, 1500017, 1600033, 1700023, 1800011, 1900007];
  let used = null;
  for (const offset of offsets) {
    const candidate = runGreedy(buildOrdered(makeRng(baseSeed + offset)));
    if (isBetter(candidate, used)) used = candidate;
    if (used.length <= TARGET && diversityScore(used) >= 2) break;
  }

  // 困难模式后备：先用更多种子重试原贪心，再放开 detective→case 限制
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
    const origMax = detPosCaseMax; // 0
    // 临时覆盖贪心内的 detPosCaseMax，需重写局部函数
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
      // Put detPosCase first in the fallback ordered list so it anchors early
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
        ...r.shuffle(detPosCase),         // detective→case 放最前作为早期锚点
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
    id: cat, name: cfg.names[cat], icon: cfg.icons[cat],
    items: items[cat].map((name,i) => ({ id: prefix[cat]+(i+1), name })),
  }));

  const ck = c => c < 0 ? 'detective' : nonDetCats[c];
  const nm = (c,i) => c < 0 ? items.detective[i] : items[nonDetCats[c]][i];
  const id = (c,i) => (c < 0 ? prefix.detective : prefix[nonDetCats[c]]) + (i+1);

  const clues = used.map((fact, idx) => {
    if (fact.isRange) {
      const cAkey = ck(fact.cA);
      const validItemIds = fact.validTimeIndices.map(t => prefix.time+(t+1));
      return {
        id: `cl${idx+1}`, type: 'category_range',
        text: (RANGE[cAkey]??((a,p)=>`${a}在${p}时段`))(nm(fact.cA, fact.iA), fact.period),
        params: { categoryA:cAkey, itemA:id(fact.cA,fact.iA), categoryB:'time', itemB:'', validItems:validItemIds },
      };
    }
    if (fact.isOrdered) {
      const cAkey=ck(fact.cA), cBkey=ck(fact.cB);
      return {
        id: `cl${idx+1}`, type: 'ordered_before',
        text: ordTxt(cAkey, nm(fact.cA,fact.iA), cBkey, nm(fact.cB,fact.iB)),
        params: { categoryA:cAkey, itemA:id(fact.cA,fact.iA), categoryB:cBkey, itemB:id(fact.cB,fact.iB), categoryC:'time' },
      };
    }
    const cAkey=ck(fact.cA), cBkey=ck(fact.cB);
    const a=nm(fact.cA,fact.iA), b=nm(fact.cB,fact.iB);
    return {
      id: `cl${idx+1}`,
      type: fact.isNeg ? 'direct_negative' : 'direct_positive',
      text: fact.isNeg ? negTxt(cAkey,a,cBkey,b) : posTxt(cAkey,a,cBkey,b),
      params: { categoryA:cAkey, itemA:id(fact.cA,fact.iA), categoryB:cBkey, itemB:id(fact.cB,fact.iB) },
    };
  });

  const assignments = {};
  for (let d=0; d<n; d++)
    assignments[prefix.detective+(d+1)] = Object.fromEntries(
      nonDetCats.map((cat,ci) => [cat, prefix[cat]+(sol[ci][d]+1)])
    );

  const title = TITLES[difficulty][parseInt(date.replace(/-/g,'')) % TITLES[difficulty].length];
  return {
    id:`${difficulty}-${date}`, date, difficulty, title,
    description: cfg.desc(n),
    categories, clues,
    solution: { primaryCategoryId:'detective', assignments },
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
const stmt = db.prepare('INSERT OR REPLACE INTO puzzles (date, difficulty, data) VALUES (?, ?, ?)');
const insertAll = db.transaction(rows => { for (const r of rows) stmt.run(r.date, r.diff, r.data); });

console.log(`生成 ${dates.length} 天 × 3 档难度 = ${dates.length*3} 道题…`);
const rows = [];
let failed = 0;
const typeStats = { easy: {}, medium: {}, hard: {} }; // per-difficulty type counts
for (const date of dates) {
  for (const diff of ['easy','medium','hard']) {
    const puzzle = generatePuzzle(date, diff);
    const cfg = CONF[diff];
    const nonDetCats = cfg.cats.filter(c=>c!=='detective');
    const timeCatIdx = nonDetCats.indexOf('time');
    const clueList = puzzle.clues.flatMap(cl => {
      if (cl.type === 'category_range') {
        const validIdxs = (cl.params.validItems??[]).map(id => parseInt(id.slice(1))-1);
        const cA = cl.params.categoryA==='detective' ? -1 : nonDetCats.indexOf(cl.params.categoryA);
        const iA = parseInt(cl.params.itemA.slice(1))-1;
        return Array.from({length:cfg.n}, (_,t) => validIdxs.includes(t)?null:{cA,iA,cB:timeCatIdx,iB:t,isNeg:true}).filter(Boolean);
      }
      if (cl.type === 'ordered_before') {
        const cA = cl.params.categoryA==='detective' ? -1 : nonDetCats.indexOf(cl.params.categoryA);
        const cB = cl.params.categoryB==='detective' ? -1 : nonDetCats.indexOf(cl.params.categoryB);
        return [{ isOrdered:true, cA, iA:parseInt(cl.params.itemA.slice(1))-1, cB, iB:parseInt(cl.params.itemB.slice(1))-1 }];
      }
      const cA = cl.params.categoryA==='detective' ? -1 : nonDetCats.indexOf(cl.params.categoryA);
      const cB = cl.params.categoryB==='detective' ? -1 : nonDetCats.indexOf(cl.params.categoryB);
      return [{ cA, iA:parseInt(cl.params.itemA.slice(1))-1, cB, iB:parseInt(cl.params.itemB.slice(1))-1, isNeg:cl.type==='direct_negative' }];
    });
    const ambig = ambiguousCount(clueList, cfg.n, nonDetCats.length, timeCatIdx);
    if (ambig !== 0) { console.warn(`  ⚠ ${date} ${diff}: 歧义=${ambig}`); failed++; }
    // 统计该题用了哪几类线索
    const types = new Set(puzzle.clues.map(c => c.type));
    const k = [...types].sort().join('+');
    typeStats[diff][k] = (typeStats[diff][k] || 0) + 1;
    rows.push({ date, diff, data: JSON.stringify(puzzle) });
  }
}
insertAll(rows);
console.log(`完成！插入 ${rows.length} 道题，验证失败 ${failed} 道。`);
console.log('线索类型组合分布:');
for (const diff of ['easy', 'medium', 'hard']) {
  const entries = Object.entries(typeStats[diff]).sort((a, b) => b[1] - a[1]);
  console.log(`  ${diff}: ${entries.map(([k, v]) => `${k}×${v}`).join(', ')}`);
}
