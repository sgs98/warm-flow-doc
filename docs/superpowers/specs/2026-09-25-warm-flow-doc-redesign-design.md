# Warm-Flow 文档站全站重设计 · 设计文档

日期：2026-09-25
范围：全站（首页 + 主题框架 + 文档正文 + 4 个二级页面 + Logo）
交付形态：VuePress 2 + vuepress-theme-hope 之上的自定义组件与 SCSS 令牌层，不 fork 主题

---

## 1. 目标与定位

Warm-Flow 是 Dromara 下的国产自研工作流引擎，本站是它的官方文档站。当前首页存在三个问题：视觉与"引擎类基础软件"的气质不匹配（emoji 当图标、暖棕猴子 Logo、`<br><br><br>` 调间距）；首页被企业 Logo 墙（数据实为 30 条，末尾 3 条是占位 logo）与 Dromara 项目墙（实为 66 条）占据大半篇幅，真正该说话的技术信息被稀释；首屏动效与徽章是用 `document.querySelector` 注入 DOM 实现的，硬编码 `#333` 导致暗色模式下文字不可见（已实测确认）。

重设计后的定位：**极简工程风入口**。首页的使命是让一个 Java 后端工程师在 10 秒内判断"这东西够轻、能解决我的审批需求、集成只要三步"，然后点进文档。

不做的事：不改任何文档内容的技术表述；不引入新的重量级运行时依赖；不 fork 或补丁 node_modules。

---

## 2. 已确认的决策

| 项 | 决策 |
|---|---|
| 视觉基调 | 浅色 = 清透蓝白；暗色 = 工业深蓝黑。两套主题用 theme-hope 自带切换，跟随系统偏好并记忆用户选择 |
| 首页首屏 | 「代码即首屏」：居中标题 + 双 CTA + 三步集成代码面板 + 数字条 |
| 首页第二屏 | 特性精选 3×2 + 快速通道四卡 + 开源集成案例精选 3 条 |
| 企业墙（30 条）+ 开源集成案例块 | 从首页移除（数据保留在 `data/home.ts`，见 §8）；实施中用户已直接确认删除 |
| Dromara 项目墙（66 条） | 已从首页删除（用户后续要求）；数据保留在 `data/home.ts`，`community.md` 若要展示需重新确认 |
| 全屏公告弹窗 | 改为顶部可关闭细横幅 |
| Logo | 方案 A「网关分叉」：菱形判断节点向右分叉，纯描边几何 |
| 覆盖层级 | 全站含文档正文与二级页面 |

---

## 3. 设计令牌

写入 `src/.vuepress/styles/index.scss`（生成 CSS 变量），并同时挂在 `:root` 与 `html[data-theme="dark"]` 上——theme-hope 用 `useDarkMode.js:68` 设置 `data-theme` 属性，但部分内置样式仍混用 `.dark` 类，因此两套选择器都要覆盖。

| 令牌 | 浅色 | 暗色 | 用途 |
|---|---|---|---|
| `--wv-brand` | `#126bae` | `#58a6ff` | 主行动色、链接、选中态、Logo 上色 |
| `--wv-brand-ink` | `#0b4d7e` | `#9ecbff` | 链接 hover、行内代码文字 |
| `--wv-amber` | `#e08a2e` | `#f0a04b` | 极小点缀：H1 短划线、star、案例作者、标签页激活 |
| `--wv-bg` | `#ffffff` | `#0d1117` | 页面底 |
| `--wv-bg-soft` | `#f6f8fa` | `#11161d` | 分区底、表头 |
| `--wv-bg-hero` | `#eef4fa` | `#0f1e2d` | hero、卡片图标底、选中项底 |
| `--wv-fg` | `#1c2933` | `#d5dde5` | 正文 |
| `--wv-fg-mute` | `#5b6b7a` | `#8b98a5` | 辅助文字 |
| `--wv-line` | `#e3e9ef` | `#1f2630` | 描边、分隔线 |
| `--wv-code-bg` | `#0d1117` | `#010409` | 代码块底，**恒深**，两主题一致 |

三条硬约束：

