# Warm-Flow 文档站全站重设计 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 `docs/superpowers/specs/2026-09-25-warm-flow-doc-redesign-design.md` 完成 Warm-Flow 文档站全站重设计：双主题令牌层、新 Logo、极简工程风首页、公告横幅、文档正文与二级页面重排。

**Architecture:** 不 fork vuepress-theme-hope。所有视觉改动集中在三层：(1) `styles/tokens.scss` 定义 `--wv-*` CSS 变量并挂到 `:root` 与 `html[data-theme="dark"]`；(2) 首页绕开 theme-hope 的 `HomePage`（其槽位只有 `heroBefore/heroAfter/content`），在自定义 `layouts/Layout.vue` 里按 `frontmatter.home` 分支渲染自有组件树；(3) 文档页与二级页只用 CSS 覆写 `.theme-hope-content` 等既有选择器，不改 markdown 结构。

**Tech Stack:** VuePress 2.0.0-rc.23 + vite bundler、vuepress-theme-hope 2.0.0-rc.92、SCSS（sass-embedded）、Vue 3 SFC。

---

## 约定（每个任务都要遵守）

1. **本仓库没有测试框架**（`package.json` 无 test script、无 vitest/jest）。每个任务的"测试"由三类可执行断言构成：`pnpm docs:build` 通过（类型与模板编译检查）、`grep` 断言产物内容、`curl` + 浏览器断言渲染结果。**不允许用"看起来正常了"代替断言。**
2. **dev 服务器已在后台跑在 8081 端口**（`pnpm docs:dev`）。改 SCSS/Vue 会热更新；改 `client.ts`/`theme.ts`/`config.ts` 需要重启 dev 才生效。
3. **工作区已有不属于本设计的未提交改动**（移除广告位、删除 `support.md` 等）。每个任务只 `git add` 自己碰过的文件，**禁止 `git add -A` / `git add .`**。
4. **开始任何编辑前先 `Read` 目标文件**。用户可能在并行会话里改同一个仓库。
5. 提交信息用中文 `feat:` / `style:` / `chore:` / `refactor:` 前缀，跟随仓库现有风格（见 `git log`）。

## 文件结构

```
src/.vuepress/
├─ styles/
│  ├─ tokens.scss            [新建] --wv-* 令牌 + 明暗两套 + logo-mask/wf-card/wf-lead 工具类
│  ├─ home.scss              [新建] 首页专用样式（hero/面板/网格/页脚）
│  ├─ content.scss           [新建] 文档正文覆写（标题/表格/代码/提示/图片/TOC/翻页）
│  ├─ sidebar.scss           [新建] 侧栏与 navbar 覆写
│  ├─ announcement.scss      [新建] 公告横幅样式
│  └─ index.scss             [改写] 只保留 @use 汇总 + 旧工具类迁移后的残留
├─ components/
│  ├─ WfLogo.vue             [新建] 网关分叉 logo（currentColor，可被任意组件复用）
│  ├─ AnnouncementBar.vue    [新建] 顶部可关闭横幅
│  ├─ home/
│  │  ├─ Home.vue            [新建] 首页根组件（编排 + 入场时序）
│  │  ├─ Hero.vue            [新建] eyebrow/H1/sub/CTA/star 徽章
│  │  ├─ CodePanel.vue       [新建] 三步集成标签页
│  │  ├─ StatsBar.vue        [新建] 数字条
│  │  ├─ FeaturesGrid.vue    [新建] 特性 3×2
│  │  ├─ QuickNav.vue        [新建] 快速通道四卡
│  │  ├─ CaseShowcase.vue    [新建] 开源集成案例 3 条 + 社区一行入口
│  │  └─ SiteFooter.vue      [新建] 三栏页脚
│  └─ community/
│     └─ DromaraWall.vue     [新建] Dromara 项目墙（community.md 用）
├─ data/
│  └─ home.ts                [生成] kyProjects / dromaraProjects / companies 三个数组
├─ scripts/
│  └─ extract-home-data.mjs  [新建] 从 src/README.md 抽取上面三个数组的脚本
├─ layouts/Layout.vue        [改写] home 分支渲染（#contentAfter 实测可用，保留）
├─ client.ts                 [改写] 注册全局组件 + 字体 CSS，移除 Element Plus
├─ config.ts                 [改写] head 增加 favicon.svg
├─ theme.ts                  [改写] logo 指向 /logo.svg，删除 plugins.notice
├─ navbar.ts                 [改写] 增加「社区」
└─ sidebar.ts                [改写] 增加社区分组，去掉 support.md 残留

src/
├─ README.md                 [改写] 只留 frontmatter，正文与脚本样式全部搬进组件
└─ master/
   ├─ introduction/community.md   [新建]
   ├─ introduction/introduction.md [改写] 设计器图换本地图
   └─ other/troubleshooting.md     [改写] 加 wf-card 类（可选，见 Task 16）
public/（src/.vuepress/public）
├─ designer/classic.png      [已存在] 上一轮已放入
├─ designer/dingtalk.png     [已存在]
├─ logo.svg                  [新建]
└─ favicon.svg               [新建]
```

---

## 阶段 A：令牌层与字体

### Task 1: 设计令牌 `tokens.scss`

> **状态更新（2026-09-25 实施中）**：`styles/tokens.scss` 已建立并被 `index.scss` 通过 `@use "tokens";` 引入，含全部 `--wv-*` 变量与 `--vp-c-accent*` 覆盖，以及 `.wf-card / .wf-lead / .wf-em`。`.wf-logo-mask` 与 `--wv-mono` 的实际字体接入尚未验证（`@fontsource-variable/jetbrains-mono` 还没装，见 Task 2）。本任务**剩余**：补 `.wf-logo-mask` 块、跑 Step 3–5 的断言与提交。

**Files:**
- Create: `src/.vuepress/styles/tokens.scss`
- Modify: `src/.vuepress/styles/index.scss`（顶部加 `@use "tokens";`）

- [ ] **Step 1: 创建 tokens.scss**

写入 `src/.vuepress/styles/tokens.scss`，完整内容：

```scss
// Warm-Flow 重设计令牌层。浅色挂 :root，暗色同时挂两种选择器：
// theme-hope 用 useDarkMode 设置 html[data-theme]，但其内置 scss 仍混用 .dark 类。
:root {
    --wv-brand: #126bae;
    --wv-brand-ink: #0b4d7e;
    --wv-amber: #e08a2e;
    --wv-bg: #ffffff;
    --wv-bg-soft: #f6f8fa;
    --wv-bg-hero: #eef4fa;
    --wv-fg: #1c2933;
    --wv-fg-mute: #5b6b7a;
    --wv-line: #e3e9ef;
    --wv-code-bg: #0d1117;
    --wv-mono: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace;
    --wv-sans: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB",
        "Microsoft YaHei", "Segoe UI", sans-serif;

    // 让 theme-hope 自身组件也跟着新色板走（不改 node_modules）
    --theme-color: var(--wv-brand);
    --vp-c-bg: var(--wv-bg);
    --vp-c-bg-alt: var(--wv-bg-soft);
    --vp-c-text-1: var(--wv-fg);
    --vp-c-text-2: var(--wv-fg-mute);
    --vp-c-divider: var(--wv-line);
}

html[data-theme="dark"],
html.dark {
    --wv-brand: #58a6ff;
    --wv-brand-ink: #9ecbff;
    --wv-amber: #f0a04b;
    --wv-bg: #0d1117;
    --wv-bg-soft: #11161d;
    --wv-bg-hero: #0f1e2d;
    --wv-fg: #d5dde5;
    --wv-fg-mute: #8b98a5;
    --wv-line: #1f2630;
    --wv-code-bg: #010409;

    --theme-color: var(--wv-brand);
    --vp-c-bg: var(--wv-bg);
    --vp-c-bg-alt: var(--wv-bg-soft);
    --vp-c-text-1: var(--wv-fg);
    --vp-c-text-2: var(--wv-fg-mute);
    --vp-c-divider: var(--wv-line);
}

// 网关分叉 logo，内联成 data URI 以免子路径部署时 url() 前缀丢失。
// 描边必须不透明：mask-image 只取 alpha 通道，半透明的左分支会整块消失。
.wf-logo-mask {
    $logo: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'>" +
        "<path d='M32 14 L42 24 L32 34 L22 24 Z' stroke='black' stroke-width='3.6' stroke-linejoin='round'/>" +
        "<path d='M42 24 H49 A5 5 0 0 1 54 29 V33' stroke='black' stroke-width='3.2' stroke-linecap='round'/>" +
        "<path d='M32 34 V44' stroke='black' stroke-width='3.2' stroke-linecap='round'/>" +
        "<circle cx='54' cy='40' r='5' fill='black'/><circle cx='32' cy='52' r='5' fill='black'/></svg>";
    -webkit-mask-image: url("data:image/svg+xml,#{$logo}");
    mask-image: url("data:image/svg+xml,#{$logo}");
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-size: contain;
    mask-size: contain;
    background-color: var(--wv-brand);
}

// 文档正文里 .yat 的替代品：卡片描边
.wf-card {
    border: 1px solid var(--wv-line);
    border-radius: 10px;
    overflow: hidden;
    background: var(--wv-bg);
}

// red-font / big-font / red-no-bg 的统一替代品
.wf-lead {
    color: var(--wv-amber);
    font-size: 17px;
    font-weight: 600;
    line-height: 1.7;
}

.wf-em {
    color: var(--wv-amber);
    font-weight: 600;
}
```

- [ ] **Step 2: 挂进 index.scss**

在 `src/.vuepress/styles/index.scss` 第 1 行 `// place your custom styles here` 之后插入：

```scss
@use "tokens";
```

- [ ] **Step 3: 构建断言**

Run: `pnpm docs:build`
Expected: 构建成功，退出码 0，日志无 `Undefined variable` / `Expected string` 报错。

- [ ] **Step 4: 产物断言**

Run: `grep -o "\-\-wv-brand:#[0-9a-f]*" src/.vuepress/warm-flow-docs/assets/*.css | sort -u`
Expected: 输出两行，分别为 `--wv-brand:#126bae` 与 `--wv-brand:#58a6ff`（明暗两套都在）。

- [ ] **Step 5: 提交**

```bash
git add src/.vuepress/styles/tokens.scss src/.vuepress/styles/index.scss
git commit -m "style: 新增 Warm-Flow 重设计令牌层（明暗双主题 CSS 变量）"
```

---

### Task 2: 等宽字体自托管

**Files:**
- Modify: `package.json`（新增 devDependency）
- Modify: `src/.vuepress/client.ts:1-10`

- [ ] **Step 1: 安装**

Run: `pnpm add -D @fontsource-variable/jetbrains-mono`
Expected: 安装成功。

- [ ] **Step 2: 确认可用的 CSS 入口文件名**

Run: `ls node_modules/@fontsource-variable/jetbrains-mono/*.css`
Expected: 至少存在 `index.css`。**若存在 `latin.css` 则下一步用 `latin.css`（体积更小），否则用 `index.css`。**

