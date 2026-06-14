# Typographic Flow — Obsidian 排版增强插件

[![GitHub release](https://img.shields.io/github/v/release/dongningguo0331-prog/obsidian-typographic-flow?style=for-the-badge&sort=semver)](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/releases/latest)
[![Obsidian](https://img.shields.io/badge/Obsidian-%23483699.svg?style=for-the-badge&logo=obsidian&logoColor=white)](https://obsidian.md/)
[![License](https://img.shields.io/github/license/dongningguo0331-prog/obsidian-typographic-flow?style=for-the-badge)](LICENSE)

[English](README.md) | 中文

**Typographic Flow** 将 Obsidian 打造为专业的排版写作环境。它将打字机滚动、专注模式、阅读配色、基线网格和 CJK 排版整合为一个插件——让你的编辑器拥有专业写作软件的质感。

> 如果你希望 Obsidian 用起来更像 iA Writer、Ulysses 或一台打字机——这个插件就是为你准备的。

---

## 目录

- [功能特性](#功能特性)
- [安装](#安装)
- [快速上手](#快速上手)
- [命令列表](#命令列表)
- [设置参考](#设置参考)
- [CSS 类：笔记级自定义](#css-类笔记级自定义)
- [兼容性](#兼容性)
- [常见问题](#常见问题)
- [致谢](#致谢)
- [许可证](#许可证)

---

## 功能特性

### 打字机滚动

输入时光标始终保持在屏幕固定位置——像打字机一样。不再需要追着光标跑到视口底部。

- **居中偏移** — 光标位置可调（0–100%，默认 50% = 屏幕中央）
- **死区** — 编辑相邻行时防止抖动（默认 2 行）
- **滚动暂停** — 手动滚动时暂停自动居中，输入时恢复
- **平滑滚动** — 动画滚动到光标位置
- **智能偏移** — 标题行自动上移、空行自动下移

**工作原理：** 插件使用 CodeMirror 6 ViewPlugin 检测光标移动和文本编辑，通过 CSS 自定义属性读取排版常数计算最佳滚动位置。死区机制防止在相邻行编辑时频繁重新居中。

### 专注模式

两种互补方式减少写作时的视觉干扰：

#### 禅模式（Zen Mode）
将**所有非活动行**调暗到可配置的透明度。活动行保持明亮。支持代码块、引用块和嵌入块。

#### 聚焦模式（Focus Mode）
将**当前语义范围之外的行**调暗。四种模式可选：

| 模式 | 保持明亮的部分 | 适用场景 |
|------|--------------|---------|
| **单行** | 仅当前行 | 精确编辑 |
| **当前段落** | 当前段落 | 散文写作 |
| **当前标题** | 当前章节（到下一个标题） | 结构化文档 |
| **句子** | 当前句子 | 实验性 |

**禅 + 聚焦共存：** 两者同时激活时，插件创建三层视觉渐变：活动行（最亮）→ 聚焦范围（中等）→ 其余（最暗）。

### 光标与动画

微妙的视觉增强，让写作更有生命力。

- **呼吸光标** — 平滑的淡入淡出循环，替代二值闪烁。输入时暂停，停止输入时恢复。
- **删除线动画** — ~~删除线~~文字从左到右动画显示，像用笔划掉文字一样。

两个动画都遵循系统的 `prefers-reduced-motion` 无障碍设置。

### 基线网格

将文本对齐到垂直网格，实现一致的间距——与专业印刷排版相同的原理。

- **网格模数** — 间距基础单位（默认 16px）
- **网格线** — 可选的视觉网格叠加层（可隐藏，布局仍然生效）
- **Y 轴偏移** — 微调垂直对齐
- **线条透明度** — 浅色和深色模式分别控制
- **圆角系数** — 调整代码块和标注框的圆角

**核心优势：** 即使隐藏网格线，确定性布局引擎也能确保整数像素行高，消除滚动操作中的亚像素渲染抖动。

### CJK 段落排版

专业的中文/日文/韩文排版支持：

- **半角标点** — 通过 OpenType `halt` 特性实现
- **行首标点缩进补偿** — 通过 `text-spacing-trim` 实现
- **两端对齐** — CJK 专用 `inter-ideograph` 算法 + `text-align-last: left`
- **首行缩进** — 2em 缩进（仅阅读视图）

**默认行为：** 文本左对齐（非两端对齐）。这是有意为之——在 CM6 Live Preview 中，对独立的 `.cm-line` DIV 使用 `text-align: justify` 会导致「河流效应」。左对齐能产生干净的右边缘，因为 CJK 字符天然等宽。

### 阅读配色

禅意配色方案，提供舒适的阅读体验，基于现代 CSS 构建（`oklch`、`light-dark()`、`color-mix`）。

- **强调色色相** — 偏移强调色（暖 ↔ 冷，±30°）
- **强调色饱和度** — 控制颜色强度
- **背景暖度** — 调整背景色调（奶油色 ↔ 灰色）
- **文字对比度** — 微调文字深浅

**技术说明：** 使用 `oklch()` 色彩空间实现感知均匀的调整。`light-dark()` 函数自动适应 Obsidian 的浅色/深色主题。GRAD 字体变化设置补偿浅色和深色背景之间的光学粗细变化。

---

## 安装

### 从 Obsidian 安装（推荐）

1. 打开 Obsidian 设置 → 第三方插件
2. 点击**浏览**，搜索 "Typographic Flow"
3. 点击**安装**，然后**启用**

### 手动安装

1. 从 [GitHub Releases](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/releases) 下载最新版本
2. 将插件文件夹解压到你的 vault 插件目录：
   ```
   <your-vault>/.obsidian/plugins/obsidian-typographic-flow/
   ```
3. 重新加载 Obsidian（Ctrl/Cmd+P → "Reload app without saving"）
4. 在设置 → 第三方插件中启用插件

### 使用 BRAT 安装测试版

1. 安装 [BRAT 插件](https://obsidian.md/plugins?id=obsidian42-brat)
2. 打开 BRAT 设置 → 添加测试版插件
3. 输入：`https://github.com/dongningguo0331-prog/obsidian-typographic-flow`
4. 在第三方插件中启用插件

---

## 快速上手

安装后插件使用默认设置即可工作。推荐配置：

1. **启用打字机滚动** — 核心功能，光标始终保持居中
2. **启用基线网格** — 将文本对齐到垂直网格，间距一致
3. **尝试聚焦模式** — 使用命令「Cycle Focus Mode」查看不同聚焦级别
4. **调整阅读配色** — 如果默认颜色太生硬，启用阅读配色并调整暖度滑块

所有功能都可通过命令面板（Ctrl/Cmd+P）切换。输入 "Typographic Flow" 查看所有可用命令。

---

## 命令列表

所有功能都可通过命令面板（Ctrl/Cmd+P）切换：

| 命令 | 说明 | 默认 |
|------|------|------|
| Toggle Typewriter Scrolling | 开关打字机滚动 | 开 |
| Toggle Zen Mode | 开关禅模式 | 关 |
| Cycle Focus Mode | 循环切换聚焦模式（关 → 行 → 段落 → 标题 → 句子） | — |
| Turn Off Focus Mode | 关闭聚焦模式 | — |
| Toggle Reading Colors | 开关阅读配色 | 关 |
| Toggle Baseline Grid | 开关基线网格 | 开 |
| Toggle Baseline Grid Lines | 显示/隐藏网格线 | 开 |
| Toggle CJK Prose | 开关 CJK 排版 | 关 |
| Toggle CJK First-line Indent | 开关首行缩进 | 关 |
| Toggle CJK Justification | 开关两端对齐 | 关 |
| Toggle Breathing Cursor | 开关呼吸光标 | 关 |
| Toggle Strikethrough Animation | 开关删除线动画 | 关 |

每次切换都会显示通知（ON/OFF 提示）。状态栏显示活跃模式缩写（如 `⚙ TW·Z·FL·C·G·CJK`）。

---

## 设置参考

访问路径：设置 → 第三方插件 → Typographic Flow → ⚙️

### 打字机滚动

| 设置 | 类型 | 范围 | 默认值 | 说明 |
|------|------|------|--------|------|
| Toggle Typewriter Scrolling | 开关 | — | 开 | 打字机滚动主开关 |
| Center offset / 居中偏移 | 滑块 | 0–100% | 50% | 光标位置占屏幕高度的百分比 |
| Dead Zone / 死区 | 滑块 | 0–10 | 2 | 移动多少行后重新居中 |
| Scroll Suspension / 滚动暂停 | 开关 | — | 开 | 手动滚动时暂停，输入时恢复 |
| Smooth Scroll / 平滑滚动 | 开关 | — | 开 | 动画滚动到光标位置 |
| Smart Offset / 智能偏移 | 开关 | — | 开 | 标题和空行自动调整位置 |

### 专注模式

| 设置 | 类型 | 范围 | 默认值 | 说明 |
|------|------|------|--------|------|
| Zen Mode / 禅模式 | 开关 | — | 关 | 调暗非活动行 |
| Zen Opacity / 禅模式透明度 | 滑块 | 0–100% | 25% | 调暗行的亮度 |
| Focus Mode / 聚焦模式 | 下拉 | off/line/paragraph/heading/sentence | off | 语义聚焦模式 |

### 光标与动画

| 设置 | 类型 | 范围 | 默认值 | 说明 |
|------|------|------|--------|------|
| Breathing Cursor / 呼吸光标 | 开关 | — | 关 | 光标平滑淡入淡出循环 |
| Breath Duration / 呼吸周期 | 滑块 | 2–8s | 4s | 一个呼吸周期的速度 |
| Minimum Opacity / 最低透明度 | 滑块 | 0.1–0.8 | 0.4 | 循环中的最低亮度 |
| Strikethrough Animation / 删除线动画 | 开关 | — | 关 | ~~删除线~~文字动画 |
| Reveal Duration / 动画时长 | 滑块 | 0.1–0.8s | 0.35s | 删除线动画速度 |

### 排版

| 设置 | 类型 | 范围 | 默认值 | 说明 |
|------|------|------|--------|------|
| Baseline Grid / 基线网格 | 开关 | — | 开 | 文本对齐到垂直网格 |
| Show Grid Lines / 显示网格线 | 开关 | — | 开 | 视觉网格叠加层 |
| Grid Unit / 网格模数 | 滑块 | 10–20px | 16px | 网格间距基础单位 |
| Y-axis Offset / Y轴偏移 | 滑块 | 20–40px | 35px | 网格线垂直偏移 |
| Grid Line Opacity (Light) / 浅色模式透明度 | 滑块 | 0–0.15 | 0.045 | 浅色模式网格亮度 |
| Grid Line Opacity (Dark) / 深色模式透明度 | 滑块 | 0–0.15 | 0.04 | 深色模式网格亮度 |
| Corner Radius Coefficient / 圆角系数 | 滑块 | 0–1 | 0.285 | 圆角大小 |
| CJK Prose / 中文排版 | 开关 | — | 关 | CJK 排版 |
| Justify Text / 两端对齐 | 开关 | — | 关 | CJK 两端对齐 |
| First-line Indent / 首行缩进 | 开关 | — | 关 | 2em 缩进（仅阅读视图） |

### 配色

| 设置 | 类型 | 范围 | 默认值 | 说明 |
|------|------|------|--------|------|
| Reading Colors / 阅读配色 | 开关 | — | 关 | 启用配色方案 |
| Accent Hue Shift / 强调色色相 | 滑块 | -30 到 +30 | 0 | 偏移强调色 |
| Accent Saturation / 强调色饱和度 | 滑块 | -30 到 +30 | 0 | 控制颜色强度 |
| Background Warmth / 背景暖度 | 滑块 | -10 到 +10 | 0 | 背景色调 |
| Text Contrast / 文字对比度 | 滑块 | -15 到 +15 | 0 | 文字深浅 |

---

## CSS 类：笔记级自定义

在笔记的 `cssclasses` frontmatter 中添加这些类来定制单个笔记的外观：

```yaml
---
cssclasses:
  - wide-reading
  - compact
  - eye-care
  - no-grid
  - study-note
  - english-reading
---
```

| 类名 | 效果 |
|------|------|
| `wide-reading` | 最大宽度 900px，两侧 2rem 内边距 |
| `compact` | 更小的网格模数（12px） |
| `eye-care` | 暖色背景，降低对比度 |
| `no-grid` | 隐藏此笔记的网格线 |
| `study-note` | 左侧强调色边框 + 稍大网格 |
| `english-reading` | 无衬线字体，针对英文阅读优化 |

### 自定义 CSS 变量

你可以在 CSS snippet 中覆盖这些变量来自定义插件：

```css
/* 示例：让网格线更明显 */
body.plugin-tf-grid {
  --grid-line-opacity-light: 0.08;
  --grid-line-opacity-dark: 0.06;
}

/* 示例：调整聚焦模式的透明度 */
:root {
  --focus-opacity: 0.4;
}
```

可用变量：
- `--tf-lh-normal` — 普通行高（默认 24px）
- `--tf-lh-heading` — 标题行高（默认 32px）
- `--tf-grid-unit` — 网格模数（默认 16px）
- `--zen-opacity` — 禅模式透明度（默认 0.25）
- `--focus-opacity` — 聚焦模式透明度（默认 0.5）
- `--tf-breathe-duration` — 呼吸光标周期（默认 4s）
- `--tf-breathe-min-opacity` — 呼吸光标最低透明度（默认 0.4）
- `--tf-strike-duration` — 删除线动画时长（默认 0.35s）

---

## 兼容性

- **Obsidian**: v1.4.0+
- **平台**: 桌面端和移动端
- **主题**: 与任何主题兼容。阅读配色模块会覆盖 Obsidian 内置 CSS 变量，如果你使用自定义主题的配色方案，请禁用阅读配色。
- **其他插件**: 与大多数插件兼容。可能与其他打字机滚动或专注模式插件冲突——启用 Typographic Flow 前请禁用这些插件。

### 已知限制

- **首行缩进**仅在阅读视图中生效（CM6 Live Preview 将段落渲染为逐行 DIV，无法使用 `text-indent`）
- **句子聚焦模式**在支持的环境中使用 `Intl.Segmenter`，旧环境中回退到正则表达式
- **呼吸光标**通过键盘事件在输入时暂停；在移动端使用 `input` 事件作为兜底

---

## 常见问题

**Q: 我使用了自定义主题，颜色看起来不对。**
A: 禁用阅读配色模块。它会覆盖 Obsidian 内置的 CSS 变量，可能与你主题的配色方案冲突。

**Q: 网格线太明显/太淡了。**
A: 在设置中调整「网格线透明度」，或对特定笔记使用 `no-grid` cssclass。

**Q: 可以和 Minimal 主题一起用吗？**
A: 可以。如果你希望 Minimal 的配色方案生效，请禁用阅读配色。打字机滚动、专注模式和网格与主题无关。

**Q: 支持移动端吗？**
A: 支持。所有功能在移动端都可以使用。呼吸光标的「输入时暂停」功能使用 `input` 事件作为软键盘的兜底方案。

**Q: 如何恢复所有默认设置？**
A: 打开插件设置，点击顶部的「Reset to defaults」按钮。

---

## 致谢

这个插件受到以下优秀插件的启发和影响：

- [Typewriter Mode](https://github.com/davisriedel/obsidian-typewriter-mode) by Davis Riedel — 原始打字机滚动插件
- [Typewriter Scroll](https://github.com/deathau/cm-typewriter-scroll-obsidian) by deathau — Obsidian 打字机滚动的基础
- [Focus Active Sentence](https://github.com/artisticat1/focus-active-sentence) by artisticat1 — 句子级聚焦模式
- [Obsidian Focus Mode](https://github.com/ryanpcmcquen/obsidian-focus-mode) by ryanpcmcquen — 写作专注模式

感谢这些优秀插件的开发者。

---

## 许可证

本插件基于 [MIT 许可证](LICENSE) 开源。

---

## 支持

如果你觉得这个插件有用，可以：

- ⭐ 给 [仓库](https://github.com/dongningguo0331-prog/obsidian-typographic-flow) 点 Star
- 🐛 通过 [GitHub Issues](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/issues) 报告 Bug
- 💡 通过 [GitHub Discussions](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/discussions) 提建议
