// Theme 3 — 校园悬案
// 高校推理社团调查校园里的小事件。轻松、生活化。

export const school = {
  id: 'school',
  label: '校园悬案',
  flavor: '校园推理社团调查发生在学校里的悬疑事件。',

  pool: {
    student:   ['林书言','沈知雪','顾时予','陆景遥','苏念','谢南鸢','江砚','叶星河','秦深','邵清','韩昊','钟离笙','方亦舟','卫沉默','余溪'],
    case:      ['校刊失窃','图书馆怪声','操场涂鸦','社团箱被撬','广播室异响','保险柜密码','食堂闹鬼','旧楼火警','化学室爆响','失物悬赏','教师办公室翻动','体育用品丢失','校园寻人','音乐厅匿名','美术教室失窃'],
    suspect:   ['转学新生','保安大叔','保洁阿姨','学长','学姐','复读生','外校学生','流浪猫管理员','校刊主编','社联干部','化学课代表','戴口罩同学','体育委员','广播社社员','值日生'],
    evidence:  ['撕掉的便签','带血的橡皮','破碎的吊坠','社团徽章','匿名U盘','口香糖纸','遗失的水杯','沾墨水的手套','一页课表','可疑通讯录','校卡复印件','带泥的鞋印','陌生人头发','加密日记','黑色雨伞'],
    location:  ['图书馆','体育馆','旧教学楼','地下车库','音乐厅','化学实验室','操场看台','后门小巷','社团活动室','食堂二楼','美术教室','广播站','天台','档案室','地下储物室'],
  },

  cats: {
    student:  { name: '社员',   icon: '🎒', prefix: 'd' },
    case:     { name: '事件',   icon: '📔', prefix: 'c' },
    suspect:  { name: '嫌疑人', icon: '👥', prefix: 's' },
    evidence: { name: '物品',   icon: '📎', prefix: 'e' },
    time:     { name: '时段',   icon: '⏰', prefix: 't' },
    location: { name: '场所',   icon: '🏫', prefix: 'l' },
  },

  difficulties: {
    easy:   { n: 4, cats: ['student','case','evidence','time'],
              desc: n => `${n}名推理社社员各自调查一桩校园事件，请根据线索推断他们各自的事件、找到的物品与发生时段。` },
    medium: { n: 5, cats: ['student','case','evidence','time','location'],
              desc: n => `${n}名社员展开调查，请根据线索推断每人调查的事件、物品、时段与发生场所。` },
    hard:   { n: 6, cats: ['student','case','suspect','evidence','time','location'],
              desc: n => `${n}名社员调查校园奇案，请根据线索推断每人面对的事件、嫌疑人、物品、时段与场所。` },
  },

  titles: {
    easy:   ['社团初探','放学后的谜','四人小记','操场风波','社刊速递','线索初萌','四件小事','社团办公记'],
    medium: ['五件小怪事','社团周报','放学谜踪','五案社记','迷雾走廊','线索图鉴','五重小谜','放学后的脚印'],
    hard:   ['六重校园谜','社团终极调查','悬案六案','六线追凶','迷雾深处','放学后的真相','六件迷案','档案室秘录'],
  },

  // No suffix needed for events in school setting
  formatItem: {},

  POS: {
    student_case:     [(a,b) => `${a}负责调查的就是${b}`,           (a,b) => `${b}由${a}经手记录`],
    student_evidence: [(a,b) => `${a}捡到了${b}`,                   (a,b) => `${b}是${a}带回社团的`],
    student_time:     [(a,b) => `${a}是在${b}发现异常的`,           (a,b) => `${a}发觉不对的时间正是${b}`],
    student_location: [(a,b) => `${a}前往${b}查看`,                 (a,b) => `${a}的踩点地点是${b}`],
    student_suspect:  [(a,b) => `${a}最关注的嫌疑人是${b}`,         (a,b) => `${a}的笔记本上写着${b}`],
    case_evidence:    [(a,b) => `${a}的现场留下了${b}`,             (a,b) => `${b}和${a}有关`],
    case_time:        [(a,b) => `${a}发生在${b}`,                   (a,b) => `${a}的时间锁定在${b}`],
    case_location:    [(a,b) => `${a}发生于${b}`,                   (a,b) => `${b}是${a}的发生地`],
    case_suspect:     [(a,b) => `${a}的主要嫌疑人是${b}`,           (a,b) => `${a}的嫌疑落在${b}身上`],
    evidence_time:    [(a,b) => `${a}是在${b}被发现的`,             (a,b) => `${b}时分${a}才被注意到`],
    evidence_location:[(a,b) => `${a}是在${b}找到的`,               (a,b) => `${b}里出现了${a}`],
    suspect_evidence: [(a,b) => `${a}遗落了${b}`,                   (a,b) => `${b}指向${a}`],
    time_location:    [(a,b) => `${b}的异常出现在${a}`,             (a,b) => `${a}时${b}最热闹`],
    suspect_time:     [(a,b) => `${a}在${b}被看到过`,               (a,b) => `${b}时有人见过${a}`],
    suspect_location: [(a,b) => `${a}被目击于${b}`,                 (a,b) => `${b}附近闪过${a}的身影`],
  },
  NEG: {
    student_case:     [(a,b) => `${a}没有跟进${b}`,                 (a,b) => `${b}并不是${a}负责的`],
    student_evidence: [(a,b) => `${a}并未接触${b}`,                 (a,b) => `${b}和${a}无关`],
    student_time:     [(a,b) => `${b}时${a}没有去现场`,             (a,b) => `${a}并非在${b}发觉的`],
    student_location: [(a,b) => `${a}没有去${b}`,                   (a,b) => `${b}不在${a}的踩点范围`],
    student_suspect:  [(a,b) => `${a}排除了${b}`,                   (a,b) => `${a}已不再怀疑${b}`],
    case_evidence:    [(a,b) => `${a}与${b}没有关系`,               (a,b) => `${b}并非${a}的线索`],
    case_time:        [(a,b) => `${a}并非发生在${b}`,               (a,b) => `${b}不是${a}的时间点`],
    case_location:    [(a,b) => `${a}并非在${b}发生`,               (a,b) => `${b}不是${a}的发生地`],
    case_suspect:     [(a,b) => `${a}的嫌疑人不是${b}`,             (a,b) => `${b}与${a}无关`],
    evidence_time:    [(a,b) => `${a}并非在${b}被发现`,             (a,b) => `${b}时尚未看见${a}`],
    evidence_location:[(a,b) => `${a}并非在${b}找到`,               (a,b) => `${b}里没见过${a}`],
    suspect_evidence: [(a,b) => `${a}没有遗落${b}`,                 (a,b) => `${b}并非${a}留下的`],
    time_location:    [(a,b) => `${b}并非在${a}出事`,               (a,b) => `${a}时${b}一切如常`],
    suspect_time:     [(a,b) => `${a}在${b}没出现`,                 (a,b) => `${b}时未见${a}`],
    suspect_location: [(a,b) => `${a}未在${b}露面`,                 (a,b) => `${b}没有目击${a}`],
  },
  ORD: {
    case_case:         [(a,b) => `${a}的发生时间早于${b}`,          (a,b) => `${b}比${a}晚`],
    evidence_evidence: [(a,b) => `${a}比${b}更早被发现`,            (a,b) => `${b}是${a}之后才出现的`],
    suspect_suspect:   [(a,b) => `${a}比${b}更早出现在校园`,        (a,b) => `${b}比${a}晚露面`],
    location_location: [(a,b) => `${b}出事时间晚于${a}`,            (a,b) => `${a}先出事，再到${b}`],
  },
  RANGE: {
    case:      [(a,p) => `${a}集中在${p}时段`,                       (a,p) => `${a}发生在${p}时段`],
    evidence:  [(a,p) => `${a}是在${p}时段被发现的`,                 (a,p) => `${p}时段才见${a}`],
    suspect:   [(a,p) => `${a}在${p}时段在校园里活动`,               (a,p) => `${p}时段曾出现${a}`],
    student:   [(a,p) => `${a}是在${p}时段察觉异常的`,               (a,p) => `${a}的关注时段在${p}`],
  },
};