- [ ] **Step 3: 在 client.ts 引入**

在 `src/.vuepress/client.ts` 的 import 区加入（按 Step 2 结果替换文件名）：

```ts
import "@fontsource-variable/jetbrains-mono/latin.css";
```

- [ ] **Step 4: 构建断言**

Run: `pnpm docs:build && grep -c "jetbrains" src/.vuepress/warm-flow-docs/assets/*.css`
Expected: 计数 ≥ 1，且 `src/.vuepress/warm-flow-docs/assets/` 下出现 `.woff2` 文件（`ls src/.vuepress/warm-flow-docs/assets/*.woff2`）。

- [ ] **Step 5: 提交**

```bash
git add package.json pnpm-lock.yaml src/.vuepress/client.ts
git commit -m "chore: 自托管 JetBrains Mono 可变字体，替代外部 CDN"
```

---

## 阶段 B：Logo

### Task 3: Logo 资源与 navbar 接入

> **状态更新（2026-09-25 已完成）**：实现方式比原计划更简单 —— theme-hope **原生支持 `logoDark`**（`lib/bundle/index.d.ts:530`、`NavbarBrand.js:13` 渲染 `.vp-nav-logo.light` / `.vp-nav-logo.dark` 两个 `<img>` 并用 CSS 切换），因此**不需要** `mask-image` + `currentColor` 那套方案。
> 已交付：`public/logo.svg`（`#126bae`）、`public/logo-dark.svg`（`#58a6ff`）、`public/favicon.svg`（16px 简化版，蓝底白形）；`theme.ts` 加 `logo` + `logoDark`；`config.ts` head 加 `<link rel=icon type=image/svg+xml href=${base}favicon.svg>`；navbar logo 高度在 `sidebar.scss` 里定为 30px、站名 800 字重。
> 实测：亮色显示 `/logo.svg`、暗色显示 `/logo-dark.svg`，两者 `naturalWidth>0`，渲染高 30px；产物含三个 svg；`docs:build` 通过。
> **`tokens.scss` 里不要再加 `.wf-logo-mask`**（原计划 Step 1 的那段作废）。`WfLogo.vue` 组件仍可按需在首页 hero 里用，但 navbar 不需要它。

**Files:**
- Create: `src/.vuepress/public/logo.svg`
- Create: `src/.vuepress/public/favicon.svg`
- Create: `src/.vuepress/components/WfLogo.vue`
- Modify: `src/.vuepress/theme.ts:13`（`logo` 字段）
- Modify: `src/.vuepress/config.ts:36-46`（`head`）

- [ ] **Step 1: 写 `public/logo.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" role="img" aria-label="Warm-Flow">
  <path d="M32 14 L42 24 L32 34 L22 24 Z" stroke="currentColor" stroke-width="3.6" stroke-linejoin="round"/>
  <path d="M42 24 H49 A5 5 0 0 1 54 29 V33" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M32 34 V44" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M22 24 H15 A5 5 0 0 0 10 29 V40" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" opacity=".45"/>
  <circle cx="54" cy="40" r="5" fill="currentColor"/>
  <circle cx="32" cy="52" r="5" fill="currentColor"/>
  <circle cx="10" cy="48" r="4" stroke="currentColor" stroke-width="3.2" opacity=".45"/>
</svg>
```

- [ ] **Step 2: 写 `public/favicon.svg`**（16px 优化：加粗描边、去掉半透明分支、带底色）

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#126bae"/>
  <path d="M32 15 L42 25 L32 35 L22 25 Z" stroke="#ffffff" stroke-width="4.6" fill="none" stroke-linejoin="round"/>
  <path d="M42 25 H49" stroke="#ffffff" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M32 35 V45" stroke="#ffffff" stroke-width="4.2" stroke-linecap="round"/>
  <circle cx="54" cy="41" r="5.6" fill="#ffffff"/>
  <circle cx="32" cy="52" r="5.6" fill="#ffffff"/>
</svg>
```

- [ ] **Step 3: 写 `components/WfLogo.vue`**

```vue
<template>
  <svg
    class="wf-logo"
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
  >
    <path d="M32 14 L42 24 L32 34 L22 24 Z" stroke="currentColor" stroke-width="3.6" stroke-linejoin="round" />
    <path d="M42 24 H49 A5 5 0 0 1 54 29 V33" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" />
    <path d="M32 34 V44" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" />
    <path d="M22 24 H15 A5 5 0 0 0 10 29 V40" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" opacity=".45" />
    <circle cx="54" cy="40" r="5" fill="currentColor" />
    <circle cx="32" cy="52" r="5" fill="currentColor" />
    <circle cx="10" cy="48" r="4" stroke="currentColor" stroke-width="3.2" opacity=".45" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 26 });
</script>

<style lang="scss">
.wf-logo {
  color: var(--wv-brand);
  flex: none;
}
</style>
```

- [ ] **Step 4: theme.ts 换 logo**

`src/.vuepress/theme.ts` 第 13 行改为：

```ts
        logo: "/logo.svg",