1. **暗色不是反色。** 代码面板在暗色下比页面背景更沉（`#010409` vs `#0d1117`），卡片用描边分层而非阴影。
2. **琥珀色面积 < 2%。** 只用于短划线、star、作者名、标签页激活下划线。超量会让品牌蓝的"工程感"退化成奶茶色。
3. **`$theme-color` 保持同步。** `styles/palette.scss` 里的 `$theme-color` 仍是 theme-hope 内部变量的来源，浅色保持 `#126bae`；暗色下 theme-hope 自带的 `--theme-color` 覆盖由我们在 `[data-theme="dark"]` 里改写为 `#58a6ff`，不改 node_modules。

### 字体

- 正文/标题：系统 CJK 栈（`-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei"`）。中文字体文件过大，不做 webfont。
- 等宽：`JetBrains Mono`，仅 latin 子集、400/700 两档，通过 `@fontsource-variable/jetbrains-mono` 自托管（新增 devDependency，构建期打包，无外部 CDN 依赖，规避国内访问 Google Fonts 失败）。
- 等宽体的使用范围就是"工程感"的全部载体：eyebrow、数字条、表格字段名、侧栏分组序号、面包屑、代码。

### 版式母题

网格底纹（hero 背景，透明度 ≤5%）+ 等宽小标签（`01 /`、`docs / 01 初级篇 /`）+ 等宽数字放大。不引入装饰性图形。

---

## 4. 首页

### 4.1 接入方式

`src/.vuepress/layouts/Layout.vue` 改为分支渲染：`frontmatter.home` 为真时渲染自定义 `<Home>`，否则渲染 theme-hope 的 `<Layout>`。依据：`layouts/base/Layout.js:22` 在 `frontmatter.home` 时渲染内置 `HomePage`，其槽位仅 `heroBefore / heroAfter / content`，不足以承载自定义首屏。

`src/README.md` 保留 `home: true` frontmatter（用于路由与标题），删除全部内嵌 `<script>` / `<style>` / Element 模板。

### 4.2 组件结构

```
src/.vuepress/
├─ components/home/
│  ├─ Home.vue            根组件：编排子组件 + 入场动画时序
│  ├─ Hero.vue            eyebrow / H1 / sub / 双 CTA / star 徽章
│  ├─ CodePanel.vue       三步集成标签页（三步集成 | pom.xml | application.yml）
│  ├─ StatsBar.vue        5 格数字条：7 核心表 / 2 设计器模式 / 15+ 审批动作 / 4 ORM / 4 数据库
│  ├─ FeaturesGrid.vue    特性精选 3×2
│  ├─ QuickNav.vue        快速通道四卡：START / DESIGN / REFERENCE / MIGRATE
│  ├─ CaseShowcase.vue    开源集成案例 3 条 + 一行社区入口
│  └─ SiteFooter.vue      三栏页脚 + 版权
├─ composables/                  （无需自建深色状态——theme-hope 已在 `composables/index.js` 导出 `useDarkMode`，直接 import）
└─ data/home.ts                  案例 / Dromara / 企业数据数组
```

`CodePanel.vue` 的高亮用 `<span>` + 令牌类（`.k` 关键字 / `.s` 字符串 / `.t` 注解 / `.n` 类型 / `.g` 注释 / `.f` 标识符 / `.step` 序号）手写，不引入 shiki 或 prism 运行时。

### 4.3 内容文案

- eyebrow：`Dromara · 国产自研工作流引擎 · v2.0.0`
- H1：`7 张表，一个依赖，跑通整条审批流`（"7 张表"用 brand 色）
- sub：`简洁轻量、五脏俱全、灵活可扩展。原生支持经典与仿钉钉双模式设计器，退回 / 撤销 / 任意跳转 / 转办 / 委派 / 加减签开箱即用。`
- CTA：主 `快速开始 →` 指向 `/master/primary/started.html`；次 `★ Star on Gitee` 指向仓库
- 特性六格：7 张表起步 / 15+ 审批动作 / 双模式设计器 / 表达式体系 / 监听器体系 / 多租户与软删除，每格一句说明 + 直达文档锚点
- 底部一行：`已有 30 家企业与个人公开使用 Warm-Flow，另有 66 个 Dromara 成员项目同源共建 → 查看社区与集成案例`
  （数字取自 `data/home.ts` 实测条目数，不要沿用旧文案里的"52 家"—— 该说法来自被移除的标题，与真实数据不符）

