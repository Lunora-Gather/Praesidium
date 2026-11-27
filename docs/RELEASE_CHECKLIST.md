# 发布检查表

每次发布按对应提交核对以下项目。历史版本见 [更新记录](../CHANGELOG.md)。

## 发布前

- [ ] 用 Node.js 24 执行 `npm ci`、`npm audit --audit-level=high` 和 `npm run verify`。
- [ ] 对生产构建执行 `npm run verify:browser`，检查首次进入战役、选择难度、暂停、触控、键盘、存档、备份和离线更新。
- [ ] 涉及进度存储或离线缓存时，以已部署的站点文件验证升级和兼容版回退，核对原对局能否继续。
- [ ] 涉及战斗渲染时执行 `npm run perf:browser`，记录视口、倍率和测量环境。
- [ ] 对齐 `package.json`、锁文件、PWA 清单和更新记录中的版本号，核对 README 截图、运行命令和数据说明。

## 发布后

- [ ] 核对源代码提交的发布工作流和对应 Pages 部署。
- [ ] 对已部署的生成提交执行 `npm run verify:pages`，核对资源并验证新会话保存、在线及离线续局。
- [ ] 记录发布链接、版本、验证结果和未覆盖的设备。具体命令见 [部署与验证](DEPLOYMENT_STATUS.md)。

界面人工复核可参考 [最终验收](FINAL_RELEASE_QA.md) 和 [手机检查](MOBILE_QA.md)。真机旋转、VoiceOver、温升和电量需单独测量。首次上手体验和难度判断可记录在 [试玩结果](PLAYTEST_RESULTS_SUMMARY.md)。