```

- [ ] **Step 5: config.ts 增加 favicon 链接**

`src/.vuepress/config.ts` 的 `head` 数组里，在百度统计那条之前加入：

```ts
        ['link', { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` }],
```

（`base` 已在文件顶部 `import {base} from "./base.js";` 引入，无需新增 import。）

- [ ] **Step 6: 构建 + 产物断言**

```bash
pnpm docs:build
grep -o "favicon.svg" src/.vuepress/warm-flow-docs/index.html
ls src/.vuepress/warm-flow-docs/logo.svg src/.vuepress/warm-flow-docs/favicon.svg
```
Expected: `favicon.svg` 在 index.html 中出现 1 次；两个 svg 文件都存在于产物根目录。

- [ ] **Step 7: 浏览器断言（不可省略）**

重启 dev（`client.ts`/`theme.ts` 改动需重启）：先停掉后台 `docs:dev`，再 `pnpm docs:dev`。
用浏览器打开 `http://localhost:8081/`，执行：

```js
document.querySelector('.vp-navbar img[src*="logo"]').naturalWidth
```
Expected: 返回 > 0（新 logo 真实渲染出来，不是破图）。切到暗色模式，肉眼确认 logo 变 `#58a6ff` 且描边清晰。

- [ ] **Step 8: 提交**

```bash
git add src/.vuepress/public/logo.svg src/.vuepress/public/favicon.svg \
        src/.vuepress/components/WfLogo.vue src/.vuepress/theme.ts src/.vuepress/config.ts
git commit -m "feat: 新增网关分叉 logo（logo.svg / favicon.svg / WfLogo 组件）"
```

---

## 阶段 C：首页

### Task 4: 抽取首页数据到 `data/home.ts`

**Files:**
- Create: `src/.vuepress/scripts/extract-home-data.mjs`
- Create: `src/.vuepress/data/home.ts`（由脚本生成）

- [ ] **Step 1: 写抽取脚本**

写入 `src/.vuepress/scripts/extract-home-data.mjs`：

```js
// 从 src/README.md 的 <script> 块里抽出三个数组，生成带类型的 data/home.ts。
// 目的：避免手抄 60 条 Dromara 项目时出错。README 被删空后本脚本即可退役。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
const grab = (name) => {
  // README 里是 `const x = ref([])` + `x.value = [...]`，所以按 .value 赋值行定位
  const marker = `${name}.value = [`;
  const start = readme.indexOf(marker);
  if (start < 0) throw new Error(`未找到 ${name}`);
  const end = readme.indexOf("];", start);
  return readme.slice(start + marker.length, end + 1);
};

// README 里的 `base + "x"` 改成模板串，保持子路径部署行为不变
const fix = (src) => src.replace(/\bbase \+ "([^"]*)"/g, '`${base}$1`');

const out = `// 由 scripts/extract-home-data.mjs 从 src/README.md 生成，勿手改数组内容。
export interface ProjectItem {
  href: string;
  title: string;
  src: string;
}
export interface CaseItem extends ProjectItem {
  author: string;
  intro: string;
}

const base = import.meta.env.BASE_URL;

export const cases: CaseItem[] = ${fix(grab("kyProjectList"))};

export const dromaraProjects: ProjectItem[] = ${fix(grab("dromaraList"))};

export const companies: ProjectItem[] = ${fix(grab("qyProjectList"))};
`;

mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/home.ts", import.meta.url), out);
console.log("data/home.ts 已生成");
```

- [ ] **Step 2: 运行**

Run: `node src/.vuepress/scripts/extract-home-data.mjs`
Expected: 无异常抛出（若报 `未找到 kyProjectList`，说明 README 已被其他会话改过 —— 停下来向用户确认，不要手写数据）。

- [ ] **Step 3: 数量断言**

```bash
grep -c "href:" src/.vuepress/data/home.ts
grep -n "export const cases\|export const dromaraProjects\|export const companies" src/.vuepress/data/home.ts
```
Expected: `href:` 计数 = **9 + 66 + 30 = 105**（2026-09-25 实测：cases 9 条、dromaraProjects 66 条、companies 30 条，其中 companies 末尾 3 条是 logo.png 占位）；三个导出各一行。

- [ ] **Step 4: 构建断言**

Run: `pnpm docs:build`
Expected: 成功（此时 `home.ts` 还没被引用，只验证它能被 vite 解析且 `import.meta.env.BASE_URL` 不报错）。

- [ ] **Step 5: 提交**

```bash
git add src/.vuepress/scripts/extract-home-data.mjs src/.vuepress/data/home.ts
git commit -m "refactor: 首页案例/Dromara/企业数据抽取为 data/home.ts"
```

---

### Task 5: 首页组件树（静态骨架）

**Files:**
- Create: `src/.vuepress/components/home/Hero.vue`
- Create: `src/.vuepress/components/home/CodePanel.vue`
- Create: `src/.vuepress/components/home/StatsBar.vue`
- Create: `src/.vuepress/components/home/FeaturesGrid.vue`
- Create: `src/.vuepress/components/home/QuickNav.vue`
- Create: `src/.vuepress/components/home/CaseShowcase.vue`
- Create: `src/.vuepress/components/home/SiteFooter.vue`
- Create: `src/.vuepress/components/home/Home.vue`
- Create: `src/.vuepress/styles/home.scss`
- Modify: `src/.vuepress/styles/index.scss`

- [ ] **Step 1: `Hero.vue`**

```vue
<template>
  <header class="wf-hero">
    <p class="wf-eyebrow">Dromara · 国产自研工作流引擎 · v2.0.0</p>
    <h1 class="wf-h1"><em>7 张表</em>，一个依赖，<br />跑通整条审批流</h1>
    <p class="wf-sub">
      简洁轻量、五脏俱全、灵活可扩展。原生支持经典与仿钉钉双模式设计器，<br />
      退回 / 撤销 / 任意跳转 / 转办 / 委派 / 加减签开箱即用。
    </p>
    <p class="wf-cta">
      <a class="wf-btn primary" :href="`${base}master/primary/started.html`">快速开始 →</a>
      <a class="wf-btn ghost" href="https://gitee.com/sgs98/warm-flow" target="_blank" rel="noreferrer">
        <span class="star">★</span> Star on Gitee
      </a>
    </p>
  </header>
</template>

<script setup lang="ts">
const base = import.meta.env.BASE_URL;
</script>
```

- [ ] **Step 2: `CodePanel.vue`**

```vue
<template>
  <div class="wf-panel">
    <div class="wf-tabs">
      <span class="on">三步集成</span><span>pom.xml</span><span>application.yml</span>
    </div>
    <pre class="wf-code"><span class="step">1</span> <span class="k">&lt;dependency&gt;</span>
   <span class="k">&lt;groupId&gt;</span><span class="s">org.dromara.warm</span><span class="k">&lt;/groupId&gt;</span>
   <span class="k">&lt;artifactId&gt;</span><span class="s">warm-flow-mybatis-plus-sb3-starter</span><span class="k">&lt;/artifactId&gt;</span>
 <span class="k">&lt;/dependency&gt;</span>
<span class="step">2</span> <span class="c">-- 执行建表 SQL（flow_definition / flow_node / flow_task …共 7 张）</span>
<span class="step">3</span> <span class="a">@Autowired</span> <span class="k">private</span> <span class="t">FlowExecutionService</span> <span class="v">executionService</span>;

   <span class="c">// 办理人走 ${handler} 表达式，流程变量随需传递</span>
   <span class="t">Map</span>&lt;<span class="t">String</span>,<span class="t">Object</span>&gt; <span class="v">variable</span> = <span class="t">Map</span>.of(<span class="s">"handler"</span>, <span class="s">"1001"</span>);
   <span class="t">ExecutionInstance</span> <span class="v">instance</span> = <span class="v">executionService</span>.<span class="f">start</span>(<span class="s">"leave"</span>, <span class="n">1001L</span>, <span class="v">variable</span>);</pre>
  </div>
</template>
```

- [ ] **Step 3: `StatsBar.vue`**

```vue
<template>
  <dl class="wf-stats">
    <div v-for="s in stats" :key="s.label">
      <dt>{{ s.value }}</dt>
      <dd>{{ s.label }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
const stats = [
  { value: "7", label: "核心表" },
  { value: "2", label: "设计器模式" },
  { value: "15+", label: "审批动作" },
  { value: "4", label: "ORM 框架" },
  { value: "4", label: "数据库" },
];
</script>
```

- [ ] **Step 4: `FeaturesGrid.vue`**

```vue
<template>
  <section class="wf-sec">
    <div class="wf-inner">
      <div class="wf-sh"><span class="no">01 /</span><h2>为什么是 Warm-Flow</h2></div>
      <div class="wf-feat-grid">
        <a v-for="f in features" :key="f.title" class="wf-feat" :href="`${base}${f.link}`">
          <span class="ic">{{ f.icon }}</span>
          <h3>{{ f.title }}</h3>
          <p>{{ f.details }}</p>
          <span class="more">{{ f.linkText }} →</span>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const base = import.meta.env.BASE_URL;
const features = [
  { icon: "[]", title: "7 张表起步", details: "表结构一目了然，代码量少，可快速上手与集成，不背历史包袱。", link: "master/primary/table.html", linkText: "表结构" },
  { icon: "↦", title: "15+ 审批动作", details: "通过、退回、撤销、拿回、任意跳转、终止、转办、票签、委派、加减签、并行互斥。", link: "master/primary/started.html", linkText: "快速入门" },
  { icon: "◇", title: "双模式设计器", details: "jar 包形式快速集成，原生支持经典与仿钉钉两种模式，节点属性可扩展。", link: "master/primary/designerIntroduced.html", linkText: "设计器介绍" },
  { icon: "${}", title: "表达式体系", details: "内置 ${handler} 办理人表达式与常见 SpEL 条件表达式，可自定义扩展。", link: "master/advanced/variableStategy.html", linkText: "办理人表达式" },
  { icon: "◉", title: "监听器体系", details: "四种监听器、不同颗粒度作用范围，支持参数传递与动态权限。", link: "master/advanced/listener.html", linkText: "监听器" },
  { icon: "▤", title: "多租户与软删除", details: "引擎自身维护多租户与软删除，也可直接沿用对应 ORM 框架的实现方式。", link: "master/advanced/tenant.html", linkText: "进阶篇" },
];
</script>
```

- [ ] **Step 5: `QuickNav.vue`**

```vue
<template>
  <section class="wf-sec soft">
    <div class="wf-inner">
      <div class="wf-sh"><span class="no">02 /</span><h2>你要去哪</h2></div>
      <div class="wf-qn-grid">
        <a v-for="q in quickNavs" :key="q.title" class="wf-qn" :href="`${base}${q.link}`">
          <span class="t">{{ q.tag }}</span>
          <h3>{{ q.title }}</h3>
          <p>{{ q.details }}</p>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const base = import.meta.env.BASE_URL;
const quickNavs = [
  { tag: "START", title: "5 分钟集成", details: "初级篇 · 快速入门，从依赖到发起第一个流程实例。", link: "master/primary/started.html" },
  { tag: "DESIGN", title: "流程设计器", details: "经典 / 仿钉钉双模式，节点属性扩展与流程图查看。", link: "master/primary/designerIntroduced.html" },
  { tag: "REFERENCE", title: "API 速查", details: "定义、执行、查询三类服务接口与常用参数。", link: "master/primary/api.html" },
  { tag: "MIGRATE", title: "2.0 升级指南", details: "破坏性变更、注意事项与迁移步骤。", link: "master/other/upgrade_guide.html" },
];
</script>
```

- [ ] **Step 6: `CaseShowcase.vue`**

```vue
<template>
  <section class="wf-sec">
    <div class="wf-inner">
      <div class="wf-sh"><span class="no">03 /</span><h2>谁在生产环境用它</h2></div>
      <div class="wf-case-grid">
        <a v-for="c in shown" :key="c.title" class="wf-case" :href="c.href || 'javascript:void(0)'">
          <span class="thumb"><img :src="c.src" :alt="c.title" loading="lazy" /></span>
          <span class="bd">
            <strong>{{ c.title }}</strong>
            <span class="by">{{ c.author }}</span>
            <span class="intro">{{ c.intro }}</span>
          </span>
        </a>
      </div>
      <p class="wf-oneline">
        已有 <b>30</b> 家企业与个人公开使用 Warm-Flow，另有 <b>66</b> 个 Dromara 成员项目同源共建
        <a :href="`${base}master/introduction/community.html`">查看社区与集成案例 →</a>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { cases } from "../../data/home.js";

const base = import.meta.env.BASE_URL;
// 精选 3 条：跳过无外链的条目，优先官方案例与两个高星集成
const shown = cases.filter((c) => c.href).slice(0, 3);
</script>
```

- [ ] **Step 7: `SiteFooter.vue`**

```vue
<template>
  <footer class="wf-foot">
    <div class="wf-inner wf-foot-inner">
      <div class="wf-cols">
        <div>
          <span>文档</span>
          <a :href="`${base}master/primary/started.html`">快速开始</a>
          <a :href="`${base}master/primary/table.html`">表结构</a>
          <a :href="`${base}master/primary/api.html`">API 一览</a>
        </div>
        <div>
          <span>社区</span>
          <a href="https://gitee.com/sgs98/warm-flow" target="_blank" rel="noreferrer">Gitee 仓库</a>
          <a href="https://gitee.com/sgs98/warm-flow/issues" target="_blank" rel="noreferrer">Issues</a>
          <a :href="`${base}master/introduction/community.html`">集成案例</a>
        </div>
        <div>
          <span>关于</span>
          <a :href="`${base}master/other/team.html`">团队</a>
          <a :href="`${base}master/introduction/license.html`">License · MIT</a>
          <a :href="`${base}master/other/upgrade_guide.html`">升级指南</a>
        </div>
      </div>
      <p class="wf-cr">
        Dromara Warm-Flow · 国产自研工作流引擎<br />MIT License · Copyright © 2024-2026
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const base = import.meta.env.BASE_URL;
</script>
```

- [ ] **Step 8: `Home.vue`**

```vue
<template>
  <main class="wf-home">
    <Hero />
    <div class="wf-hero-body">
      <CodePanel />
      <StatsBar />
    </div>
    <FeaturesGrid />
    <QuickNav />
    <CaseShowcase />
    <SiteFooter />
  </main>
</template>

<script setup lang="ts">
import Hero from "./Hero.vue";
import CodePanel from "./CodePanel.vue";
import StatsBar from "./StatsBar.vue";
import FeaturesGrid from "./FeaturesGrid.vue";
import QuickNav from "./QuickNav.vue";
import CaseShowcase from "./CaseShowcase.vue";
import SiteFooter from "./SiteFooter.vue";
</script>
```

- [ ] **Step 9: `styles/home.scss`**

```scss
.wf-home {
    background: var(--wv-bg);
    color: var(--wv-fg);
    font-family: var(--wv-sans);
}

// ---------- hero ----------
.wf-hero,
.wf-hero-body {
    background:
        radial-gradient(900px 320px at 50% -120px, color-mix(in srgb, var(--wv-brand) 14%, transparent), transparent 70%),
        linear-gradient(var(--wv-line) 1px, transparent 1px) 0 0 / 100% 34px,
        linear-gradient(90deg, var(--wv-line) 1px, transparent 1px) 0 0 / 34px 100%,
        var(--wv-bg-hero);
    text-align: center;
}
.wf-hero { padding: 56px 24px 28px; }
.wf-hero-body { padding: 0 24px 8px; }

.wf-eyebrow {
    margin: 0;
    font-family: var(--wv-mono);
    font-size: 11.5px;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: var(--wv-brand);
}
.wf-h1 {
    margin: 14px auto 12px;
    max-width: 17em;
    font-size: clamp(28px, 4.6vw, 41px);
    font-weight: 800;
    line-height: 1.22;
    letter-spacing: -.02em;
    color: var(--wv-fg);
    em { font-style: normal; color: var(--wv-brand); }
}
.wf-sub {
    margin: 0 auto;
    max-width: 40em;
    font-size: 15.5px;
    line-height: 1.75;
    color: var(--wv-fg-mute);
}
.wf-cta { display: flex; gap: 12px; justify-content: center; margin: 26px 0 0; flex-wrap: wrap; }
.wf-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 11px 22px; border-radius: 8px;
    font-size: 14.5px; font-weight: 600; text-decoration: none;
    &.primary {
        background: var(--wv-brand); color: #fff;
        box-shadow: 0 6px 18px color-mix(in srgb, var(--wv-brand) 30%, transparent);
    }
    &.ghost { border: 1px solid var(--wv-line); color: var(--wv-fg); background: var(--wv-bg); }
    .star { color: var(--wv-amber); }
}

// ---------- code panel ----------
.wf-panel { max-width: 760px; margin: 0 auto; text-align: left; }
.wf-tabs {
    display: flex; gap: 2px; padding: 0 12px;
    span {
        font-family: var(--wv-mono); font-size: 12px; padding: 8px 14px;
        border-radius: 7px 7px 0 0; color: #8b98a5;
        &.on { background: var(--wv-code-bg); color: #e6edf3; }
    }
}
.wf-code {
    margin: 0; padding: 20px 22px; overflow-x: auto;
    background: var(--wv-code-bg); color: #c9d1d9;
    border-radius: 0 10px 10px 10px;
    font-family: var(--wv-mono); font-size: 13px; line-height: 1.85;
    box-shadow: 0 18px 40px rgba(4, 18, 32, .28);
    .step { display: inline-block; min-width: 1.4em; color: #6b7d8f; }
    .c { color: #6b7d8f; } .k { color: #ff7b72; } .t { color: #7ee787; }
    .s { color: #a5d6ff; } .f { color: #58a6ff; } .n { color: #f0a04b; }
    .a { color: #d2a8ff; } .v { color: #ffa657; }
}

// ---------- stats ----------
.wf-stats {
    display: flex; max-width: 760px; margin: 34px auto 0;
    padding: 0; border-top: 1px solid var(--wv-line);
    > div { flex: 1; padding: 18px 8px 26px; text-align: center; }
    > div + div { border-left: 1px solid var(--wv-line); }
    dt { margin: 0; font-family: var(--wv-mono); font-size: 26px; font-weight: 700; letter-spacing: -.04em; color: var(--wv-brand); }
    dd { margin: 0; font-size: 12.5px; color: var(--wv-fg-mute); }
}

// ---------- sections ----------
.wf-sec { padding: 56px 24px; &.soft { background: var(--wv-bg-soft); border-top: 1px solid var(--wv-line); border-bottom: 1px solid var(--wv-line); } }
.wf-inner { max-width: 1000px; margin: 0 auto; }
.wf-sh {
    display: flex; align-items: baseline; gap: 14px; margin-bottom: 26px;
    .no { font-family: var(--wv-mono); font-size: 12px; color: var(--wv-brand); }
    h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -.02em; color: var(--wv-fg); }
}

.wf-feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.wf-feat {
    display: block; padding: 18px; border: 1px solid var(--wv-line); border-radius: 11px;
    background: var(--wv-bg); text-decoration: none; color: inherit;
    transition: border-color .2s, transform .2s;
    &:hover { border-color: var(--wv-brand); transform: translateY(-2px); }
    .ic {
        display: grid; place-items: center; width: 30px; height: 30px; margin-bottom: 12px;
        border-radius: 8px; background: var(--wv-bg-hero); color: var(--wv-brand);
        font-family: var(--wv-mono); font-size: 12px; font-weight: 700;
    }
    h3 { margin: 0 0 6px; font-size: 15.5px; color: var(--wv-fg); }
    p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--wv-fg-mute); }
    .more { display: inline-block; margin-top: 10px; font-size: 12px; color: var(--wv-brand); }
}

.wf-qn-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.wf-qn {
    display: block; padding: 16px; border: 1px solid var(--wv-line); border-radius: 11px;
    background: var(--wv-bg); text-decoration: none; color: inherit;
    transition: border-color .2s;
    &:hover { border-color: var(--wv-brand); }
    .t { font-family: var(--wv-mono); font-size: 11px; letter-spacing: .1em; color: var(--wv-amber); }
    h3 { margin: 8px 0 5px; font-size: 15px; color: var(--wv-fg); }
    p { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--wv-fg-mute); }
}

.wf-case-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.wf-case {
    display: block; overflow: hidden; border: 1px solid var(--wv-line); border-radius: 11px;
    background: var(--wv-bg); text-decoration: none; color: inherit;
    .thumb {
        display: grid; place-items: center; height: 96px; padding: 0 14px;
        background: var(--wv-bg-hero); border-bottom: 1px solid var(--wv-line);
        img { max-width: 100%; max-height: 100%; object-fit: contain; }
    }
    .bd { display: block; padding: 14px 16px 16px; }
    strong { display: block; font-size: 15px; color: var(--wv-fg); }
    .by { display: block; margin: 3px 0 8px; font-size: 12px; color: var(--wv-amber); }
    .intro {
        display: block; font-size: 12.5px; line-height: 1.7; color: var(--wv-fg-mute);
        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
    }
}
.wf-oneline {
    margin: 22px 0 0; padding-top: 18px; border-top: 1px dashed var(--wv-line);
    font-size: 13.5px; color: var(--wv-fg-mute);
    b { font-family: var(--wv-mono); color: var(--wv-fg); }
    a { margin-left: 6px; color: var(--wv-brand); font-weight: 600; text-decoration: none; }
}

// ---------- footer ----------
.wf-foot { padding: 30px 24px 40px; border-top: 1px solid var(--wv-line); background: var(--wv-bg); }
.wf-foot-inner { display: flex; gap: 40px; flex-wrap: wrap; align-items: flex-start; }
.wf-cols {
    display: flex; gap: 56px; flex-wrap: wrap; font-size: 13px;
    > div span { display: block; margin-bottom: 9px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--wv-fg-mute); }
    a { display: block; line-height: 1.9; color: var(--wv-fg); opacity: .85; text-decoration: none; }
}
.wf-cr { margin: 0 0 0 auto; font-size: 12px; line-height: 1.9; color: var(--wv-fg-mute); text-align: right; }

// ---------- 入场动效 ----------
@keyframes wf-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.wf-hero > *,
.wf-hero-body > *,
.wf-hero .wf-cta { animation: wf-rise .52s cubic-bezier(.22, .61, .36, 1) both; }
.wf-hero .wf-eyebrow { animation-delay: 0s; }
.wf-hero .wf-h1 { animation-delay: .06s; }
.wf-hero .wf-sub { animation-delay: .12s; }
.wf-hero .wf-cta { animation-delay: .18s; }
.wf-hero-body .wf-panel { animation-delay: .24s; }
.wf-hero-body .wf-stats { animation-delay: .32s; }

@media (prefers-reduced-motion: reduce) {
    .wf-hero > *, .wf-hero-body > *, .wf-hero .wf-cta { animation: none; }
}

// ---------- 响应式 ----------
@media (max-width: 1199px) {
    .wf-feat-grid { grid-template-columns: repeat(2, 1fr); }
    .wf-qn-grid { grid-template-columns: repeat(2, 1fr); }
    .wf-stats { flex-wrap: wrap; > div { flex: 0 0 33.333%; } > div:nth-child(4) { border-left: 0; } }
}
@media (max-width: 739px) {
    .wf-hero { padding: 40px 16px 22px; }
    .wf-feat-grid, .wf-qn-grid, .wf-case-grid { grid-template-columns: 1fr; }
    .wf-stats { overflow-x: auto; > div { flex: 0 0 auto; min-width: 96px; } }
    .wf-code { font-size: 12px; }
    .wf-cta { flex-direction: column; align-items: stretch; }
    .wf-cols { gap: 28px; }
    .wf-cr { margin-left: 0; text-align: left; }
}
```

- [ ] **Step 10: 汇总到 index.scss**

`src/.vuepress/styles/index.scss` 顶部改成：

```scss
@use "tokens";
@use "home";
```

- [ ] **Step 11: 构建断言**

Run: `pnpm docs:build`
Expected: 成功。若报 `Cannot find module '../../data/home.js'`，把 `CaseShowcase.vue` 的 import 改成 `"../../data/home.ts"` 再试（vuepress 的 vite 允许带扩展名）。

- [ ] **Step 12: 提交（此时首页还没接上，属正常）**

```bash
git add src/.vuepress/components/home src/.vuepress/styles/home.scss src/.vuepress/styles/index.scss
git commit -m "feat: 新增首页组件树与首页样式"
```

---

### Task 6: Layout 分支渲染首页

**Files:**
- Modify: `src/.vuepress/layouts/Layout.vue`（整体替换）

- [ ] **Step 1: 重写 Layout.vue**

```vue
<script setup lang="ts">
import { usePageFrontmatter } from "vuepress/client";
import { Layout as HopeLayout } from "vuepress-theme-hope/client";
import type { ThemeBasePageFrontmatter } from "vuepress-theme-hope";

import Home from "../components/home/Home.vue";
import DynamicEditLink from "../components/DynamicEditLink.vue";

const frontmatter = usePageFrontmatter<ThemeBasePageFrontmatter>();
</script>

<template>
  <!-- theme-hope 的 HomePage 槽位只有 heroBefore/heroAfter/content，撑不住自定义首屏，
       所以首页整体换成自有组件树 -->
  <Home v-if="frontmatter.home" />
  <HopeLayout v-else>
    <template #pageBottom>
      <DynamicEditLink />
    </template>
  </HopeLayout>
</template>

<style lang="scss">
.vp-toc-wrapper {
  height: auto;
  max-height: 50vh;
}
</style>
```

> ⚠️ **更正（2026-09-25 实测）**：先前"`#contentAfter` 是死代码、`DynamicEditLink` 没渲染"的判断**是错的**。当前 `Layout.vue` 仍用 `#contentAfter`，浏览器里 `a.warm-edit` 正常渲染、href 正确、图标加载成功。说明该槽位确实被消费（我读 `PageContent.js` 时只 grep 了 `slots.xxx` 字面量，漏了动态透传）。
> 因此本任务**不存在"修 bug"**，改成 `#pageBottom` 只是可选的语义统一 —— 若改，必须实测 `a.warm-edit` 仍渲染。首页不需要编辑链接，所以只在非首页分支给。

- [ ] **Step 2: 重启 dev**

停掉后台 `docs:dev`，重新 `pnpm docs:dev`。
Expected: 启动无报错。

- [ ] **Step 3: 浏览器断言（首页）**

打开 `http://localhost:8081/`，执行：

```js
({
  hero: !!document.querySelector('.wf-h1'),
  code: !!document.querySelector('.wf-code'),
  stats: document.querySelectorAll('.wf-stats dt').length,
  feats: document.querySelectorAll('.wf-feat').length,
  qn: document.querySelectorAll('.wf-qn').length,
  cases: document.querySelectorAll('.wf-case').length,
  foot: !!document.querySelector('.wf-foot'),
  oldHero: !!document.querySelector('.vp-hero'),
  brokenImgs: Array.from(document.images).filter(i => i.complete && !i.naturalWidth).map(i => i.src),
})
```
Expected: `hero/code/foot` 为 true，`stats=5 feats=6 qn=4 cases=3`，`oldHero` 为 false（旧 theme-hope hero 不再出现），`brokenImgs` 为空数组。

- [ ] **Step 4: 浏览器断言（文档页 + 编辑链接）**

打开 `http://localhost:8081/master/primary/started.html`，执行：

```js
({ toc: !!document.querySelector('.vp-toc-wrapper'), editLink: !!document.querySelector('.dynamic-edit-link, [class*=edit]') })
```
Expected: 两者均 true。若 `editLink` 为 false，用 `document.querySelector('.page-bottom')?.innerHTML` 查实际渲染，确认槽位名后再修 `DynamicEditLink.vue` 的根 class。

- [ ] **Step 5: 提交**

```bash
git add src/.vuepress/layouts/Layout.vue
git commit -m "feat: 首页改用自有组件树渲染，修复 DynamicEditLink 槽位名错误"
```

---

### Task 7: 首页 README 瘦身

> **状态更新（2026-09-25 实施中）**：README 里的「优秀开源集成案例」与「52 家企业墙」两个模板块、对应数据数组、`openLink` 与 `.com-box-f / .s-case* / .flex1` 样式**已删除**（用户直接要求去掉），**Dromara 墙也已一并删除**（用户后续要求）。`src/README.md` 现在只剩 frontmatter（65 行）：hero + 12 条 highlights，三个板块与全部内联 `<script>/<style>` 均已清空。`data/home.ts` 仍保留 66 条 Dromara 数据供社区页使用。
> ⚠️ 副作用：随 `<script>` 一起删掉的还有 `navigateTo()` 注入的 Gitee star/fork/license 徽章，首页目前没有徽章（重设计首页时按 Hero.vue 的正规写法补回）。

**Files:**
- Modify: `src/README.md`（整体替换）

- [ ] **Step 1: 替换 `src/README.md`**

```md
---
home: true
icon: home
title: 首页
breadcrumbExclude: false
---
```

> 全部视觉与数据已迁到 `components/home/*` 与 `data/home.ts`。`home: true` 必须保留 —— `layouts/Layout.vue` 靠它分支。

- [ ] **Step 2: 构建断言**

Run: `pnpm docs:build && grep -c "wf-h1" src/.vuepress/warm-flow-docs/index.html`
Expected: 计数 ≥ 1（首页静态产物里含新 hero）。

- [ ] **Step 3: 死链断言**

Run: `grep -c "el-card\|foruda.gitee.com/images/1782145373387433321" src/README.md`
Expected: `0`（旧 Element 模板与内联数据已从 README 清除）。

- [ ] **Step 4: 提交**

```bash
git add src/README.md
git commit -m "refactor: 首页 README 瘦身，内容与数据迁至组件与 data/home.ts"
```

---

## 阶段 D：公告横幅与导航

### Task 8: 顶部公告横幅

> **状态更新（2026-09-25 已完成）**：实现方式与原计划不同 —— 计划说"放在 theme-hope `<Layout>` 之前、全宽"，但实测 navbar 是 `position: fixed`（`navbar.scss:6`），放它上面会被导航栏遮住。
> 实际采用：`AnnouncementBar.vue` 渲染在 **`#pageTop` 槽**（`PageContent.js` 确认支持 `pageTop/content/pageBottom`），出现在正文列顶部、fixed 导航栏下方。因此横幅是正文列宽度（非全宽），但避免了遮挡问题。
> `#contentAfter`（DynamicEditLink）保留不动，实测与 `#pageTop` 并存无冲突。
> 已删 `theme.ts` 的 `plugins.notice`（原 52–137 行）。
> 实测闭环：文档页显示横幅（bg `--wv-bg-hero`、radius 10px、pill v2.0.0、升级指南+Star 两链接）→ 点 ✕ 写 `localStorage[wf-announce-dismissed]="2.0.0"` 并即时隐藏 → 刷新保持隐藏 → 清空 localStorage 后重现 → 首页 `/` 始终不显示。`docs:build` 通过。

**Files:**
- Create: `src/.vuepress/components/AnnouncementBar.vue`
- Create: `src/.vuepress/styles/announcement.scss`
- Modify: `src/.vuepress/layouts/Layout.vue`
- Modify: `src/.vuepress/theme.ts`（删除 `plugins.notice`）
- Modify: `src/.vuepress/styles/index.scss`

- [ ] **Step 1: `AnnouncementBar.vue`**

```vue
<template>
  <div v-if="visible" class="wf-announce">
    <span class="pill">v2.0.0</span>
    <strong>Warm-Flow 2.0.0 已发布</strong>
    <span class="txt">破坏性变更与迁移步骤见升级指南</span>
    <a :href="`${base}master/other/upgrade_guide.html`">升级指南 →</a>
    <a href="https://gitee.com/sgs98/warm-flow/stargazers" target="_blank" rel="noreferrer">★ Star</a>
    <button class="x" type="button" aria-label="关闭公告" @click="dismiss">✕</button>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vuepress/client";
import { computed, onMounted, ref } from "vue";

const VERSION = "2.0.0";
const KEY = "wf-announce-dismissed";
const base = import.meta.env.BASE_URL;
const route = useRoute();
const dismissed = ref(true); // 默认 true：SSR 阶段不渲染，避免水合不一致

// route.path 含部署 base，必须先剥掉再判断，否则子路径部署时公告永不出现
const inDocs = computed(() => {
  const relative = route.path.slice(base.length - 1);
  return relative.startsWith("/master");
});
const visible = computed(() => inDocs.value && !dismissed.value);

onMounted(() => {
  dismissed.value = localStorage.getItem(KEY) === VERSION;
});

const dismiss = () => {
  localStorage.setItem(KEY, VERSION);
  dismissed.value = true;
};
</script>
```

- [ ] **Step 2: `styles/announcement.scss`**

```scss
.wf-announce {
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    padding: 8px 24px;
    border-bottom: 1px solid var(--wv-line);
    background: var(--wv-bg-hero);
    color: var(--wv-fg-mute); font-size: 13px;
    strong { color: var(--wv-fg); }
    .pill {
        padding: 1px 8px; border: 1px solid var(--wv-brand); border-radius: 99px;
        font-family: var(--wv-mono); font-size: 10.5px; color: var(--wv-brand);
    }
    a { color: var(--wv-brand); text-decoration: none; &:hover { text-decoration: underline; } }
    .x {
        margin-left: auto; padding: 2px 6px; border: 0; background: none;
        color: inherit; font-size: 13px; cursor: pointer;
    }
    @media (max-width: 739px) { .txt { display: none; } }
}
```

- [ ] **Step 3: 接进 Layout**

`src/.vuepress/layouts/Layout.vue` 的 template 改成（两个分支都要有横幅，所以放在最外层）：

```vue
<template>
  <AnnouncementBar />
  <Home v-if="frontmatter.home" />
  <HopeLayout v-else>
    <template #pageBottom>
      <DynamicEditLink />
    </template>
  </HopeLayout>
</template>
```

并在 script 里加 import：

```ts
import AnnouncementBar from "../components/AnnouncementBar.vue";
```

- [ ] **Step 4: 删除旧弹窗**

`src/.vuepress/theme.ts` 删掉 `plugins.notice` 整个键（约 51–136 行，含注释掉的 Gitee 投票那条）。保留 `plugins` 里的 `slimsearch / components / icon`。

- [ ] **Step 5: 汇总样式**

`src/.vuepress/styles/index.scss` 顶部加 `@use "announcement";`

- [ ] **Step 6: 重启 dev 并断言**

```js
// http://localhost:8081/master/primary/started.html
({ bar: !!document.querySelector('.wf-announce'), popup: !!document.querySelector('.vp-notice-wrapper') })
```
Expected: `bar` true、`popup` false。

- [ ] **Step 7: 关闭持久化断言**

浏览器里点 ✕，执行 `localStorage.getItem('wf-announce-dismissed')` → 期望 `"2.0.0"`；刷新页面 → 横幅消失；再执行 `localStorage.removeItem('wf-announce-dismissed')` 并刷新 → 横幅回来。

- [ ] **Step 8: 首页不显示断言**

打开 `http://localhost:8081/`，执行 `!!document.querySelector('.wf-announce')` → 期望 `false`（`/` 不以 `/master` 开头）。

- [ ] **Step 9: 提交**

```bash
git add src/.vuepress/components/AnnouncementBar.vue src/.vuepress/styles/announcement.scss \
        src/.vuepress/layouts/Layout.vue src/.vuepress/theme.ts src/.vuepress/styles/index.scss
git commit -m "feat: 全屏公告弹窗改为顶部可关闭横幅"
```

---

### Task 9: navbar 与 sidebar 更新

**Files:**
- Modify: `src/.vuepress/navbar.ts`
- Modify: `src/.vuepress/sidebar.ts`

- [ ] **Step 1: navbar 增加社区**

`src/.vuepress/navbar.ts` 在「团队」条目前插入：

```ts
    {
        text: '社区',
        link: '/master/introduction/community.md',
    },
```

- [ ] **Step 2: sidebar 增加社区分组**

`src/.vuepress/sidebar.ts` 的 `/master/` 数组末尾（`🚸 其他` 之后）追加：

```ts
        {
            text: "社区",
            collapsible: true,
            expanded: true,
            children: [
                'introduction/community.md',
                'introduction/projectexample.md',
                'introduction/companyintegration.md',
            ],
        },
```

- [ ] **Step 3: 移除 emoji 分组名**

把现有五个分组的 `text` 依次改成 `"开始"`、`"初级篇"`、`"进阶篇"`、`"提高篇"`、`"其他"`（序号由 CSS 生成，见 Task 12）。

- [ ] **Step 4: 构建断言**

Run: `pnpm docs:build && grep -c "community" src/.vuepress/warm-flow-docs/master/introduction/community.html`
Expected: 构建成功且产物存在（若报缺文件，说明 community.md 还没建 —— 先跳到 Task 15 建页，再回来提交本任务）。

- [ ] **Step 5: 提交**

```bash
git add src/.vuepress/navbar.ts src/.vuepress/sidebar.ts
git commit -m "feat: 导航与侧栏新增社区分组，分组名去 emoji"
```

---

## 阶段 E：文档正文样式

### Task 10: 正文覆写 `content.scss`

> **状态更新（2026-09-25 已完成）**：⚠️ 原计划所有 `.theme-hope-content` 选择器**在本主题版本（theme-hope rc.92）下不存在、不生效** —— 实测正文容器是 `main.vp-page > div[vp-content]`（见 `MarkdownContent.js:35`：`h("div", { class:{custom}, "vp-content":"" })`，无 `theme-hope-content` 类）。`content.scss` 已全部改用 `[vp-content]` 作用域。
> 连带修正：`index.scss` 里原有两条 `.theme-hope-content` 规则（`table img` 与外链箭头 `::after{display:none}`）一直是死代码。`table img` 并入 content.scss；外链箭头隐藏规则迁到 `[vp-content]` 后**首次真正生效**（文档内外链 ↗ 箭头不再显示，原作者意图，此前静默失效）。
> 实测命中（浏览器 computed style）：表格 radius 10px；代码块 `div[class*=language-]` border 1px + radius 10px；提示块 `.hint-container.tip` 左框 3px 品牌蓝、标题蓝（原绿色）、底 `--wv-bg-hero`；行内代码 `[vp-content] :not(pre)>code` 1px 描边 + 4px 圆角 + JetBrains Mono；`.vp-page-title h1::after` 琥珀 44px。
> 注意：提示块类名是 `.hint-container.{tip,warning,danger,info}`（不是 `.custom-block` / `.vp-note`）；正文里 `<code>` 可能全在 `<pre>` 内（围栏块），行内代码需挑确有反引号的页面验证。

**Files:**
- Create: `src/.vuepress/styles/content.scss`
- Modify: `src/.vuepress/styles/index.scss`

- [ ] **Step 1: 写 `styles/content.scss`**

```scss
// 文档正文覆写。只作用于 .theme-hope-content，首页不受影响。
.theme-hope-content {
    color: var(--wv-fg);
    line-height: 1.85;

    // H1 短划线由 .vp-page-title h1::after 提供（theme-hope 把页面标题渲染在 content 外）
    h2 {
        margin-top: 2.4em;
        padding-bottom: .3em;
        border-bottom: 1px solid var(--wv-line);
        letter-spacing: -.01em;
    }
    h3 { margin-top: 1.8em; }

    a { color: var(--wv-brand); }

    code {
        padding: 1px 5px;
        border: 1px solid var(--wv-line);
        border-radius: 4px;
        background: var(--wv-bg-soft);
        color: var(--wv-brand-ink);
        font-family: var(--wv-mono);
        font-size: .88em;
    }

    // 表格：描边 + 圆角 + 表头底色
    table {
        display: table; width: 100%;
        border-collapse: separate; border-spacing: 0;
        border: 1px solid var(--wv-line);
        border-radius: 10px;
        overflow: hidden;
        background: var(--wv-bg);
        th { background: var(--wv-bg-soft); font-size: 12.5px; letter-spacing: .02em; }
        th, td { border: 0; border-inline-end: 1px solid var(--wv-line); border-bottom: 1px solid var(--wv-line); }
        th:last-child, td:last-child { border-inline-end: 0; }
        tr:last-child td { border-bottom: 0; }
        td { padding: 8px 12px; }
        td code { border: 0; background: none; padding: 0; }
    }

    // 图片：描边 + 圆角 + 居中
    img {
        border: 1px solid var(--wv-line);
        border-radius: 10px;
    }
    p:has(> img) { text-align: center; }

    // 提示块统一取色
    .vp-note, .custom-block {
        border-inline-start: 3px solid var(--wv-brand);
        border-radius: 0 8px 8px 0;
        background: var(--wv-bg-hero);
    }
}

// 标题下方琥珀短划线（作用于 theme-hope 的页面标题）
.vp-page-title h1::after {
    content: "";
    display: block;
    width: 44px; height: 2px;
    margin-top: 10px;
    background: var(--wv-amber);
}

// 代码块容器与首页面板同一底色语言
.vp-code-wrapper,
.vp-code-tabs {
    border: 1px solid var(--wv-line);
    border-radius: 10px;
}

// 旧 .yat（表格/截图边框）迁移到新卡片样式；markdown 里的类名替换完后此条可删
.theme-hope-content .yat {
    @extend .wf-card;
    margin: 16px 0;
}

// 翻页卡片
.vp-page-nav a {
    border: 1px solid var(--wv-line);
    border-radius: 10px;
    background: var(--wv-bg);
}

// TOC 导轨
.vp-toc-wrapper {
    border-inline-start: 2px solid var(--wv-line);
    .vp-toc-link.active { color: var(--wv-brand); font-weight: 600; }
}
```

- [ ] **Step 2: 汇总**

`src/.vuepress/styles/index.scss` 顶部加 `@use "content";`

- [ ] **Step 3: 构建断言**

Run: `pnpm docs:build`
Expected: 成功。若 `@extend .wf-card` 报 `extension target not found`，说明 `tokens` 未在 `content` 之前引入 —— 把 `@use "tokens";` 挪到 index.scss 第一行；仍失败则把 `.theme-hope-content .yat` 块里的 `@extend` 换成 `border:1px solid var(--wv-line); border-radius:10px; overflow:hidden; background:var(--wv-bg);` 四行字面量。

- [ ] **Step 4: 明暗两套肉眼断言**

浏览器打开 `http://localhost:8081/master/primary/table.html`（表格密集的页），明色与暗色各截一张图，检查：表格圆角与描边可见、表头与正文底色有区分、行内代码不刺眼、页面标题下有琥珀短划线。

- [ ] **Step 5: 提交**

```bash
git add src/.vuepress/styles/content.scss src/.vuepress/styles/index.scss
git commit -m "style: 文档正文重绘（标题/表格/代码/提示块/图片/TOC/翻页）"
```

---

### Task 11: 侧栏与 navbar 样式

> **状态更新（2026-09-25 实施中）**：本任务的侧栏部分**已完成**，代码在 `styles/tokens.scss` + `styles/sidebar.scss` + `styles/index.scss` 顶部。实测纠正了两处：
> 1. `.vp-sidebar-link` **本身就是 `<a>`**（真实 class 为 `route-link route-link-active auto-link vp-sidebar-link active`），不是父元素。原计划的 `.vp-sidebar-link.active > .vp-link` 选择器**永不匹配**，已改为 `.vp-sidebar-link.active`。
> 2. 侧栏底部死区（`index.scss` 原来写死的 `height: calc(100% - 254px)`）已用 flex 列修掉：`.vp-sidebar { display:flex; flex-direction:column; overflow-y:hidden }` + `> .vp-sidebar-links { flex:1 1 auto; min-height:0; overflow-y:auto; overscroll-behavior:contain }`。实测 `deadSpace` 从 201px 变 0。
> 3. 主题把 `--vp-c-accent-bg` 定义在 `:root`（绿色），必须在令牌层覆盖 `--vp-c-accent / --vp-c-accent-bg / --vp-c-accent-soft`，否则选中项与滚动条仍是绿色。
>
> 本任务**剩余**工作只有 navbar 部分。navbar 的 `.vp-site-name` / `.nav-link.active > .vp-text-content` 两个选择器**尚未实测校验**，执行时先用 `document.querySelector('.vp-navbar')?.innerHTML.slice(0,600)` 校准。

**Files:**
- Create: `src/.vuepress/styles/sidebar.scss`
- Modify: `src/.vuepress/styles/index.scss`

- [ ] **Step 1: 写 `styles/sidebar.scss`**

```scss
// 侧栏分组自动序号。sidebar.ts 已去掉 emoji，序号在这里生成。
// 选择器来源：实测 node_modules/vuepress-theme-hope/lib/client/styles/sidebar/sidebar-group.scss
// 使用 .vp-sidebar-group > .vp-sidebar-header，标题文本在 .vp-sidebar-title 内。
.vp-sidebar {
    counter-reset: wf-group;
    font-family: var(--wv-sans);
}
.vp-sidebar-group > .vp-sidebar-header > .vp-sidebar-title::before {
    content: counter(wf-group, decimal-leading-zero);
    counter-increment: wf-group;
    margin-inline-end: 8px;
    font-family: var(--wv-mono);
    font-size: .8em;
    font-weight: 400;
    letter-spacing: .04em;
    color: var(--wv-fg-mute);
}

// 选中态：左侧竖条 + 淡底
.vp-sidebar-link.active > .vp-link {
    color: var(--wv-brand);
    font-weight: 600;
    background: var(--wv-bg-hero);
    box-shadow: inset 2px 0 0 var(--wv-brand);
    border-radius: 0 6px 6px 0;
}

.vp-sidebar-links, .vp-nav-links { font-size: 15px; }

// navbar：logo 与站名的排布
.vp-navbar {
    .vp-site-name { font-weight: 800; letter-spacing: -.02em; }
    .nav-link.active > .vp-text-content { color: var(--wv-brand); font-weight: 600; }
}
```

- [ ] **Step 2: 断言序号真实渲染（选择器与版本不符时必须在这里发现）**

重启 dev 后打开 `http://localhost:8081/master/primary/started.html`，执行：

```js
Array.from(document.querySelectorAll('.vp-sidebar-group > .vp-sidebar-header > .vp-sidebar-title'))
  .map(e => getComputedStyle(e, '::before').content + ' | ' + e.textContent.trim())
```
Expected: 6 行，`content` 依次为 `"00"`…`"05"`，文本为 开始 / 初级篇 / 进阶篇 / 提高篇 / 其他 / 社区。

**若返回空数组**，说明该版本 DOM 结构不同：执行 `document.querySelector('.vp-sidebar-group')?.outerHTML.slice(0, 400)` 拿到真实结构，按实际类名回头修 Step 1 的选择器后重跑本断言，**不允许跳过**。

- [ ] **Step 3: 汇总 + 构建**

`index.scss` 顶部加 `@use "sidebar";`，Run `pnpm docs:build` → 期望成功。

- [ ] **Step 4: 肉眼断言**

明暗两套下检查：分组标题前出现 `00`–`05` 等宽序号、当前页有左侧 brand 竖条、emoji 已消失。

- [ ] **Step 5: 提交**

```bash
git add src/.vuepress/styles/sidebar.scss src/.vuepress/styles/index.scss
git commit -m "style: 侧栏与 navbar 重绘（分组自动序号 + 选中态竖条）"
```

---

## 阶段 F：二级页面与收尾

### Task 12: `community.md` 与 Dromara 墙

**Files:**
- Create: `src/.vuepress/components/community/DromaraWall.vue`
- Create: `src/master/introduction/community.md`
- Modify: `src/.vuepress/styles/index.scss`（可选：社区墙样式并入 `content.scss`）

- [ ] **Step 1: `DromaraWall.vue`**

```vue
<template>
  <div class="wf-wall">
    <a
      v-for="p in dromaraProjects"
      :key="p.href || p.title"
      class="wf-wall-item"
      :href="p.href || 'javascript:void(0)'"
      :title="p.title"
      target="_blank"
      rel="noreferrer"
    >
      <img :src="p.src" :alt="p.title" loading="lazy" />
    </a>
  </div>
</template>

<script setup lang="ts">
import { dromaraProjects } from "../../data/home.js";
</script>

<style lang="scss">
.wf-wall {
    display: flex; flex-wrap: wrap; gap: 10px;
    &-item {
        display: flex; align-items: center; justify-content: center;
        box-sizing: content-box; width: 132px; height: 44px; padding: 10px;
        border: 1px solid var(--wv-line); border-radius: 10px;
        background: var(--wv-bg);
        transition: border-color .2s;
        &:hover { border-color: var(--wv-brand); }
        img { max-width: 100%; max-height: 100%; object-fit: contain; border: 0; }
    }
}
</style>
```

- [ ] **Step 2: `community.md`**

```md
---
title: 社区
icon: community
order: 7
---

# 社区

Warm-Flow 由 Dromara 社区共同维护。已有 **30** 家企业与个人公开使用它。

## 开源集成案例

案例清单与说明见 [集成案例](./projectexample.md)。若你的开源项目也使用了 Warm-Flow，欢迎
[在 GitHub 提 Issue](https://github.com/sgs98/warm-flow/issues) 加入列表。

## 正在使用 Warm-Flow 的企业

企业名单见 [企业集成](./companyintegration.md)。

## Dromara 成员项目

为往圣继绝学 —— 一个人或许能走得更快，但一群人会走得更远。

<DromaraWall />
```

- [ ] **Step 3: 构建断言**

Run: `pnpm docs:build && grep -c "wf-wall" src/.vuepress/warm-flow-docs/master/introduction/community.html`
Expected: 计数 ≥ 1。

- [ ] **Step 4: 浏览器断言**

打开 `http://localhost:8081/master/introduction/community.html`，执行：

```js
({ items: document.querySelectorAll('.wf-wall-item').length,
   broken: Array.from(document.images).filter(i => i.complete && !i.naturalWidth).length })
```
Expected: `items` = 66，`broken` = 0（若有 broken，逐条打印 src 定位是 `base` 前缀丢了还是文件确实不存在，不要静默忽略）。

- [ ] **Step 5: 提交**

```bash
git add src/.vuepress/components/community/DromaraWall.vue src/master/introduction/community.md
git commit -m "feat: 新增社区页与 Dromara 项目墙，承接首页移出的内容"
```

---

### Task 13: 移除 Element Plus

**Files:**
- Modify: `src/.vuepress/client.ts`
- Modify: `package.json`

- [ ] **Step 1: 前置断言（必须先过）**

```bash
grep -rn "<el-" src/master src/README.md || echo "OK: 文档零 el- 使用"
grep -rn "element-plus\|ElementPlus" src/ --include=*.md --include=*.ts --include=*.vue
```
Expected: 第一条输出 `OK: 文档零 el- 使用`；第二条只剩 `client.ts` 与 `package.json`。**若 markdown 里还有命中，停止本任务并回报，不要继续删。**

- [ ] **Step 2: 改 client.ts**

删除这两行：

```ts
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
```

以及 `enhance` 里的 `app.use(ElementPlus);`。保留 `Layout` 注册、`DynamicEditLink` 注册与百度统计路由钩子。

- [ ] **Step 3: 卸载依赖**

Run: `pnpm remove element-plus`
Expected: `package.json` 的 `dependencies` 里不再有 `element-plus`。

- [ ] **Step 4: 构建断言**

Run: `pnpm docs:build`
Expected: 成功，且日志无 `element-plus` 相关 unresolved import。

- [ ] **Step 5: 体积断言**

Run: `du -sh src/.vuepress/warm-flow-docs/assets/`
Expected: 相比移除前明显下降（把移除前后的数值记进 commit message 或 PR 描述）。

- [ ] **Step 6: 全站肉眼回归**

浏览器抽查 `master/introduction/processdemo.html`（用了 BiliBili/VPCard 组件）、`master/other/team.html`、首页。执行 `Array.from(document.images).filter(i=>i.complete&&!i.naturalWidth).length` → 期望 0；控制台无报错。

- [ ] **Step 7: 提交**

```bash
git add src/.vuepress/client.ts package.json pnpm-lock.yaml
git commit -m "chore: 移除 Element Plus（首页改版后已无使用处）"
```

---

### Task 14: 旧工具类全量替换

> **状态更新（2026-09-25 已完成）**：实测所有用法都是精确 `class="red-no-bg"`/`"red-font"`/`"big-font"`，无多类名组合、无单引号写法 → 直接字符串替换安全。
> 映射：`red-no-bg`(19) + `red-font`(4) → `.wf-em`（句中琥珀强调，继承字号；red-font 原来的 20px 是粗暴放大、与正文不协调，去掉属修正）；`big-font`(7) → `.wf-lead`（17px 琥珀，多用于包链接，链接色仍走 brand）。
> 连带清理 index.scss 死代码（均因本次重设计失效）：`.red-*`/`.big-font`/`.no-border`/`.link-style`（0 使用）、`.vp-notice-wrapper`（弹窗已删）、`.vp-hero-*`/`#main-description`/`.vp-highlight-image`/`.vp-feature-title`（首页已换自定义 Home）。**并修掉一个隐藏冲突**：`.vp-sidebar-links { font-size: 18px }` 原本在 `@use "sidebar"` 之后加载会覆盖 sidebar.scss 的 15px，已删。
> 实测：`grep` 旧类名 markdown 0 残留、CSS 产物 0 残留；`wf-em` 渲染 `rgb(240,160,75)` 600 字重、`wf-lead` 17px 且内含链接正常；`docs:build` 通过。

**Files:**
- Modify: `src/master/**/*.md`（`red-no-bg` / `red-bg` / `red-bg-bold` / `yat` / `big-font` / `red-font` / `red-font-bold`）
- Modify: `src/.vuepress/styles/index.scss`（删除旧类定义）

- [ ] **Step 1: 盘点**

```bash
grep -rn "class=\"[^\"]*\(red-no-bg\|red-bg-bold\|red-bg\|red-font-bold\|red-font\|big-font\)" src/master | wc -l
grep -rln "class=\"yat\"\|class=\"yat " src/master | wc -l
```
Expected: 记录两个数字（spec 实测约 30 处工具类、15 处 `yat`），作为替换后的对照基线。

- [ ] **Step 2: 批量替换**

```bash
cd src/master
LC_ALL=C find . -name '*.md' -print0 | xargs -0 perl -pi -e '
  s/class="red-bg-bold"/class="wf-em"/g;
  s/class="red-no-bg"/class="wf-em"/g;
  s/class="red-bg"/class="wf-em"/g;
  s/class="red-font-bold"/class="wf-em"/g;
  s/class="red-font"/class="wf-lead"/g;
  s/class="big-font"/class="wf-lead"/g;
  s/class="yat"//g;
'
```

> `class="yat"` 直接清空而不是换成 `wf-card`：正文图片已有全局描边（Task 10），表格也有描边，多数场景不需要额外类。若替换后发现有裸 `<div>` 包裹导致排版塌陷，再补 `class="wf-card"`。

- [ ] **Step 3: 零残留断言**

```bash
grep -rn "red-no-bg\|red-bg\|red-font\|big-font\|\"yat\"" . ; cd -
```
Expected: 无输出（0 命中）。

- [ ] **Step 4: 删除旧样式定义**

`src/.vuepress/styles/index.scss` 删掉 `.red-no-bg / .red-bg / .red-bg-bold / .red-font / .red-font-bold / .big-font / .yat / .link-style / .no-border / .com-box-img / .com-box-f / .s-case* / .s-author / .links / .imgTip / .flex1` 这些只服务旧首页或已无引用的块。**保留** `.vp-*` 覆写与 `.theme-hope-content table img`。

- [ ] **Step 5: 构建 + 抽查**

Run `pnpm docs:build` → 成功。浏览器抽查 3 个用到过这些类的页面（`grep` 结果里挑），确认强调文字仍醒目、表格与截图有边框。

- [ ] **Step 6: 提交**

```bash
git add src/master src/.vuepress/styles/index.scss
git commit -m "refactor: 文档正文旧工具类统一迁移到 wf-em / wf-lead"
```

---

### Task 15: 二级页面重排

> **状态更新（2026-09-25 已完成）**：全部样式改用实测选择器 `[vp-content]`（本主题无 `.theme-hope-content`）。
> - `.yat` 去掉硬编码 `2px #ccc` 边框（暗色脏 + 与 content.scss 图片描边双框），改为纯留白。
> - introduction.md 两张设计器热链图 → `/designer/classic.png` + `/designer/dingtalk.png`（实测 ok、0 破图）。
> - team.md `<table>` 加 `class="wf-team"` → grid 成员卡（实测 display grid、3 行、头像 50% 圆）。
> - troubleshooting.md 用 `<div class="wf-faq">` 包裹 → 13 个 h2 卡头（左 3px brand 条 + 圆角 + 底色）。**关键**：FAQ body 不用 `h2 + *` 包边框（答案含 p/ul/code 多兄弟会溢出破框），只给 h2 做卡头。
> - update.md + upgrade_guide.md 用 `<div class="wf-timeline">` 包裹 → h3 版本节点圆点 + 左导轨。
> - **实测验证 markdown 在 div 包裹后仍解析**：upgrade_guide 的 2 个 `:::` 容器仍渲染成 `.hint-container`（4 个 `:::` 标记=2 开 2 闭）、h3 为 `.wf-timeline > h3` 直接子节点、无裸 `<div>` 文本泄漏。`docs:build` 通过。

**Files:**
- Modify: `src/.vuepress/styles/content.scss`（追加二级页面专用样式）
- Modify: `src/master/introduction/introduction.md`（设计器截图换本地图）

- [ ] **Step 1: introduction.md 换设计器图**

`src/master/introduction/introduction.md:25-26` 两张热链图替换：

```md
<div><img src="/designer/classic.png" alt="经典模式设计器"/></div>
<div><img src="/designer/dingtalk.png" alt="仿钉钉模式设计器"/></div>
```

（`designerIntroduced.md` 上一轮已换，这里保持一致，否则介绍页会展示旧界面。）

- [ ] **Step 2: FAQ 页卡片化**

先在 `src/master/other/troubleshooting.md` 里，`# 常见问题` 标题之后紧跟一行 `<div class="wf-faq">`，文件末尾补一行 `</div>`（页面级作用域，避免误伤其它文档的 h2）。

`content.scss` 追加：

```scss
// 常见问题：每个 h2 问答包成卡片，标题条做卡头
.theme-hope-content .wf-faq > h2 {
    padding: 10px 14px;
    margin-top: 1.6em;
    border: 1px solid var(--wv-line);
    border-radius: 10px 10px 0 0;
    border-bottom: 0;
    background: var(--wv-bg-soft);
    font-size: 16px;
}
.theme-hope-content .wf-faq > h2 + * {
    margin-top: 0;
}
```

- [ ] **Step 3: 团队页成员卡**

`src/master/other/team.md` 里给 `<table>` 加类名（一行改动，比按表头文本匹配可靠）：

```md
<table class="wf-team">
```

`content.scss` 追加：

```scss
// 团队页：成员表格渲染成卡片网格
.theme-hope-content table.wf-team {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
    border: 0; background: none; overflow: visible;
    thead { display: none; }
    tbody { display: contents; }
    tr {
        display: flex; flex-direction: column; gap: 4px;
        padding: 16px; border: 1px solid var(--wv-line); border-radius: 12px;
        background: var(--wv-bg);
    }
    td {
        display: block; padding: 0; border: 0;
        &:first-child img { width: 48px; height: 48px; border-radius: 50%; border: 1px solid var(--wv-line); }
        &:nth-child(2) { font-size: 15px; font-weight: 700; }
        &:nth-child(4) { font-family: var(--wv-mono); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--wv-amber); }
        &:last-child { font-size: 12px; color: var(--wv-fg-mute); }
    }
}
```

- [ ] **Step 4: 版本时间线**

`src/master/other/update.md` 与 `src/master/other/upgrade_guide.md` 各在首个 h1 之后插入 `<div class="wf-timeline">`，文件末尾补 `</div>`。

`content.scss` 追加（只加左导轨与节点圆点，版本号文字本身已在 h2 里，不生成任何内容）：

```scss
// 版本时间线：h2 即版本号
.theme-hope-content .wf-timeline {
    position: relative;
    padding-inline-start: 28px;
    &::before {
        content: ""; position: absolute; inset-block: 6px; inset-inline-start: 4px;
        width: 1px; background: var(--wv-line);
    }
    > h2 {
        position: relative;
        font-family: var(--wv-mono);
        &::after {
            content: ""; position: absolute; inset-inline-start: -32px; top: .55em;
            width: 9px; height: 9px; border-radius: 50%;
            background: var(--wv-brand); box-shadow: 0 0 0 3px var(--wv-bg);
        }
    }
}
```

- [ ] **Step 6: 构建 + 逐页肉眼断言**

`pnpm docs:build` 成功后，浏览器逐个检查（明暗各一次）：`introduction.html`（新设计器图）、`troubleshooting.html`（问答卡片）、`team.html`（成员卡）、`update.html` 与 `upgrade_guide.html`（时间线）。

- [ ] **Step 7: 提交**

```bash
git add src/master src/.vuepress/styles/content.scss
git commit -m "style: 二级页面重排（介绍页截图、FAQ 卡片、团队卡、版本时间线）"
```

---

### Task 16: 子路径部署与最终验收

**Files:**
- 无新增（纯验证；发现问题则在对应文件修复）

- [ ] **Step 1: 子路径构建**

Run: `VUE_BASE=/warm-flow-doc/ pnpm docs:build`
Expected: 成功。

- [ ] **Step 2: 资源前缀断言**

```bash
grep -o "src=\"[^\"]*designer[^\"]*\"" src/.vuepress/warm-flow-docs/master/primary/designerIntroduced.html
grep -o "href=\"[^\"]*favicon[^\"]*\"" src/.vuepress/warm-flow-docs/index.html
```
Expected: 两条都带 `/warm-flow-doc/` 前缀。**若 designer 图没有前缀**（原始 HTML `<img>` 的根绝对路径不会被 VuePress 重写），改用 markdown 语法 `![经典模式设计器](/designer/classic.png)` 重写 `designerIntroduced.md` 与 `introduction.md` 的那两行，并给 `.theme-hope-content img` 的描边样式确认仍然生效，然后重跑 Step 1。

- [ ] **Step 3: 首页产物断言**

```bash
grep -c "wf-h1\|wf-code\|wf-stats" src/.vuepress/warm-flow-docs/index.html
grep -c "querySelector('#main-description')\|typeWriter" src/README.md src/.vuepress/**/*.vue 2>/dev/null | grep -v ":0" || echo "OK: DOM 注入 hack 已清除"
```
Expected: 第一条 ≥ 3；第二条 `OK: DOM 注入 hack 已清除`。

- [ ] **Step 4: 12 个截图点**

明 / 暗 × {首页, `master/primary/table.html`, `master/primary/designerIntroduced.html`, `master/other/team.html`, `master/other/troubleshooting.html`, `master/introduction/community.html`} = 12 张截图，逐张确认：文字对比度达标、琥珀面积 <2%、暗色下代码块比页面底更沉、无破图。

截图执行方式（浏览器里）：

```js
document.documentElement.setAttribute('data-theme','dark')  // 切暗色后截图
Array.from(document.images).filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)  // 每张页面都跑一次，期望 []
```

- [ ] **Step 5: 可访问性与动效断言**

浏览器控制台执行，确认 reduced-motion 生效：

```js
matchMedia('(prefers-reduced-motion: reduce)').matches
```
在系统开启"减弱动态效果"后重开页面，首屏所有元素立即可见（无 opacity:0 残留）。

- [ ] **Step 6: 搜索回归**

首页搜索框输入 `监听器` → 期望有结果；输入 `多租户` → 期望有结果（slimsearch 索引未因首页改版而丢失文档内容）。

- [ ] **Step 7: 最终构建（根路径）并清理**

```bash
pnpm docs:clean-dev
pnpm docs:build
```
Expected: 成功。确认 `.superpowers/` 已在 `.gitignore`（上一轮已加）。

- [ ] **Step 8: 提交**

```bash
git add -u
git commit -m "fix: 子路径部署下设计器截图资源前缀修正"
```

> 只有 Step 2 发现需要改动时才产生这个提交；若一切正常，跳过 Step 8 并在收尾时把验收结果汇报给用户。

---

### Task 17: 修复 TOC 压住正文（用户实测反馈，待确认窗口宽度）

> **状态更新（2026-09-25 已实现，待用户桌面肉眼确认）**：
> 根因定位（读 `main-layout.scss`）：theme-hope 在 ≥1440px 给 `.vp-page` 设 `padding-inline-end: calc(100vw - content-width - sidebar-space - 6rem)` 作为 TOC 右栏留白，`#toc` 绝对定位到该留白。实测 `--content-width:925px`、`--sidebar-space` 在 1440–1580px 区间被 clamp 到 304px，导致留白 < TOC 所需 ~16rem → TOC 溢出视口或被超宽表格顶到正文上。
> 修法：给留白加 `max(…, 17rem)` 下限（`content.scss` 末尾），宽屏不触发、窄桌面兜底，结构上保证 TOC 有独立列。
> ⚠️ **验证限制**：Qoder 内置浏览器视口固定 ~627px（移动端 TOC 内联 static，复现不出桌面重叠），无法截图确认 ≥1440px 效果。已验证：规则正确产出、627px 下媒体查询不命中故无回归、`docs:build` 通过。**需用户在 ≥1440px 窗口肉眼确认重叠消失**；若仍有问题，改用"TOC 转真实 grid 列"方案（见下方 Step 2 备选）。

**Files:**
- Modify: `src/.vuepress/styles/content.scss`

**已知机制（读 `node_modules/vuepress-theme-hope/lib/client/styles/info/toc.scss` 得到）：**

```scss
.vp-toc-placeholder { position: sticky; top: calc(var(--navbar-height) + .5rem); z-index: 99; }
#toc { @media (min-width: $pc) { position: absolute; inset-inline-start: calc(100% + 1rem); } }
```

TOC 靠**溢出到正文右侧留白**摆放，不占布局列。主区宽度不足时它会压在正文上。用户全屏截图（3012px 物理宽 / dpr 2）里 TOC 落在正文**左侧**并盖住"1.1 表描述"，说明 `calc(100% + 1rem)` 的解析结果不是预期位置。

- [ ] **Step 1: 采集真实数据（不得跳过，不得猜测）**

在用户的全屏窗口里执行（或请用户提供 `window.innerWidth`）：

```js
(() => { const t=document.querySelector('#toc'), p=document.querySelector('.vp-toc-placeholder'), c=document.querySelector('.theme-hope-content');
  return { w: innerWidth, toc: t.getBoundingClientRect().toJSON(), tocPos: getComputedStyle(t).position,
           ph: p.getBoundingClientRect().toJSON(), content: c.getBoundingClientRect().toJSON(),
           contentW: getComputedStyle(document.documentElement).getPropertyValue('--content-width') }; })()
```

Expected: 拿到 TOC 与正文的实际 rect，确认是"留白不足"还是"锚点父级不是正文"。

- [ ] **Step 2: 按数据选择修法**

- 若为留白不足：主区改为真正的两列布局，不再依赖溢出定位。
```scss
// 让 TOC 占一个真实列，而不是 absolute 溢出
.vp-page {
    @media (min-width: 1440px) {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 15rem;
        column-gap: 1.5rem;
        align-items: start;
    }
}
.vp-page > .vp-toc-placeholder { position: sticky; grid-column: 2; }
.vp-page > [vp-content] { grid-column: 1; }
#toc { position: static; inset-inline-start: auto; max-width: none; }
```
- 若 Step 1 显示 `#toc` 的定位父级不是 `.vp-page`（即 absolute 基准错了），改为把 `position: absolute` 关掉并用上面的网格方案，两者都落到 `content.scss`。

- [ ] **Step 3: 断言不再重叠**

```js
(() => { const t=document.querySelector('#toc').getBoundingClientRect(), c=document.querySelector('.theme-hope-content').getBoundingClientRect();
  return { overlapX: Math.max(0, Math.min(t.right,c.right)-Math.max(t.left,c.left)),
           overlapArea: Math.max(0, Math.min(t.right,c.right)-Math.max(t.left,c.left)) * Math.max(0, Math.min(t.bottom,c.bottom)-Math.max(t.top,c.top)) }; })()
```
Expected: `overlapArea` 为 0（横向投影交集 `overlapX` 也必须为 0）。

- [ ] **Step 4: 多宽度回归**

在 1280 / 1440 / 1800 / 2560 四个宽度各跑一次 Step 3，全部为 0；并确认 <1440 时 TOC 退化为内联折叠块、不遮挡任何文字。

- [ ] **Step 5: 提交**

```bash
git add src/.vuepress/styles/content.scss
git commit -m "fix: TOC 改为真实布局列，不再压住正文"
```

---

## 自查记录

- **spec 覆盖**：§3 令牌/字体 → Task 1–2；§6 Logo → Task 3；§4 首页 → Task 4–7；§5.1 公告 → Task 8；§5.2–5.4 导航/侧栏/页脚 → Task 9、11、Task 5 Step 7；§7.1 正文 → Task 10；§7.2 侧栏/TOC/翻页 + `contentAfter` 修复 → Task 6、11；§7.3 二级页面 → Task 12、15；§7.4 工具类 → Task 14；§8 数据与依赖清理 → Task 4、7、13；§9 响应式 → Task 5 Step 9；§11 验收 → Task 16。spec §5.4 的页脚只在首页出现（`SiteFooter` 只挂在 `Home.vue`），与 `displayFooter: false` 一致。
- **占位符**：无 TBD / "稍后实现"。所有 CSS 选择器均来自实测（`PageContent.js` 的 `pageTop/content/pageBottom`、`HomePage.js` 的 `heroBefore/heroAfter/content`、`sidebar-group.scss` 的 `.vp-sidebar-group > .vp-sidebar-header`、`useDarkMode.js:68` 的 `data-theme`），每个任务都带可执行断言；断言失败时给的是"取真实 DOM 再修"的明确指令，而不是"自行调整"。
- **任务顺序依赖**：Task 9（navbar/sidebar 指向 community）依赖 Task 12（建页）。若按序执行，Task 9 Step 4 构建会告缺文件 —— 此时先做 Task 12 再回来提交 Task 9，或把 Task 9 的提交推迟到 Task 12 之后。
- **类型一致性**：`data/home.ts` 导出 `cases / dromaraProjects / companies` 三个名字，`CaseShowcase.vue`（Task 5 Step 6）与 `DromaraWall.vue`（Task 12 Step 1）分别引用 `cases` 与 `dromaraProjects`，`companies` 暂不渲染（spec §8 要求保留数据）。`CaseItem extends ProjectItem`，故 `cases` 上确有 `href/title/src/author/intro` 全部字段。
