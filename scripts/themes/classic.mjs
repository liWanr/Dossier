// Theme 1 — 经典刑侦
// Modern-day detective investigating cases. The "stock" tone of the project.

const cs = n => n.endsWith('案') ? n : n + '案';

export const classic = {
  id: 'classic',
  label: '经典刑侦',
  flavor: '现代都市刑侦背景，侦探破解案件。',

  pool: {
    detective: ['顾川','阮宁','邵杰','和宸','溯远','苏黎','沈澈','裴宴','谢璟','陆深','江宁','钟离','方晴','林越','叶修'],
    case:      ['珠宝失窃','连环纵火','神秘失踪','密室谋杀','勒索绑架','伪造文书','毒杀疑云','古董被盗','商业间谍','黑市交易','码头命案','豪宅入室','列车劫案','深夜凶案','双重身份'],
    suspect:   ['黑衣男子','红发女子','戴帽男子','神秘访客','独臂商人','蒙面歌手','秃顶老人','修女打扮','跛脚流浪者','双胞胎兄弟','假冒警察','富商太太','外国学者','哑巴店主','纹身男子'],
    evidence:  ['监控录像','血迹刀具','撕碎信件','神秘纸条','指纹手套','伪造印章','遗失钱包','毒药残留','藏匿地图','密码本册','伪造证件','脚印模具','染血手帕','匿名信件','黑色头套'],
    location:  ['旧城区','港口码头','豪华酒店','废弃仓库','火车站','地下赌场','古玩市场','停尸间','高档餐厅','郊外别墅','地铁站台','大学校园','银行金库','夜总会','集装箱区'],
  },

  cats: {
    detective: { name: '侦探',   icon: '🕵️', prefix: 'd' },
    case:      { name: '案件',   icon: '📁', prefix: 'c' },
    suspect:   { name: '嫌疑人', icon: '👤', prefix: 's' },
    evidence:  { name: '证物',   icon: '🔍', prefix: 'e' },
    time:      { name: '时间',   icon: '🕐', prefix: 't' },
    location:  { name: '地点',   icon: '📍', prefix: 'l' },
  },

  difficulties: {
    easy:   { n: 4, cats: ['detective','case','evidence','time'],
              desc: n => `${n}名侦探分别追查不同案件，请根据线索推断每位侦探的案件、证物与案发时间。` },
    medium: { n: 5, cats: ['detective','case','evidence','time','location'],
              desc: n => `${n}名侦探各自负责调查案件，请根据线索推断每位侦探的案件、证物、时间与案发地点。` },
    hard:   { n: 6, cats: ['detective','case','suspect','evidence','time','location'],
              desc: n => `${n}名侦探各自追查迷案，请根据线索推断每位侦探的案件、嫌疑人、证物、时间与地点。` },
  },

  titles: {
    easy:   ['初探案情','四案追踪','简案寻迹','案发现场','四路并查','线索初现','初判案情','明察四案'],
    medium: ['五案迷局','重重疑云','暗流涌动','五线追凶','错综线索','迷雾寻踪','谜案五重','疑案五宗'],
    hard:   ['六案悬局','错综复杂','疑云密布','六线迷局','险局破解','迷阵探案','悬案六重','谜局险境'],
  },

  // Items get a category-specific cosmetic suffix where applicable.
  formatItem: { case: cs },

  // Each template takes pre-formatted `a` and `b` strings. Multiple variants
  // are randomly sampled to vary the prose across days using the same theme.
  POS: {
    detective_case:     [(a,b) => `${a}负责追查的就是${b}`,         (a,b) => `${b}这桩案子落到了${a}头上`],
    detective_evidence: [(a,b) => `${a}从现场带走了${b}`,             (a,b) => `${b}是${a}亲手从现场带回的`],
    detective_time:     [(a,b) => `${a}在${b}接到出警通知`,           (a,b) => `${a}收到的报警时间正好是${b}`],
    detective_location: [(a,b) => `${a}在${b}展开了调查`,             (a,b) => `${a}的勘查地点是${b}`],
    detective_suspect:  [(a,b) => `${a}最终锁定的嫌疑人是${b}`,       (a,b) => `${a}的怀疑对象正是${b}`],
    case_evidence:      [(a,b) => `${a}的现场发现了${b}`,             (a,b) => `${b}是在${a}的现场找到的`],
    case_time:          [(a,b) => `${a}的报案时间是${b}`,             (a,b) => `${a}是在${b}被报案的`],
    case_location:      [(a,b) => `${a}的案发现场在${b}`,             (a,b) => `${a}发生在${b}`],
    case_suspect:       [(a,b) => `${a}的主要嫌疑人是${b}`,           (a,b) => `${a}的最大嫌疑落在${b}身上`],
    evidence_time:      [(a,b) => `${a}是在${b}被发现的`,             (a,b) => `${b}时${a}才被找到`],
    evidence_location:  [(a,b) => `${a}是在${b}找到的`,               (a,b) => `${b}是${a}的出现位置`],
    suspect_evidence:   [(a,b) => `${a}留下了${b}`,                   (a,b) => `${b}指向的人是${a}`],
    time_location:      [(a,b) => `${b}的案发时间恰好是${a}`,         (a,b) => `${b}在${a}成了案发现场`],
    suspect_time:       [(a,b) => `${a}在${b}出现过`,                 (a,b) => `${b}的目击者看到了${a}`],
    suspect_location:   [(a,b) => `${a}被目击于${b}`,                 (a,b) => `${b}附近曾出现过${a}的身影`],
  },
  NEG: {
    detective_case:     [(a,b) => `${a}与${b}毫无关联`,               (a,b) => `${b}并不是${a}手上的案子`],
    detective_evidence: [(a,b) => `${a}未曾接触过${b}`,               (a,b) => `${b}和${a}没有交集`],
    detective_time:     [(a,b) => `${a}在${b}没有行动`,               (a,b) => `${b}时${a}没有出警`],
    detective_location: [(a,b) => `${a}没有前往${b}`,                 (a,b) => `${b}并非${a}的勘查范围`],
    detective_suspect:  [(a,b) => `${a}排除了${b}的嫌疑`,             (a,b) => `${a}并不认为${b}是凶手`],
    case_evidence:      [(a,b) => `${a}与${b}没有关联`,               (a,b) => `${b}并非${a}的物证`],
    case_time:          [(a,b) => `${a}并非在${b}报案`,               (a,b) => `${b}并非${a}的报案时间`],
    case_location:      [(a,b) => `${a}并非发生在${b}`,               (a,b) => `${b}不是${a}的案发地`],
    case_suspect:       [(a,b) => `${a}的嫌疑人不是${b}`,             (a,b) => `${b}和${a}毫无瓜葛`],
    evidence_time:      [(a,b) => `${a}并非在${b}被发现`,             (a,b) => `${b}和${a}的发现无关`],
    evidence_location:  [(a,b) => `${a}并非在${b}找到`,               (a,b) => `${b}不是${a}的出现地点`],
    suspect_evidence:   [(a,b) => `${a}没有留下${b}`,                 (a,b) => `${b}并非${a}的所留之物`],
    time_location:      [(a,b) => `${b}的案发时间并非${a}`,           (a,b) => `${a}时${b}并未发案`],
    suspect_time:       [(a,b) => `${a}在${b}没有出现`,               (a,b) => `${b}时未见${a}踪影`],
    suspect_location:   [(a,b) => `${a}未在${b}露面`,                 (a,b) => `${b}没有目击到${a}`],
  },
  ORD: {
    case_case:         [(a,b) => `${a}的报案时间早于${b}`,            (a,b) => `${b}比${a}晚报案`],
    evidence_evidence: [(a,b) => `${a}比${b}更早被发现`,              (a,b) => `${b}是在${a}之后才发现的`],
    suspect_suspect:   [(a,b) => `${a}比${b}更早出现在案发区域`,      (a,b) => `${b}比${a}晚出现`],
    location_location: [(a,b) => `${b}的案发时间晚于${a}`,            (a,b) => `${a}先成为案发现场，再到${b}`],
  },
  RANGE: {
    case:      [(a,p) => `${a}发生在${p}时段`,                        (a,p) => `${a}的报案集中在${p}时段`],
    evidence:  [(a,p) => `${a}是在${p}时段被发现的`,                  (a,p) => `${p}时段才出现${a}`],
    suspect:   [(a,p) => `${a}在${p}时段出现在案发区域`,              (a,p) => `${p}时段有人见过${a}`],
    detective: [(a,p) => `${a}是在${p}时段接到出警通知的`,            (a,p) => `${a}的出警时间落在${p}时段`],
  },
};
