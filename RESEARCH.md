# Typographic Flow — 竞品研究与功能借鉴报告

## 研究范围

研究覆盖了 20+ 编辑器/写作应用/插件的排版与专注功能：

**写作应用**: iA Writer, Ulysses, Typora, FocusWriter, novelWriter, Bear, Scrivener
**编辑器**: VS Code, Zed, JetBrains
**Obsidian 插件**: Typewriter Mode, Easy Typing, Dynamic Line Height CJK, Scroller, Zen Writer, Click Clack
**辅助功能**: Bionic Reading, OpenDyslexic, 阅读标尺, FocusFlow
**听觉反馈**: Mechvibes, SoundType, daktilo, Keyboard Sounds

---

## 一、可借鉴功能详表

### A. 专注与视觉层 (Focus & Visual Layer)

#### A1. Hemingway 模式（不可编辑模式）
- **来源**: Obsidian Typewriter Mode 插件
- **功能**: 开启后只能向前写新内容，禁止退格、删改已有文字。强制用户完成初稿后再修改，打破"边写边改"的习惯。
- **意义**: 目前 Typographic Flow 有打字机滚动、Zen、Focus 三个专注维度，但缺少"行为约束"维度。Hemingway 模式是专注的最高级 — 不是隐藏干扰，而是禁止干扰行为本身。
- **复杂度**: **低** — 监听 Backspace/Delete 和鼠标点击旧位置，阻止 CM6 selection 变更。
- **用户价值**: **高** — 对 Draft-First 写作流（先写完再改）有极高价值。

#### A2. 沉浸式纸张主题（Sepia / Green / Dark Night）
- **来源**: Obsidian Zen Writer 插件
- **功能**: 一键切换编辑器为"纸张"视觉风格 — Sepia（仿羊皮纸）、Green（护眼绿）、Dark Night（深灰高对比）。系统默认主题则透明跟随 Obsidian 当前主题。
- **意义**: 当前 Typographic Flow 有 Reading Colors（oklch 色域调整），但手动调色门槛高。预设纸张主题可让用户一键进入沉浸写作环境。
- **复杂度**: **低** — 在 CSS 中预定义 3 套 `--background-primary` / `--text-normal` 色值，通过 body class 切换。
- **用户价值**: **高** — "一键沉浸"远胜于手动调滑块。

#### A3. 可配置的 Zen Mode 隐藏项
- **来源**: VS Code Zen Mode (zenMode.hideLineNumbers, zenMode.hideStatusBar, zenMode.centerLayout)
- **功能**: Zen Mode 不只是虚化文本行，可以一并隐藏行号、状态栏、ribbon、标签页、滚动条等 UI 元素。
- **意义**: 当前 Typographic Flow 的 Fullscreen 模式已隐藏部分 UI，但配置粒度不够细。
- **复杂度**: **低** — 通过 body class + CSS 控制可见性。
- **用户价值**: **中** — 已有 Fullscreen 模式，此项可增强其可配置性。

#### A4. 焦点引导遮罩（Picker Mask）
- **来源**: Obsidian Zen Writer 插件
- **功能**: 在编辑器中使用一个半透明遮罩，只在当前段落保留"清晰窗口"。不是 dim 文字行，而是用一个物理遮罩覆盖上下区域，中心留一个"聚光孔"。
- **意义**: 比 opactiy dim 更具沉浸感 — 它模拟了物理"阅读灯"的体验。当前 Focus Mode 的 Line 模式用 overlay div 实现了类似效果（focus-mode.ts:264），但视觉风格可以增强。
- **复杂度**: **低** — 本质上是 overlay div + CSS gradient mask。
- **用户价值**: **中** — 视觉效果优于纯 opacity dim，但实现成本低。

#### A5. 当前行高亮（下划线/背景色）
- **来源**: Obsidian Typewriter Mode 插件
- **功能**: 在打字机滚动之外，给当前行添加背景色高亮或下划线标记。
- **意义**: 当前 Typographic Flow 的 Zen/Focus 模式是 dim 非活动行，但缺少"正向标记"（highlight 当前行）。两者互补：dim 周边 + highlight 当前 = 双重聚焦。
- **复杂度**: **低** — `.cm-active` 已有，只需在 styles.css 添加 `background` 或 `border-bottom`。
- **用户价值**: **高** — 与 Zen/Focus 互补，几乎零成本。

