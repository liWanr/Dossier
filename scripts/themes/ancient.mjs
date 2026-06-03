// Theme 2 — 古代刑名
// 古代衙门捕快缉拿凶犯。时辰用现代钟点制以保留时段分桶语义。

const an = n => n.endsWith('案') ? n : n + '案';

export const ancient = {
  id: 'ancient',
  label: '古代刑名',
  flavor: '古代县衙捕快查案，江湖坊市人物登场。',

  pool: {
    captain:   ['展昭','白玉堂','秦明','宋慎','韩湘','卫渊','沈砚','赵元','顾允','谢晏','裴砚舟','陆昭','钟韫','江砚','叶溯'],
    case:      ['黄花镖局劫','古刹失宝','客栈灭门','钱庄盗银','茶楼下毒','文渊阁焚书','九江沉船','官道劫贡','妓楼遇刺','冷月孤刀','西街凶杀','东市烧楼','废宅密室','码头浮尸','失踪贡品'],
    suspect:   ['白衣公子','江湖郎中','黑帮舵主','流浪侠女','瘸腿乞丐','胡商商人','蒙面剑客','失意举子','卖花姑娘','酒楼掌柜','瞎眼算命','马帮帮主','奸细密探','贪官仆从','刺青大汉'],
    evidence:  ['断折玉佩','血染长剑','撕毁文书','可疑信笺','沾灰布鞋','私印印泥','遗落钱袋','残余毒药','藏宝舆图','江湖暗号','假冒户帖','马蹄印拓','染血手帕','匿名书函','黑色面巾'],
    location:  ['西城坊','码头渡口','望月楼','废弃驿馆','驿站车马','地下赌坊','旧城集市','停柩义庄','八方酒楼','郊外别院','官道驿亭','县学书堂','钱庄金窖','烟花楚馆','货栈仓房'],
  },

  cats: {
    captain:  { name: '捕快',   icon: '🗡️', prefix: 'd' },
    case:     { name: '案件',   icon: '📜', prefix: 'c' },
    suspect:  { name: '嫌犯',   icon: '👤', prefix: 's' },
    evidence: { name: '物证',   icon: '🏮', prefix: 'e' },
    time:     { name: '时辰',   icon: '🕯️', prefix: 't' },
    location: { name: '坊市',   icon: '🏯', prefix: 'l' },
  },

  difficulties: {
    easy:   { n: 4, cats: ['captain','case','evidence','time'],
              desc: n => `${n}名衙门捕快各自缉拿凶犯，请根据线索推断每位捕快办的案件、物证与报案时辰。` },
    medium: { n: 5, cats: ['captain','case','evidence','time','location'],
              desc: n => `${n}名捕快各办一案，请根据线索推断每位捕快的案件、物证、时辰与坊市。` },
    hard:   { n: 6, cats: ['captain','case','suspect','evidence','time','location'],
              desc: n => `${n}名捕快缉凶查案，请根据线索推断每位捕快的案件、嫌犯、物证、时辰与坊市。` },
  },

  titles: {
    easy:   ['初晓案情','四衙合查','简案追凶','坊市风波','四路办案','线索初露','明察四方','初判文牒'],
    medium: ['五案密报','重重迷雾','暗藏玄机','五路缉凶','错综文书','寻迹江湖','谜案五重','案宗五卷'],
    hard:   ['六案错综','迷雾重重','悬案六重','六道追凶','险局突破','迷阵查案','文牒六册','迷局深沉'],
  },

  formatItem: { case: an },

  POS: {
    captain_case:     [(a,b) => `${a}受命查办的便是${b}`,           (a,b) => `${b}这桩案子由${a}经手`],
    captain_evidence: [(a,b) => `${a}从现场带回了${b}`,             (a,b) => `${b}是${a}的呈堂物证`],
    captain_time:     [(a,b) => `${a}是在${b}接到差牒的`,           (a,b) => `${a}受命的时辰正是${b}`],
    captain_location: [(a,b) => `${a}前往${b}查案`,                 (a,b) => `${a}的踏勘之地是${b}`],
    captain_suspect:  [(a,b) => `${a}盯上的嫌犯正是${b}`,           (a,b) => `${a}最终拘下了${b}`],
    case_evidence:    [(a,b) => `${a}的现场遗有${b}`,               (a,b) => `${b}见于${a}的案发处`],
    case_time:        [(a,b) => `${a}的报案时辰是${b}`,             (a,b) => `${a}于${b}惊动衙门`],
    case_location:    [(a,b) => `${a}发生在${b}`,                   (a,b) => `${b}成了${a}的案发处`],
    case_suspect:     [(a,b) => `${a}的最大嫌犯是${b}`,             (a,b) => `${a}的疑兇指向${b}`],
    evidence_time:    [(a,b) => `${a}是在${b}被找到的`,             (a,b) => `${b}时分${a}才落入手中`],
    evidence_location:[(a,b) => `${a}遗落在${b}`,                   (a,b) => `${b}发现了${a}`],
    suspect_evidence: [(a,b) => `${a}留下了${b}`,                   (a,b) => `${b}指向${a}所为`],
    time_location:    [(a,b) => `${b}的案发时辰正是${a}`,           (a,b) => `${b}在${a}沦为案发处`],
    suspect_time:     [(a,b) => `${a}于${b}被人目睹`,               (a,b) => `${b}时有人撞见${a}`],
    suspect_location: [(a,b) => `${a}见于${b}`,                     (a,b) => `${b}附近闪过${a}的身影`],
  },
  NEG: {
    captain_case:     [(a,b) => `${a}并未经办${b}`,                 (a,b) => `${b}不在${a}的差牒上`],
    captain_evidence: [(a,b) => `${a}未曾接触${b}`,                 (a,b) => `${b}和${a}全无干系`],
    captain_time:     [(a,b) => `${b}时${a}并未受命`,               (a,b) => `${a}并非在${b}接的差牒`],
    captain_location: [(a,b) => `${a}并未前往${b}`,                 (a,b) => `${b}不属${a}踏勘之地`],
    captain_suspect:  [(a,b) => `${a}排除了${b}的嫌疑`,             (a,b) => `${a}已洗清${b}`],
    case_evidence:    [(a,b) => `${a}与${b}无关`,                   (a,b) => `${b}并非${a}的物证`],
    case_time:        [(a,b) => `${a}并非在${b}报案`,               (a,b) => `${b}不是${a}的报案时辰`],
    case_location:    [(a,b) => `${a}并非发生在${b}`,               (a,b) => `${b}不是${a}的案发处`],
    case_suspect:     [(a,b) => `${a}的嫌犯不是${b}`,               (a,b) => `${a}与${b}毫无干系`],
    evidence_time:    [(a,b) => `${a}并非在${b}被找到`,             (a,b) => `${b}时未见${a}`],
    evidence_location:[(a,b) => `${a}并非遗于${b}`,                 (a,b) => `${b}没有${a}的痕迹`],
    suspect_evidence: [(a,b) => `${a}并未留下${b}`,                 (a,b) => `${b}并非${a}所遗`],
    time_location:    [(a,b) => `${b}的案发时辰并非${a}`,           (a,b) => `${a}时${b}尚平静`],
    suspect_time:     [(a,b) => `${a}在${b}未曾露面`,               (a,b) => `${b}时无人见${a}`],
    suspect_location: [(a,b) => `${a}未现身${b}`,                   (a,b) => `${b}无${a}的踪影`],
  },
  ORD: {
    case_case:         [(a,b) => `${a}的报案时辰早于${b}`,          (a,b) => `${b}比${a}迟报案`],
    evidence_evidence: [(a,b) => `${a}比${b}更早被找到`,            (a,b) => `${b}是在${a}之后才落到手中`],
    suspect_suspect:   [(a,b) => `${a}比${b}更早出现在案发处`,      (a,b) => `${b}比${a}晚出现`],
    location_location: [(a,b) => `${b}的案发时辰晚于${a}`,          (a,b) => `${a}先告变，${b}才告变`],
  },
  RANGE: {
    case:      [(a,p) => `${a}发生在${p}时段`,                       (a,p) => `${a}集中在${p}时段告变`],
    evidence:  [(a,p) => `${a}是在${p}时段找到的`,                   (a,p) => `${p}时段才见${a}`],
    suspect:   [(a,p) => `${a}在${p}时段现身案发处`,                 (a,p) => `${p}时段有人撞见${a}`],
    captain:   [(a,p) => `${a}是在${p}时段接到差牒的`,               (a,p) => `${a}的受命时辰落在${p}时段`],
  },
};
