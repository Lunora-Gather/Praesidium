<div align="center">

# 🛡️ Praesidium / 守望

**一款高完成度的科幻塔防网页游戏。**  
建造防线、升级炮塔、释放技能、解锁天赋，在战役、无尽、每日、每周与分享挑战中守住最后阵地。

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](#技术栈)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](#技术栈)
[![Canvas](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=flat-square&logo=html5&logoColor=white)](#技术栈)
[![Web Audio](https://img.shields.io/badge/Web%20Audio-Procedural-10B981?style=flat-square)](#技术栈)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-222222?style=flat-square&logo=github&logoColor=white)](https://lunora-gather.github.io/Praesidium/)

[在线游玩](https://lunora-gather.github.io/Praesidium/) · [核心玩法](#核心玩法) · [本地运行](#本地运行) · [质量验证](#质量验证) · [发布信息](#发布信息)

</div>

---

## 项目简介

**Praesidium** 源自拉丁语，意为“防御 / 守护”。这是一个直接运行在浏览器中的科幻塔防游戏，使用 **TypeScript + HTML5 Canvas + Web Audio API + Vite** 构建。

项目不依赖大型游戏引擎，主要通过代码完成地图、敌人、炮塔、弹幕、粒子、音效、UI 与进度系统。它的目标不是简单复刻塔防，而是做成一个完整的轻量级网页游戏作品：可立即游玩、可长期成长、可重复挑战，也便于继续扩展。

---

## 在线游玩

```text
https://lunora-gather.github.io/Praesidium/
```

发布更新时，已打开的对局会留在当前版本。看到更新提示后，先保存或结束正在进行的对局，关闭所有守望标签页，再重新打开。完整版本至少在线安装一次后，才可离线启动。

---

## 截图

| Command Deck | Campaign Route |
| --- | --- |
| ![Praesidium main menu](docs/media/praesidium-hero-menu.png) | ![Praesidium campaign route](docs/media/praesidium-campaign-route.png) |

| Battle HUD | Weekly Mode | Mobile Landscape |
| --- | --- | --- |
| ![Praesidium battle HUD](docs/media/praesidium-combat.png) | ![Praesidium weekly mode](docs/media/praesidium-weekly-mode.png) | ![Praesidium mobile landscape](docs/media/praesidium-mobile-landscape.png) |

---

## 核心玩法

| 模块 | 内容 |
| --- | --- |
| **战役关卡** | 10 个不同路径布局和独立视觉主题的关卡，逐步提高防守压力。 |
| **炮塔系统** | 6 种炮塔：Turret、Sniper、Mortar、Frost、Tesla、Cannon。 |
| **敌人系统** | 多类型敌人拥有不同速度、生命、奖励和抗性，Boss 波有独立警告反馈。 |
| **升级与出售** | 炮塔支持多级升级，也可以出售回收部分金币。 |
| **目标策略** | 炮塔可切换 first、last、strongest、weakest、closest 等目标策略。 |
| **协同加成** | 相邻炮塔提供伤害和攻速加成，鼓励布局取舍。 |
| **玩家技能** | Meteor、Freeze、Repair 三种主动技能用于爆发、控场和续航。 |
| **天赋成长** | 通过星级获得天赋点，永久强化金币、伤害、射程、攻速、生命和技能冷却。 |
| **成就系统** | 击杀、金币、建塔、升级、技能、通关等长期目标。 |
| **统计面板** | 记录游玩次数、时长、关卡胜率、塔使用情况和无尽模式表现，并可导出本地 playtest 报告。 |
| **排行榜** | 本地离线排行榜与确定性 NPC 分数，用于无服务器的挑战对比。 |

---

## 游戏模式

### Campaign / 战役

从第 1 关开始逐步推进，完成关卡后解锁下一关。每关根据剩余生命计算星级，并将最佳星级和最高分保存到本地。

### Endless / 无尽模式

敌潮不会在固定波数后结束，而是持续增长。最高分行显示该局的对应波次，最远波次另列。同版本纪录参与本地比较，榜上的模拟对手不是其他在线玩家。

### Daily Challenge / 每日挑战

每日挑战在 UTC 00:00（北京时间 08:00）刷新。当天的种子、周规则、普通难度和初始天赋配置统一，战斗从第一波起就会体现种子带来的变化。

### Weekly Challenge / 每周挑战

独立入口使用本周固定种子、规则、普通难度和标准天赋。首次清完第 8 波获得本周积分。原本已开始的对局跨周续玩，仍归开局那一周。每日榜和每周榜分开结算。

### Challenge Seed / 分享挑战

输入完整挑战码，或最多 8 位的非零十六进制种子。`P2` 码记录种子、难度、周规则、天赋、开局和规则/计分版本；`P1` 旧码可兼容游玩，但不会假定它来自当前规则版本。裸种子使用普通难度、标准天赋和无周规则的练习配置。导入局只参加个人成绩比较，不计入官方每日或每周榜，也不发活动奖励。对局内购买的天赋下次开局生效。

### 本地进度

续局只允许一个标签页写入。接管或替换重要存档前会确认，失败与损坏都有提示。设置 → 管理本地进度可导出 JSON 或恢复它，范围包括战役、天赋、纪录和当前续局，不包括偏好与试玩诊断数据。

---

## 操作说明

| 操作 | 输入 |
| --- | --- |
| 选择炮塔 | 点击底部炮塔卡片，或按数字键 `1` - `6` |
| 放置炮塔 | 点击可建造地块；触屏较小的地块先预览落点，再点同一格确认 |
| 选择已有炮塔 | 点击地图上的炮塔 |
| 升级炮塔 | 点击炮塔面板中的 Upgrade，或按 `U` |
| 出售炮塔 | 点击炮塔面板中的 Sell，或按 `S` |
| 切换目标策略 | 选中炮塔后点击策略按钮，或按 `T` |
| 暂停 / 继续 | 空格键，或点击 HUD 按钮 |
| 释放技能 | 点技能按钮或按 `Q` / `W` / `E`，再点地图目标。`Esc` 取消瞄准 |
| 开始第一波或提前开始下一波 | 点击波次按钮。第一波会等待玩家准备。 |
| 加速 | 点击速度按钮切换 `1× / 2× / 3×` |

可用 `Tab` 和 `Shift + Tab` 切换控件，按 `Enter` 激活。聚焦战场后，方向键移动地块光标，`Enter` 放塔、选塔或施放已选中的技能。HUD 的简报按钮可查下一波、活动奖励和成就；设置可减少震屏和其他动效。

---

## 系统设计

```text
src/
├── main.ts                 # 游戏入口：装配引擎、状态、UI、输入和渲染循环
├── engine/                 # 通用引擎层
│   ├── GameLoop.ts         # 固定时间步主循环
│   ├── Input.ts            # 鼠标、触摸、键盘统一输入
│   ├── Renderer.ts         # Canvas 绘制、相机、震屏和基础图形封装
│   └── Audio.ts / Music.ts # Web Audio 程序化音效与背景音乐
├── game/                   # 玩法权威状态
│   ├── GameState.ts        # 顶层状态机、经济、生命、波次、技能、存档
│   ├── towers/             # 炮塔定义、实例、升级和目标策略
│   ├── enemies/            # 敌人定义、移动、生命、抗性
│   ├── projectiles/        # 弹幕、追踪、溅射和轨迹
│   ├── systems/            # 战斗系统与移动系统
│   ├── waves/              # 波次生成、无尽模式和种子挑战
│   ├── grid/               # 关卡、路径、地块和寻路
│   ├── spells/             # 玩家主动技能
│   ├── Achievements.ts     # 成就系统
│   └── Talents.ts          # 天赋成长系统
├── ui/                     # Canvas UI 绘制层
│   ├── HUD.ts              # 顶部状态栏、底部商店、快捷按钮
│   ├── WorldRenderer.ts    # 地图、炮塔、敌人、弹幕、范围和特效
│   ├── Screens.ts          # 主菜单、暂停、胜利、失败界面
│   ├── LevelSelect.ts      # 关卡选择与难度选择
│   ├── SettingsScreen.ts   # 设置面板
│   ├── StatsScreen.ts      # 统计与排行榜面板
│   └── TalentPanel.ts      # 天赋升级面板
├── config/                 # 平衡、难度和玩家设置
├── utils/                  # 本地存档、统计、排行榜、随机数、日志与国际化
└── scripts/                # 自测脚本、存档回归和平衡模拟
```

---

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 语言 | TypeScript |
| 构建 | Vite |
| 渲染 | HTML5 Canvas 2D |
| 音频 | Web Audio API |
| 存储 | LocalStorage |
| 测试/验证 | TypeScript typecheck + runtime selftests + balance simulation |
| 部署 | GitHub Actions + GitHub Pages |

---

## 本地运行

```bash
git clone https://github.com/Lunora-Gather/Praesidium.git
cd Praesidium
npm ci
npm run dev
```

默认开发地址：

```text
http://localhost:5175
```

生产构建与本地预览：

```bash
npm run build
npm run preview
```

---

## 质量验证

项目提供统一验证入口：

```bash
npm run verify
```

该命令会依次执行：

1. TypeScript 类型检查及生产构建；
2. 核心玩法、存档事务、计分隔离、教程和统计回归；
3. 自动平衡模拟、战斗压力测试和发布资产检查。

`npx playwright install chromium webkit` 后运行 `npm run verify:browser`，用两个浏览器核对续局接管、备份、窄屏触控和离线更新。PR 和 Pages 发布流程都会运行浏览器回归。整帧采样单独使用 `npm run perf:browser`。本地候选版的验证、素材和未确认项目见 [优化候选版验收](docs/OPTIMIZATION_VERIFICATION.md)。

也可以单独运行：

```bash
npm run typecheck
npm run selftest
npm run test:save
npm run balance:sim
npm run perf:check
npm run release:audit
npm run build
```

### Balance Simulation / 平衡模拟

`npm run balance:sim` 会使用脚本玩家自动运行：

- 10 个战役关卡；
- Normal / Hard / Brutal 三种难度；
- balanced / antiFast / antiBoss 三种建造策略。

它会输出每个关卡和难度下的最佳结果，包括胜负、星级、生命、波次、分数、击杀、建塔、升级和塔使用分布。这个脚本主要用于发现：

- Normal 模式是否存在明显卡关；
- Hard / Brutal 是否出现难度断崖；
- 某些炮塔是否长期没人使用；
- 最近的数值改动是否导致关卡突然不可通。

该模拟不是正式玩家测试的替代品，但它是市场级发布前的回归报警器。

---

## 发布信息

| 文件 | 用途 |
| --- | --- |
| `LICENSE` | MIT 开源许可。 |
| `CHANGELOG.md` | 记录主要新增、修改和修复。 |
| `docs/PRIVACY.md` | 说明游戏只使用浏览器本地存储，不自带远程追踪。 |
| `docs/RELEASE_CHECKLIST.md` | 发布前检查表和当前市场化差距。 |
| `docs/RELEASE_NOTES_v1.1.0.md` | 1.1.0 发布说明与旧版更新指引。 |
| `docs/RELEASE_NOTES_v1.0.0.md` | 1.0.0 历史发布说明。 |

---

## 当前优化重点

- 保持 `npm run verify`、`npm run verify:browser` 与 `npm run release:gate` 作为后续版本的发布门禁；
- 持续补充截图/GIF、外部试玩反馈和后续平衡微调记录；
- 做上线后设备回归：桌面、小屏横屏、移动浏览器、缓存刷新。

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