#### A6. 彩虹缩进引导线 (Rainbow Indent Guides)
- **来源**: VS Code (editor.guides.indentation), Zed (indent_guides.coloring: "indent_aware")
- **功能**: 列表和引用的缩进线上色，每层级不同颜色，帮助快速识别嵌套层级。
- **意义**: 当前 Typographic Flow 已有列表缩进引导线（styles.css 列表样式），但色泽单一。彩虹着色后，层级关系一目了然。
- **复杂度**: **中** — 需要 CSS 中为不同嵌套深度生成不同颜色（可用 CSS `nth-child` 或 CSS 变量）。
- **用户价值**: **中** — 对重度使用嵌套列表/引用的用户有价值。

---

### B. 排版与文字层 (Typography & Text Layer)

#### B1. CJK-Latin 自动间距
- **来源**: Obsidian Easy Typing 插件、Typing Transformer 插件
- **功能**: 在中文和英文/数字之间自动插入 1/4 em 间距。例如：`这是English文字` → `这是 English 文字`。
- **意义**: 中英文混排间距是 CJK 排版的核心痛点。Typographic Flow 已有 CJK 排版模块（cjkProseEnabled），但缺少自动间距功能。两个插件可互补。
- **复杂度**: **高** — 需要在 CM6 中监听输入事件、解析前后字符、判定脚本类型、插入/删除空格。Edge cases 极多（URL、代码块、链接内不应加空格）。
- **用户价值**: **高** — 对中英混写用户是"刚需"级功能。

#### B2. CJK 全角标点自动转换
- **来源**: Obsidian Easy Typing 插件
- **功能**: 在中文输入后，自动将半角标点转换为全角（`,` → `，`、`.` → `。`）。
- **意义**: 同上 — CJK 排版基础需求。可在现有 cjkProseEnabled 模块下扩展。
- **复杂度**: **中** — 标点映射表简单，但需要对 CM6 事务做插入/替换操作。
- **用户价值**: **高** — 对中文用户几乎必需。

#### B3. 句首字母自动大写
- **来源**: Obsidian Easy Typing 插件
- **功能**: 英文句子首字母自动大写。
- **意义**: 对英文写作有价值，与 Sentence 聚焦模式协同。
- **复杂度**: **低** — 检测上一个句子结束标点，下一个字母大写。
- **用户价值**: **中** — 英文写作场景。

#### B4. 渐进式全选 (Progressive Select All)
- **来源**: Obsidian Easy Typing 插件
- **功能**: `Ctrl+A` 第一次选中当前行，第二次扩展到当前段落/块，第三次全文。
- **意义**: 编辑效率提升，与 Focus Mode 的 paragraph/heading 模式逻辑一致。
- **复杂度**: **低** — 监听 Ctrl+A，跟踪状态计数器。
- **用户价值**: **中** — 小但精致的编辑效率提升。

#### B5. 行长度限制器
- **来源**: Obsidian Typewriter Mode 插件
- **功能**: 限制每行最大字符数（如 80 字符），超过后自动换行或将内容变暗提示。
- **意义**: 与现有 text-wrap 功能互补。text-wrap 控制视觉换行，行长度限制控制内容换行。
- **复杂度**: **低** — 通过 CSS `max-width: Nch` 或 CM6 decoration。
- **用户价值**: **中** — 对英文写作和代码注释场景有用。

#### B6. iA Writer 风格语法高亮（词性着色）
- **来源**: iA Writer
- **功能**: 实时检测形容词、副词、名词、动词，用不同颜色标记。帮助发现过度修饰（过多的形容词/副词）。
- **意义**: 从"排版优化"升级到"写作质量辅助"。与现有的 text-wrap、阅读配色模块形成差异化。
- **复杂度**: **高** — 需要集成 NLP 词性标注库（如 compromise.js），对中文支持有限。
- **用户价值**: **中** — 对英文写作者价值高，中文支持困难。

---

