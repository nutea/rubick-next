# rubick-superx-source（超级面板 · 可读源码）

本目录为 `public/superx` 的 **Vue 3 + TypeScript** 还原实现，便于阅读与修改；与当前线上包行为对齐（快捷键、剪贴板、面板 UI、有道翻译预加载、主进程入口等）。

构建方式与 **`apps/feature` 一致**：Vite 将前端产物直接输出到 **`../../public/superx`**，`public/` 目录作为 **publicDir**（插件 `package.json`、logo、`.npmrc`、`modules/` 等）在构建时一并复制过去；主进程侧 **`node-src/`** 由 `tsc` 写入同一目录，**不再使用** `scripts/release.cjs` 等打包脚本。

## 目录结构

| 路径 | 说明 |
|------|------|
| `index.html` / `main.html` | Vite 多页入口：设置页、浮动面板页 |
| `src/settings/` | 快捷键设置（原 `index.html` 对应 bundle） |
| `src/panel/` | 超级面板 UI（原 `main.html` 对应 bundle） |
| `node-src/` | 主进程侧：`main.js` 等价、`panel-window`、`clipboard` 工具、`panel-preload` |
| `public/` | 与 feature 的 `public` 类似：Rubick 插件清单 `package.json`、`plugin-logo.png`、`.npmrc` 等，构建时复制到 `public/superx/` |

## 安装与构建

在 **`apps/superx`** 目录：

```bash
cd apps/superx
npm install
npm run build
```

等价于 **`vite build`**（前端 + publicDir）后 **`tsc -p tsconfig.node.json`**（`node-src` → `public/superx/*.js`）。也可分步：`npm run build:web`、`npm run build:node`。

原生依赖（`@nut-tree/nut-js`、`rubick-active-win`、`uiohook-napi` 等）以 **仓库根目录** `node_modules` 为准，无需在 `public/superx` 下单独 `npm install`。Windows 下 **`cdwhere.exe`** 由主应用 **`public/bin`** 提供（见主进程 `registerCdwhereIpc`）。

### 开发调试（仅前端，无 Electron API 时部分能力不可用）

```bash
npm run dev:panel
```

## 说明

- 有道翻译在 `panel-preload.ts` 中仍使用示例 `appKey` / `secretKey`，生产环境请替换为你自己的密钥。
- 主进程 TypeScript 会解析仓库根目录依赖的类型；若单独拷贝本目录到别处开发，需在 monorepo 根执行依赖安装。