### 4.4 动效

一次性分层入场，替换现在的打字机循环：eyebrow → H1 → sub → CTA → 代码面板 → 数字条，`animation-delay` 依次 0 / 60 / 120 / 180 / 240 / 320ms，`translateY(12px) + opacity` 淡入上移，时长 520ms，缓动 `cubic-bezier(.22,.61,.36,1)`。代码面板内三步按 400ms 间隔逐行显现。`@media (prefers-reduced-motion: reduce)` 下所有元素直接可见、无 transform。

滚动进入第二屏时不做 IntersectionObserver 动画——文档站重复滚动会累加干扰，YAGNI。

---

## 5. 主题框架

### 5.1 公告横幅

删除 `theme.ts` 的 `plugins.notice`，新增 `components/AnnouncementBar.vue`：

- 渲染位置：自定义 `Layout.vue` 中、theme-hope `<Layout>` 之前，全宽（theme-hope 的 `MainLayout` 不提供 `contentBefore` 槽，只有 `pageTop` 会渲染在侧栏之内，不适合全宽横幅）
- 显示条件：路由以 `/master` 开头，且 `localStorage` 未记录关闭
- 内容：`v2.0.0` 徽标 + 标题 + 「升级指南」「★ Star」链接 + 关闭按钮
- 关闭状态 key：`wf-announce-dismissed`，值为版本号，版本变更时重新出现

### 5.2 Navbar

- Logo 换成 §6 的 mask 上色方案，高度 26px，右侧站名用 800 字重、`-0.3px` 字距
- 链接：首页 / 文档 / 社区(新) / 团队 / 常见问题 / 计划·日志
- 「文档」下拉保留升级指南入口

### 5.3 侧栏

- 分组标题：等宽小字 + 自动序号（`00 开始` … `05 社区`），移除现有 emoji
- 选中项：左侧 2px `--wv-brand` 竖条 + `--wv-bg-hero` 底 + brand 文字
- 新增第 6 组「社区」，含 `introduction/community.md`、`introduction/projectexample.md`、`introduction/companyintegration.md`
- 移除 `sidebar.ts` 中已不存在的 `introduction/support.md` 引用（当前工作区已删该文件）

### 5.4 页脚

`SiteFooter.vue` 三栏（文档 / 社区 / 关于）+ 右侧版权与 MIT。theme-hope 的 `displayFooter` 保持 `false`，页脚只在首页出现。

---

## 6. Logo

「网关分叉」：菱形判断节点，向右与向下两条实线路径分叉，左分支 45% 透明度表示"未走通的分支"。

- 画布 64×64，描边 3.2；16px 场景改用描边 5 的独立版本
- 纯描边、无渐变、无填充底 → 单色可印
- 上色方式：**SVG 内直接写死各自的色值，出亮/暗两份文件**（`logo.svg` `#126bae` + `logo-dark.svg` `#58a6ff`），交给 theme-hope 原生的 `logoDark` 选项切换（实测 `lib/bundle/index.d.ts:530`、`NavbarBrand.js:13` 渲染 light/dark 两个 `<img>` 并用 CSS 显隐）。原计划的 `mask-image + currentColor` 方案作废 —— 主题已内置该能力，不必自己造

交付文件：
- `public/logo.svg`（描边 `currentColor` 的模板版）
- `public/favicon.svg`（16px 优化：描边加粗、去掉半透明分支）
- `public/favicon.ico` 需重做——**实测该文件其实是 64×64 PNG**，与新 logo 不一致。优先用本地 ImageMagick 从 SVG 导出；若环境无转换工具，则保留旧文件不动并在 PR 描述里标注待办，不为此引入新依赖

`theme.ts` 的 `logo` 指向 `/logo.svg`；`config.ts` 的 `head` 增加 `favicon.svg` 链接。

---

## 7. 文档页与二级页面