### C. 写作统计与目标 (Writing Stats & Goals)

#### C1. 每日写作目标追踪
- **来源**: FocusWriter, Ulysses, novelWriter
- **功能**: 设定每日字数/时间目标，状态栏实时显示进度（如 "850/1000 words, 85%"）。
- **意义**: 当前 Typographic Flow 完全没有统计功能。基础计数（字数/行数/字符数）可大幅提升实用价值。
- **复杂度**: **低** — 从 CM6 `view.state.doc.length` 获取字数，在状态栏渲染。
- **用户价值**: **高** — 几乎每个写作应用都有，属于"预期内"功能。

#### C2. 写作会话计时器
- **来源**: novelWriter
- **功能**: 显示当前写作会话的时长，自动检测空闲（>5 分钟无输入暂停计时），退出时记录会话日志。
- **意义**: 与 WPM 速度渐隐（已实现）互补 — 一个是实时反馈，一个是长期追踪。
- **复杂度**: **低** — 一个 setInterval + 空闲检测（已存在于 velocity-zen.ts 中可复用）。
- **用户价值**: **中** — 对量化写作习惯的用户有价值。

#### C3. 阅读时间预估
- **来源**: iA Writer, Typora
- **功能**: 状态栏显示"预计阅读时间：3 min"，基于字数 ÷ 平均阅读速度计算。
- **意义**: 低成本高感知价值。写作时看到"这篇文章需要 3 分钟读完"有助于控制篇幅。
- **复杂度**: **极低** — `Math.ceil(wordCount / 250)` 一行代码。
- **用户价值**: **中** — 感知价值高，实现成本极低。

---

### D. 听觉反馈 (Audio Feedback)

#### D1. 打字机/机械键盘音效
- **来源**: Obsidian Click Clack 插件, FocusWriter, Mechvibes, daktilo
- **功能**: 按下键盘时播放打字机或机械键盘音效。支持：
  - 多种音效方案（Cherry MX Blue、Holy Panda、经典打字机）
  - 音量/音调随机化（±5% pitch, ±25% gain，避免重复感）
  - Enter/Backspace/Space 独立音效
  - 按应用规则切换音效（写作时开启，浏览时关闭）
- **意义**: 听觉反馈增强"Flow 感"，与速度响应式渐隐形成"视听双通道沉浸"。FocusWriter 用户反馈："打字机音效让写作变得有趣"。
- **复杂度**: **中** — 需要音频资源管理和 AudioContext 调度。Obsidian Click Clack 插件可作参考实现。
- **用户价值**: **极高** — 用户体验的"惊喜"功能，市场差异化强。Obsidian Click Clack 只有 37 star 但口碑极好，说明需求存在但现有实现不够完善。

#### D2. 视觉+听觉联合反馈
- **来源**: 自创（结合 Velocity Zen + Click Clack）
- **功能**: WPM 速度越快 → 音效越清脆 + 画面越暗。三种状态：
  - 低速（<20 WPM）：轻声敲击，画面温和（0.3 opacity）
  - 中速（20-60 WPM）：清晰敲击，画面聚焦（0.2 opacity）
  - 高速（>60 WPM）：清脆连击，画面极暗（0.1 opacity）
- **意义**: 视听同步强化 Flow 状态，创造"节奏驱动的沉浸空间"。
- **复杂度**: **中** — WPM 检测已存在（velocity-zen.ts），音效播放是独立模块。
- **用户价值**: **极高** — 这是 Typographic Flow 区别于所有竞品的独特卖点。没有任何竞品同时做了"速度自适应视觉 + 速度自适应音效"。

---

### E. 辅助功能 (Accessibility)

#### E1. OpenDyslexic 字体切换
- **来源**: OpenDyslexic, Type Shifter, Nook
- **功能**: 一键切换编辑器字体为 OpenDyslexic（专为阅读障碍设计的字体，字母底部加重防止"翻转"）。
- **意义**: 提升插件包容性，打开新用户群体。字体文件 ~100KB，可内嵌或按需下载。
- **复杂度**: **低** — 设置 CSS `@font-face` + 切换 body class。
- **用户价值**: **高**（特定群体）— 对阅读障碍用户是"无障碍刚需"。

