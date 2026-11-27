# GitHub Pages 部署与验证

[在线游玩](https://lunora-gather.github.io/Praesidium/) · [源代码发布记录](https://github.com/Lunora-Gather/Praesidium/actions/workflows/deploy.yml) · [Pages 构建记录](https://github.com/Lunora-Gather/Praesidium/deployments/github-pages)

推送到 `main` 后，发布工作流用 Node.js 24 安装并审计依赖，执行 `npm run verify` 和双浏览器生产回归，通过后将 `dist/` 发布到 `gh-pages`。GitHub Pages 随后部署生成的站点。

如果 GitHub 的提交状态接口返回 `statuses: []`，到 Actions 查看工作流结果，并核对 Pages 部署记录。

## 核对上线版本

1. 在 Actions 查看源代码提交的发布结果，再核对 Pages 部署的 `gh-pages` 提交。
2. 将该生成提交的文件解包到独立目录，在对应版本的源码目录中运行 `TEST_PAGES_BUILD_DIR=/path/to/published-tree npm run verify:pages`。
3. 脚本核对线上 HTML、离线资源摘要和 Service Worker，并用全新 Chromium、WebKit 会话实测开始战斗、保存、第 1 波在线和离线续局。

刚部署后若线上仍是旧版本，先核对 Pages 的部署结果并等待缓存同步。已有游戏标签页按正常更新流程处理，保存或结束对局后关闭所有守望标签页，再打开游戏网址。可以用私密窗口核对新访客看到的版本。

## 1.1.0 历史记录

[源代码发布](https://github.com/Lunora-Gather/Praesidium/actions/runs/45503796328)对应 `0e54906`，[Pages 构建](https://github.com/Lunora-Gather/Praesidium/actions/runs/45504099547)对应 `85c14d1`，离线资源版本为 `fcf0d2cd350eaa99`。2026-11-26 核对了线上资源和发布文件，两种浏览器均完成了第 1 波保存与在线续局。

1.2.0 发布前以该生成提交为升级和回退测试的起点。试验在本地隔离环境进行，两种浏览器均验证了旧标签页中的对局可继续、更新后可离线读档、回退后可读取同一对局。
