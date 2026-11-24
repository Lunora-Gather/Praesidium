# Praesidium 优化候选版验收

本记录针对本地生产构建，不代表 GitHub Pages 已更新。候选构建的浏览器入口为 `assets/index-pO3WcyhL.js`，验证运行时为 Node 24.22.3。

## 通过的验证

| 门禁 | 覆盖 |
| --- | --- |
| `npm run verify` | 类型检查和构建；209 项玩法和布局自测；v1/v2 存档；并发结算、拒写后重试、接管和备份；规则和计分；教程和统计；无尽和压力模拟；171 项发布审计。 |
| `npm run release:gate` | 本地仓库门禁 8/8，不替代实际部署或外部试玩。 |
| `npm run verify:browser` | Chromium 和 WebKit 的续局接管、写入拒绝、备份恢复、挑战码、320×568 / 568×320 布局、触控二次点按建造、旋转后的状态、语言与动效设置以及弹层焦点。 |
| `npm run test:legacy-release` | 从 `63fdb1a` 构建归档里的旧版入口 `assets/index-COisGhIr.js` 升级：旧标签页还开着时不迁移；旧版本在切换期间新增的进度迁移成功，原 `localStorage` 记录仍在。两个浏览器均验证。 |
| `npm run perf:browser` | 实测菜单、暂停、战斗 1× 和 3× 的 Canvas 绘制节奏。不是 GPU 帧跟踪或功耗测量。 |

离线回归用真实生产构建 A/B 共用同一源。分别注入新版模块 503 和内容错误的 HTTP 200，旧版仍可完整启动；有战斗在运行时不强制刷新。新版完整安装后可断网读档；回退到同样支持 IndexedDB 的构建也保留续局。不能把已迁移的玩家直接回滚到只认识旧 `localStorage` 的 1.0.0 构建。浏览器清除整站数据、首次访问离线，不在可启动保证内。

## 性能与数值

- 同机 Chromium 探针：菜单约 60 → 30 次 Canvas 重绘/秒，暂停约 60 → 20 次/秒；优化后两浏览器的 1× 和 3× 战斗场景均约 60 次/秒。
- 100 塔/240 个峰值敌人的模拟更新 P95 为 0.050 ms；三个种子的 30 分钟模拟各到第 26 波。这与整帧绘制和实机功耗是不同指标。
- 受限策略（最多 4 座塔、6 次升级、不施法）仍分别通过 10、10、4 关。没有据此修改全局难度、战役成长曲线或塔的战斗数值。

## 候选素材

目录：[`docs/media/optimization-candidate`](media/optimization-candidate/)。包含菜单与战斗、320×568 总览与简报、568×320 横屏，以及实际运行录下的 [WebM 短片](media/optimization-candidate/gameplay-candidate.webm)。原公开发行版截图单独保留。

复录：先执行 `npm run build`，再执行 `./node_modules/.bin/tsx scripts/capture-candidate.ts <输出目录>`。复测旧版过渡时，将 `TEST_LEGACY_BUILD_DIR` 指向上一版的实际生产构建，而非候选构建的副本。

## 尚缺外部证据

- 在真实 iPhone/iPad 检查横竖屏旋转、窄格命中、断网重开和 VoiceOver。桌面 WebKit 的触屏模拟不是这一步的替代。
- 跑不提示操作的外部试玩；按 `PLAYTEST_PLAN.md` 的首塔、首波、图鉴发现率和首关结果决定是否调整难度与成长曲线。
- 在代表设备实测长时浏览器内存、音频和电量，再决定是否继续削减特效。当前没有耗电改善的结论。
- 此处记录本地验收。实际部署结果以对应提交的 Actions、Pages 构建和线上版本核验为准。