#### E2. 阅读标尺 / 焦点行追踪
- **来源**: Tembrica, Nook, Type Shifter
- **功能**: 在屏幕上显示一个水平"标尺"条，跟随光标所在行移动，帮助眼睛追踪当前行。类似物理阅读尺。
- **意义**: 对 ADHD/阅读障碍用户和注意力容易分散的用户有帮助。与 Focus Mode 的 Line 模式互补。
- **复杂度**: **低** — 在 `.cm-active` 行上添加 `border-bottom` 或 `background`，随光标滚动更新位置。
- **用户价值**: **中** — 与 A5（当前行高亮）本质相同，可合并实现。

#### E3. Bionic Reading 模式
- **来源**: Bionic Reading, Type Shifter
- **功能**: 加粗每个单词的前几个字母作为"视觉固定点"，引导眼球快速移动。对 ADHD 用户阅读长文本有显著帮助。
- **意义**: 独特的功能差异化。目前没有任何 Obsidian 插件实现 Bionic Reading。
- **复杂度**: **高** — 需要在 CM6 中解析每个单词、插入 decoration 将前半部分标记为 bold。涉及实时文本处理。
- **用户价值**: **高** — 市场空白，吸引 ADHD/速读用户。

---

## 二、优先级推荐矩阵

按"用户价值 × 实现成本"排序：

| 优先级 | 功能 | 来源 | 复杂度 | 价值 | 理由 |
|--------|------|------|--------|------|------|
| **P0** | 打字机音效（D1） | Click Clack / FocusWriter | 中 | **极高** | 市场差异化最强，视听沉浸核心 |
| **P0** | 当前行高亮（A5） | Typewriter Mode | 低 | 高 | 几乎零成本，与 Zen/Focus 互补 |
| **P1** | 每日写作目标（C1） | FocusWriter / Ulysses | 低 | 高 | "预期内"功能，成本极低 |
| **P1** | 阅读时间预估（C3） | iA Writer | 极低 | 中 | 一行代码，感知价值高 |
| **P1** | Hemingway 模式（A1） | Typewriter Mode | 低 | 高 | 专注的"终极形态" |
| **P1** | 沉浸纸张主题（A2） | Zen Writer | 低 | 高 | 一键沉浸，降低配置门槛 |
| **P2** | CJK 全角标点转换（B2） | Easy Typing | 中 | 高 | CJK 刚需但实现复杂度较高 |
| **P2** | CJK-Latin 自动间距（B1） | Easy Typing | 高 | 高 | CJK 刚需但 edge cases 极多 |
| **P2** | 写作会话计时器（C2） | novelWriter | 低 | 中 | 可复用已有 WPM 基础设施 |
| **P3** | Rainbow 缩进引导（A6） | VS Code / Zed | 中 | 中 | 视觉优化，非刚需 |
| **P3** | OpenDyslexic 字体（E1） | OpenDyslexic | 低 | 高（特定群体） | 小众但高价值 |
| **P3** | 词性着色（B6） | iA Writer | 高 | 中 | 技术难度高，中文支持差 |
| **P4** | Bionic Reading（E3） | Bionic Reading | 高 | 高 | 市场空白但实现复杂 |
| **P4** | 渐进式全选（B4） | Easy Typing | 低 | 中 | 小的编辑效率提升 |

---

## 三、推荐实施路线

### Phase 1: 视听沉浸核心（1-2 周）
1. **打字机音效** — 最大差异化功能
2. **当前行高亮** — 低成本互补 Zen/Focus
3. **视听联动**（WPM → 音效节奏 + 视觉 dim）— 唯一卖点

### Phase 2: 写作辅助基础设施（1 周）
4. **每日写作目标** + **阅读时间预估** + **会话计时器**
5. **Hemingway 模式**
6. **沉浸纸张主题**（Sepia / Green / Dark Night）

### Phase 3: CJK 排版深化（1-2 周）
7. **CJK 全角标点** + **CJK-Latin 自动间距**

### Phase 4: 辅助功能（按需）
8. **OpenDyslexic 字体**
9. **Rainbow 缩进引导**
10. **Bionic Reading**（探索性）
