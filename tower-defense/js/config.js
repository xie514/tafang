// ============ 全局配置 ============
// 所有可调参数集中在此，方便长期开发调平衡。
const CONFIG = {
  // 画布与网格
  canvas: { width: 960, height: 640 },
  grid: {
    cols: 20,
    rows: 13,
    cell: 48,          // 20*48=960, 13*48=624 (留点边距)
    offsetX: 0,
    offsetY: 8,
  },

  // 地图格子类型
  TILE: {
    GROUND: 0,   // 可建塔草地
    PATH: 1,     // 敌人路径
    BLOCK: 2,    // 障碍/装饰，不可建塔
    SPAWN: 3,    // 出生点
    BASE: 4,     // 基地/终点
  },

  // 初始资源
  startGold: 100,
  startHp: 20,

  // 塔类型定义
  towers: {
    arrow: {
      key: 'arrow',
      name: '箭塔',
      cost: 30,
      color: '#6cf',
      range: 120,
      damage: 8,
      fireRate: 1.2,    // 每秒射击次数
      bulletSpeed: 420,
      bulletColor: '#9df',
      desc: '均衡单体攻击',
    },
    cannon: {
      key: 'cannon',
      name: '炮塔',
      cost: 60,
      color: '#ff9f43',
      range: 100,
      damage: 22,
      fireRate: 0.7,
      bulletSpeed: 320,
      bulletColor: '#ffcc66',
      splash: 40,        // 溅射半径
      desc: '范围溅射伤害',
    },
    frost: {
      key: 'frost',
      name: '冰塔',
      cost: 45,
      color: '#7ee0ff',
      range: 110,
      damage: 4,
      fireRate: 1.0,
      bulletSpeed: 360,
      bulletColor: '#bff',
      slow: { factor: 0.5, duration: 1.5 },  // 减速
      desc: '减速敌人',
    },
  },

  // 出售返还比例
  sellRatio: 0.6,

  // 波次配置：每波若干敌人
  // 敌人类型见 enemies
  waves: [
    { count: 8,  interval: 0.9, type: 'slime',  hpMul: 1.0 },
    { count: 12, interval: 0.8, type: 'slime',  hpMul: 1.2 },
    { count: 10, interval: 0.7, type: 'runner', hpMul: 1.0 },
    { count: 14, interval: 0.65,type: 'slime',  hpMul: 1.6 },
    { count: 8,  interval: 0.9, type: 'tank',   hpMul: 1.0 },
    { count: 18, interval: 0.55,type: 'runner', hpMul: 1.4 },
    { count: 12, interval: 0.8, type: 'tank',   hpMul: 1.3 },
    { count: 20, interval: 0.5, type: 'slime',  hpMul: 2.2 },
  ],

  // 敌人类型
  enemies: {
    slime:  { name: '史莱姆', hp: 40,  speed: 55,  reward: 6,  radius: 13, color: '#8ce99a', armor: 0 },
    runner: { name: '疾行者', hp: 28,  speed: 110, reward: 8,  radius: 11, color: '#ffd43b', armor: 0 },
    tank:   { name: '重装',   hp: 160, speed: 35,  reward: 18, radius: 17, color: '#ff8787', armor: 2 },
  },

  // 每波清完奖励
  waveClearBonus: 20,
};