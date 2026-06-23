// Localization: simple key->string map with English + Chinese.
// Add a locale by extending STRINGS with a new language object.

export type Locale = 'en' | 'zh';

const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    'app.title': 'PRAESIDIUM',
    'app.tagline': 'A super large-scale tower defense',
    'menu.start': 'Start',
    'menu.levels': 'Select Level',
    'menu.endless': 'Endless Mode',
    'menu.challenge': 'Challenge Seed',
    'menu.settings': 'Settings',
    'menu.resume': 'Resume',
    'menu.retry': 'Retry',
    'hud.gold': 'GOLD',
    'hud.lives': 'LIVES',
    'hud.wave': 'WAVE',
    'hud.score': 'SCORE',
    'hud.send': 'Send Wave',
    'hud.pause': 'Pause',
    'hud.menu': 'Menu',
    'hud.settings': 'Settings',
    'win.title': 'VICTORY',
    'lose.title': 'DEFEAT',
    'tutorial.place': 'Click a buildable tile to place a tower.',
    'tutorial.wave': 'Click "Send Wave" to summon enemies.',
    'tutorial.upgrade': 'Click a placed tower to upgrade or sell it.',
    'tutorial.spell': 'Try a spell: Q (Meteor) W (Freeze) E (Repair).',
    'talent.title': 'TALENTS',
    'talent.points': 'Points',
    'talent.close': 'Press T or click outside to close',
  },
  zh: {
    'app.title': 'Praesidium 守望',
    'app.tagline': '超大型塔防游戏',
    'menu.start': '开始游戏',
    'menu.levels': '选择关卡',
    'menu.endless': '无尽模式',
    'menu.challenge': '挑战种子',
    'menu.settings': '设置',
    'menu.resume': '继续',
    'menu.retry': '重试',
    'hud.gold': '金币',
    'hud.lives': '生命',
    'hud.wave': '波次',
    'hud.score': '分数',
    'hud.send': '召唤波次',
    'hud.pause': '暂停',
    'hud.menu': '菜单',
    'hud.settings': '设置',
    'win.title': '胜利',
    'lose.title': '失败',
    'tutorial.place': '点击可建造地块放置炮塔。',
    'tutorial.wave': '点击"召唤波次"召唤敌人。',
    'tutorial.upgrade': '点击已放置的炮塔可升级或出售。',
    'tutorial.spell': '试试技能：Q 陨石 W 冰冻 E 修复。',
    'talent.title': '天赋',
    'talent.points': '点数',
    'talent.close': '按 T 或点击外部关闭',
  },
};

let current: Locale = 'en';

export function setLocale(l: Locale): void { current = l; }
export function getLocale(): Locale { return current; }
export function t(key: string): string {
  return STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key;
}
