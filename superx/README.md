# rubick-superx-source（超级面板 · 可读源码）

本目录为 `public/rubick-system-super-panel` 的 **Vue 3 + TypeScript** 还原实现，便于阅读与修改；与当前线上包行为对齐（快捷键、剪贴板、面板 UI、有道翻译预加载、主进程入口等）。

## 目录结构

| 路径 | 说明 |
|------|------|
| `index.html` / `main.html` | Vite 多页入口：设置页、浮动面板页 |
| `src/settings/` | 快捷键设置（原 `index.html` 对应 bundle） |
| `src/panel/` | 超级面板 UI（原 `main.html` 对应 bundle） |
| `node-src/` | 主进程侧：`main.js` 等价、`panel-window`、`clipboard` 工具、`panel-preload` |
| `dist/` | `npm run build:web` 输出（`index.html`、`main.html`、`assets/*`） |
| `dist-node/` | `npm run build:node` 输出（`main.js`、`panel-window.js` 等） |
| `deploy/package.json` | 与内置插件一致的 **Rubick 插件清单**（应同步到 `public/.../package.json`） |

## 为什么还有一部分东西看起来「没在 superx 里」？

分几类看就清楚了：

1. **本来就不该进业务源码的**
   - **`node_modules/`、`package-lock.json`**：第三方依赖树，体积大、由安装生成；源码里只保留 **`deploy/package.json`** 里的 `dependencies` 声明即可。
   - **旧版打包产物 `js/*.js`、`css/*.css`（带 hash）**：对应逻辑已在 **`src/settings`、`src/panel`**；那些文件是历史 Webpack 输出，应由 **`npm run build:web`** 重新生成，而不是再当手写源码维护。

2. **没有「可读源码形态」的（只能当资源或上游产物）**
   - **`modules/cdwhere.exe`**：Windows 小工具二进制，`panel-window` 里用 `execa` 调用；没有对应的 TS/Vue 源文件可维护，只能保留可执行文件或从原插件仓库拷贝。
   - **`modules/**/robotjs` 等预编译原生模块**：同样是平台相关二进制/打包结果，通常随上游发布包提供，不适合放进 `superx` 当手写代码。

3. **部署目录里的「快照」与 superx 的关系**
   - **`public/rubick-system-super-panel/main.js`、`panel-window.js`、`panel-preload.js`**：与 **`node-src/*.ts` 编译结果** 等价；public 下的是给 Rubick 直接加载的已编译文件，**源文件在 `node-src/`**。
   - **`public/.../package.json`**：与 **`superx/deploy/package.json`** 应对齐；之前只放在 public 是为了运行，现已把清单纳入 **`deploy/`**，避免「只有部署目录里有、仓库里没有单一事实来源」。

4. **小资源（可选）**
   - **`favicon.ico`、`img/`**：若存在，属于静态资源；面板里 Logo 也可用外链或构建时从 `public` 拷贝，未强制放进 superx。

**结论：** superx 收的是 **你能改、该版本控制的逻辑**（Vue/TS）；**依赖安装结果、编译产物、无源码的二进制** 仍落在 `public/rubick-system-super-panel`（或构建流水线里），这是刻意拆分，不是遗漏。

## 安装与构建

在 **`superx`** 目录执行（若本机 `node_modules` 被占用导致安装失败，请先关闭占用进程或删除 `superx/node_modules` 后重试）：

```bash
cd superx
npm install
npm run build:web    # → dist/
npm run build:node   # → dist-node/
```

### 一键发布到 `public/rubick-system-super-panel`

```bash
cd superx
npm install
npm run release
```

会做：`build` → 清理目标目录内旧 `js/`、`css/`、`assets/` 与根目录插件文件 → 写入 `deploy/package.json`、`dist/*`、`dist-node/*.js` → **保留**已有 `node_modules` 与 `modules`（若 `deploy/modules` 目录下**有文件**则整目录覆盖 `target/modules`）→ 在目标目录执行 `npm install --omit=dev`。

### 开发调试（仅前端，无 Electron API 时部分能力不可用）

```bash
npm run dev:settings
npm run dev:panel
```

## 手动同步（不推荐）

优先使用 **`npm run release`**。若必须手拷：保留目标下的 `node_modules` 与 `modules/`，再按 `scripts/release.cjs` 中的文件列表复制 `deploy/package.json`、`dist/*`、`dist-node/*.js`，最后在目标目录执行 `npm install --omit=dev`。

## 说明

- 有道翻译在 `panel-preload.ts` 中仍使用示例 `appKey` / `secretKey`，生产环境请替换为你自己的密钥。
- 主进程 TypeScript 在本地编译时，会解析仓库根目录已有的 `execa` 等依赖的类型；若单独只拷贝 `superx` 到别处，请在 `superx` 内执行完整 `npm install`。
