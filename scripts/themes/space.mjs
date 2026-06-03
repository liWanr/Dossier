// Theme 5 — 太空惊魂
// 深空科研站异常事件，宇航员各自调查。

export const space = {
  id: 'space',
  label: '太空惊魂',
  flavor: '深空科研站突发异常，宇航员各自调查。',

  pool: {
    astronaut: ['李珩','齐沐','顾远舟','沈昭','陆寰','江岑','钟晚','叶野','秦深','邵屿','韩岚','宇辰','方知节','卫澜','余川'],
    case:      ['通讯中断','样本失窃','舱门异响','气闸故障','导航偏移','量子失常','培养皿污染','日志被擦除','机械臂失控','能源外泄','水循环异常','重力波偏移','医疗舱告警','黑箱坠毁','信号雷达异变'],
    suspect:   ['新晋研究员','维修工程师','医疗专员','地面联络员','流亡科学家','AI管家','货运船员','船外作业组','信号干扰源','私自登舱者','失踪船员','加密日志作者','旧任站长','货舱潜入者','远程指挥官'],
    evidence:  ['可疑样本管','残破钥匙卡','量子残留','加密录音','磁带残片','失效芯片','遗落工具包','污染滤膜','数据日志副本','破损遥控','遗失通行证','带血指纹','匿名讯息','黑色滤镜','金属碎片'],
    location:  ['指挥舱','生物实验室','货物舱','气闸舱','医疗舱','观测舱','能源核心舱','船外平台','机械臂工位','睡眠舱','水循环舱','通讯中枢','日志室','数据中心','货柜外舱'],
  },

  cats: {
    astronaut:{ name: '宇航员', icon: '🚀', prefix: 'd' },
    case:     { name: '事件',   icon: '⚠️', prefix: 'c' },
    suspect:  { name: '嫌疑人', icon: '👤', prefix: 's' },
    evidence: { name: '物证',   icon: '🧪', prefix: 'e' },
    time:     { name: '时段',   icon: '🛰️', prefix: 't' },
    location: { name: '舱段',   icon: '🛸', prefix: 'l' },
  },

  difficulties: {
    easy:   { n: 4, cats: ['astronaut','case','evidence','time'],
              desc: n => `${n}名宇航员分别调查站内异常，请根据线索推断每位调查者的事件、物证与发生时段。` },
    medium: { n: 5, cats: ['astronaut','case','evidence','time','location'],
              desc: n => `${n}名宇航员展开调查，请根据线索推断每位调查者的事件、物证、时段与舱段。` },
    hard:   { n: 6, cats: ['astronaut','case','suspect','evidence','time','location'],
              desc: n => `${n}名宇航员追查站内异常，请根据线索推断每位调查者的事件、嫌疑人、物证、时段与舱段。` },
  },

  titles: {
    easy:   ['四号警报','信号初现','深空线索','站内四案','轨道警讯','信号四束','基础侦测','站务速报'],
    medium: ['五重警报','迷雾轨道','五位调查员','深空之谜','五道线索','站务推进','轨道谜局','五线追溯'],
    hard:   ['六重警报','深空异变','六线追凶','迷雾深处','站务终局','轨道密令','六位调查员','失重谜局'],
  },

  formatItem: {},

  POS: {
    astronaut_case:     [(a,b) => `${a}负责追查的就是${b}`,         (a,b) => `${b}的调查任务交给了${a}`],
    astronaut_evidence: [(a,b) => `${a}从现场带回了${b}`,           (a,b) => `${b}是${a}从舱内带出的`],
    astronaut_time:     [(a,b) => `${a}是在${b}收到警报的`,         (a,b) => `${a}的告警时间正是${b}`],
    astronaut_location: [(a,b) => `${a}前往${b}排查`,               (a,b) => `${a}的勘查地点是${b}`],
    astronaut_suspect:  [(a,b) => `${a}最终锁定的嫌疑人是${b}`,     (a,b) => `${a}的怀疑对象是${b}`],
    case_evidence:      [(a,b) => `${a}的现场遗留了${b}`,           (a,b) => `${b}与${a}相关`],
    case_time:          [(a,b) => `${a}发生于${b}`,                 (a,b) => `${a}的告警时刻是${b}`],
    case_location:      [(a,b) => `${a}发生在${b}`,                 (a,b) => `${b}是${a}的发生地`],
    case_suspect:       [(a,b) => `${a}的主要嫌疑人是${b}`,         (a,b) => `${a}的可疑源指向${b}`],
    evidence_time:      [(a,b) => `${a}是在${b}被发现的`,           (a,b) => `${b}时${a}才被读取出来`],
    evidence_location:  [(a,b) => `${a}是在${b}找到的`,             (a,b) => `${b}里出现了${a}`],
    suspect_evidence:   [(a,b) => `${a}遗留下${b}`,                 (a,b) => `${b}指向${a}`],
    time_location:      [(a,b) => `${b}的异常时刻是${a}`,           (a,b) => `${a}时${b}发出告警`],
    suspect_time:       [(a,b) => `${a}在${b}有过出舱记录`,         (a,b) => `${b}的航行记录中出现了${a}`],
    suspect_location:   [(a,b) => `${a}曾出现在${b}`,               (a,b) => `${b}的扫描记录里见过${a}`],
  },
  NEG: {
    astronaut_case:     [(a,b) => `${a}并未跟进${b}`,               (a,b) => `${b}并不归${a}负责`],
    astronaut_evidence: [(a,b) => `${a}未曾接触${b}`,               (a,b) => `${b}并不属于${a}`],
    astronaut_time:     [(a,b) => `${b}时${a}没有收到告警`,         (a,b) => `${a}并非在${b}响应的`],
    astronaut_location: [(a,b) => `${a}没有进入${b}`,               (a,b) => `${b}不在${a}的勘查范围`],
    astronaut_suspect:  [(a,b) => `${a}排除了${b}的嫌疑`,           (a,b) => `${a}不再怀疑${b}`],
    case_evidence:      [(a,b) => `${a}与${b}无关`,                 (a,b) => `${b}不是${a}的物证`],
    case_time:          [(a,b) => `${a}并非发生于${b}`,             (a,b) => `${b}并非${a}的时刻`],
    case_location:      [(a,b) => `${a}并未发生在${b}`,             (a,b) => `${b}不是${a}的发生地`],
    case_suspect:       [(a,b) => `${a}的嫌疑人不是${b}`,           (a,b) => `${b}与${a}无关联`],
    evidence_time:      [(a,b) => `${a}并非在${b}被发现`,           (a,b) => `${b}时未见${a}`],
    evidence_location:  [(a,b) => `${a}并非在${b}找到`,             (a,b) => `${b}并未出现${a}`],
    suspect_evidence:   [(a,b) => `${a}没有留下${b}`,               (a,b) => `${b}并非${a}所遗`],
    time_location:      [(a,b) => `${b}并非在${a}告警`,             (a,b) => `${a}时${b}一切正常`],
    suspect_time:       [(a,b) => `${a}在${b}没有出舱`,             (a,b) => `${b}时未记录${a}`],
    suspect_location:   [(a,b) => `${a}未在${b}出现`,               (a,b) => `${b}没有${a}的踪迹`],
  },
  ORD: {
    case_case:         [(a,b) => `${a}的告警早于${b}`,              (a,b) => `${b}比${a}晚响起`],
    evidence_evidence: [(a,b) => `${a}比${b}更早被读取`,            (a,b) => `${b}是在${a}之后才出现的`],
    suspect_suspect:   [(a,b) => `${a}比${b}更早进入舱段`,          (a,b) => `${b}比${a}晚抵达`],
    location_location: [(a,b) => `${b}的告警晚于${a}`,              (a,b) => `${a}先告警，${b}再告警`],
  },
  RANGE: {
    case:      [(a,p) => `${a}发生在${p}时段`,                       (a,p) => `${a}的告警集中在${p}时段`],
    evidence:  [(a,p) => `${a}是在${p}时段被发现的`,                 (a,p) => `${p}时段才读取到${a}`],
    suspect:   [(a,p) => `${a}在${p}时段有过活动记录`,               (a,p) => `${p}时段曾扫描到${a}`],
    astronaut: [(a,p) => `${a}是在${p}时段接到告警的`,               (a,p) => `${a}的响应时段是${p}`],
  },
};