### 7.1 正文（`[vp-content]`）

- 最大宽度维持 925px，中文长行可读性优先
- H1 下方 44×2px `--wv-amber` 短划线（全站唯一设计签名）
- **标题不自动编号**：实测文档正文标题已普遍手写编号（`## 1、实现节点扩展属性数据模型接口`），CSS `counter-increment` 会产生"1、1、"重复。只做字号/字距/锚点样式，编号原样保留
- 行内代码：`--wv-bg-soft` 底 + 1px `--wv-line` 描边 + `--wv-brand-ink` 文字，圆角 4px
- 表格：`border-collapse: separate` + 圆角 + 表头 `--wv-bg-soft`；宽表格外层容器横向滚动
- 提示块 `::: tip/warning/danger`：全部从 brand/amber/red 令牌派生，统一圆角与左边框宽度
- 图片：1px 描边 + 圆角 + 居中；紧邻其后的斜体单段自动作为 caption 排版

### 7.2 侧栏 / TOC / 翻页

- TOC 左竖线导轨，当前项 brand 高亮
- 底部翻页卡片化，使用 `pageBottom` 槽
- `Layout.vue` 的 `#contentAfter` 槽位**实测正常工作**（`a.warm-edit` 正常渲染）。早期"它是死代码、需要改成 `#pageBottom`"的判断是误读源码所致，已撤销，不做该改动

### 7.3 二级页面

| 页面 | 新版式 |
|---|---|
| `introduction/introduction.md` | 顶部「集成前须知」清单卡；支持矩阵改写成响应式表格，DB/ORM 列用 ✓/— |
| `introduction/community.md`（新增） | Dromara 项目墙 + 企业墙数据入口 + 集成案例完整列表 |
| `other/team.md` | 成员卡：首字母/头像 + 角色 + 仓库链接，CSS Grid 自适应，不依赖 Element |
| `other/troubleshooting.md` | 原生 `<details>` 手风琴（零依赖），按引擎 / 设计器 / 数据库分组 |
| `other/update.md` + `other/upgrade_guide.md` | 版本时间线：左侧等宽版本号导轨 + 右侧变更；破坏性变更用 diff 风格表格 |

### 7.4 工具类迁移

文档正文重度依赖 4 个手写类（实测计数）：`red-no-bg` ×19、`yat` ×15、`big-font` ×7、`red-font` ×4。处理：

- `red-no-bg` / `red-bg` / `red-bg-bold` → 新增语义类 `.wv-em`（强调，amber 色），旧类名在 markdown 中全部替换，不留兼容层
- `yat`（表格边框）→ 并入新表格默认样式，删除类
- `big-font` / `red-font` → 合并为 `.wv-lead`（18px + 次要色），替换全部出现处

---

## 8. 数据迁移与依赖清理

- `src/README.md` 内联的 `qyProjectList` / `kyProjectList` / `dromaraList` 三个数组迁到 `src/.vuepress/data/home.ts`，带 TS 类型。企业墙数据保留但不渲染（一行注释说明如何恢复）
- **删除 Element Plus**：`client.ts` 移除 `app.use(ElementPlus)` 与 `element-plus/dist/index.css`，`package.json` 移除 `element-plus` 依赖。依据：实测文档页零 `<el-` 使用，仅首页在用
- 删除 `README.md` 的 `navigateTo()`：querySelector 注入 star 徽章 + 打字机循环（含硬编码 `#333`，暗色下不可见）
- 移除 `theme.ts` 的 `plugins.notice`
- `components/BiliBili` / `VPCard` / `SiteInfo` 三个 theme-hope 组件**必须保留**：实测 `master/introduction/processdemo.md` 在用（视频与站点卡片），删掉会直接白块
- `public/logo.png` 保留不删：实测首页案例数据 `kyProjectList` 里 hh-vue 与 Ruoyi-Cloud 两条把它当项目封面图在用，删了会破图。新站标另有 `logo.svg`，两者不冲突

---

## 9. 响应式

| 断点 | 首页表现 |
|---|---|
| ≥1200px | 特性 3 列、快速通道 4 列、数字条 5 格、TOC 可见 |
| 740–1199px | 特性 2 列、快速通道 2 列、数字条 3+2 换行、TOC 收起 |
| <740px | 全部单列；代码面板字号 12px 且横向可滚；数字条横向滚动；H1 降到 28px；CTA 撑满宽度 |

文档页在 <740px 沿用 theme-hope 的侧栏抽屉，仅重绘配色。

---

## 10. 实施顺序

1. 令牌层与字体（`styles/index.scss` + `palette.scss` + fontsource）——先让现有页面在新色板下跑起来，明暗两套都能切换，确认 theme-hope 内置组件没有被我们的变量打破
2. Logo 三件套 + mask 上色接入 navbar/favicon
3. 首页组件树（Home/Hero/CodePanel/StatsBar/FeaturesGrid/QuickNav/CaseShowcase/SiteFooter）+ 数据迁出 + 删除 README 内联脚本与 Element
4. 公告横幅替换全屏弹窗
5. 文档正文样式（标题序号、表格、代码块、提示块、TOC、翻页）
6. 二级页面逐个重排 + `community.md` 新建 + sidebar/navbar 增补
7. 工具类全量替换与旧样式清理

每步结束在本地 `pnpm docs:dev`（端口 8081）验收后再进下一步。步骤 1 和 2 是纯增量，风险最低，可先合入观察。

---

## 11. 验收清单

- 明 / 暗两套主题 × 首页 / 任一文档页 / 4 个二级页面 = 12 个截图点，逐一检查：文字对比度（正文 ≥4.5:1）、琥珀色面积、代码块在暗色下是否"沉"
- 首屏无 CLS：代码面板固定高度占位，字体 `font-display: swap` 不撑破布局
- `prefers-reduced-motion: reduce` 下首屏全部可见
- 移动端 <740px：代码面板可横滚、表格不溢出视口、CTA 可点
- 搜索（slimsearch）在首页改版后仍能索引到文档内容
- 子路径部署：`VUE_BASE=/warm-flow-doc/ pnpm docs:build` 通过，首页所有图片与 logo 路径带前缀（现有 `base + "webp/..."` 的写法在数据迁移时必须保留同等处理）
- 构建无新增 sass 弃用告警（`config.ts` 已静音 `if-function`）
- 无 JS 运行时错误；`document.querySelector('#main-description')` 之类的 DOM 注入全部消失

---

## 12. 风险与对策

| 风险 | 对策 |
|---|---|
| theme-hope 内部样式与新令牌冲突，出现局部错位 | 所有自定义变量加 `--wv-` 前缀，不覆盖主题变量名；只在必要处用选择器覆写，且集中写在 `styles/index.scss` 一个文件里便于回滚 |
| 首页从 frontmatter 改为自定义组件后，theme-hope 的 hero 相关配置失效 | 明确不再使用 `heroText` / `bgImage` / `highlights`，frontmatter 只留 `home: true` + `title`；`bg.jpg` 首页背景图弃用（改 CSS 网格底纹），保留文件一个版本周期 |
| 删除 Element Plus 影响未知页面 | 实施前对 `src/**/*.md` 全量 grep `<el-`，确认为零再删 |
| 暗色模式下 theme-hope 内置代码块语法色与新代码面板不一致 | 统一以 `--wv-code-bg` 为底，theme-hope 的 shiki 配色在 `[data-theme="dark"]` 下对齐到同一组前景色 |
| 工作区已有未提交改动（移除广告位、删 `support.md` 等，非本设计产生） | 实施前先与用户确认这些改动的归属并建议单独提交，避免混入重设计 diff |
| 中文标题无 webfont 导致"气质"依赖字重 | H1 用 800 字重 + 负字距 + brand 色局部着色来补偿，若实测不满意，再评估单个中文显示字体子集化 |

---

## 13. 明确不做

- 不做 i18n / 英文版
- 不做文档版本切换器（多版本下拉）
- 不做首页流程图动画或 3D 装饰
- 不改任何文档的技术内容表述
- 不 fork、不 patch node_modules
- 不引入 Tailwind、UnoCSS 等原子化框架
- 不做滚动驱动的二次入场动画
