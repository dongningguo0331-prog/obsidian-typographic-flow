# Typographic Flow — Obsidian 排版增强插件

[![GitHub](https://img.shields.io/badge/GitHub-%2330363E.svg?style=for-the-badge&logo=github&logoColor=white)](https://github.com/dongningguo0331-prog/obsidian-typographic-flow)
[![Obsidian](https://img.shields.io/badge/Obsidian-%23483699.svg?style=for-the-badge&logo=obsidian&logoColor=white)](https://obsidian.md/)
[![Release](https://img.shields.io/github/v/release/dongningguo0331-prog/obsidian-typographic-flow?style=for-the-badge)](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/releases)

> 为 [Obsidian](https://obsidian.md) 打造的统一排版体验。将打字机滚动、专注模式、阅读配色、基线网格和中文排版整合为一体。

[English](01-Project/50-obsidian乐高计划/obsidian-typographic-flow/README.md) | 中文

---

## 功能特性

### 打字机滚动

让光标始终保持在屏幕固定位置——像打字机一样。

- **居中偏移** — 自定义光标位置（默认：50% = 屏幕中央）
- **死区** — 编辑相邻行时防止抖动
- **滚动暂停** — 手动滚动时暂停自动居中，打字时恢复
- **平滑滚动** — 动画滚动到光标位置
- **智能偏移** — 针对标题和空行自动调整位置

### 专注模式

减少写作时的视觉干扰。

- **禅模式** — 淡化非活动行，专注于当前输入
- **聚焦模式** — 淡化当前范围之外的行：
  - **单行** — 仅当前行高亮
  - **当前段落** — 仅当前段落高亮
  - **当前标题** — 仅当前章节高亮
  - **句子** — 仅当前句子高亮（实验性）

### 光标与动画

细腻的视觉增强。

- **呼吸光标** — 平滑的淡入淡出循环，替代二元闪烁
- **删除线动画** — ~~删除线~~ 从左到右动态绘制

### 排版

专业级布局控制。

- **基线网格** — 将文本对齐到垂直网格，确保一致的间距
- **中文排版** — CJK 排版增强：
  - 半角标点（OpenType）
  - 行首标点缩进补偿
  - 两端对齐（CJK 算法）
  - 首行缩进（阅读视图）

### 阅读配色

禅意配色方案，舒适阅读。

- **强调色色相** — 偏移强调色（暖色 ↔ 冷色）
- **强调色饱和度** — 控制颜色强度
- **背景暖度** — 调整背景色调（奶油色 ↔ 灰色）
- **文字对比度** — 微调文字深浅/亮度

---

## 安装

### 从 Obsidian 安装（推荐）

1. 打开 Obsidian 设置 → 第三方插件
2. 点击 **浏览**，搜索 "Typographic Flow"
3. 点击 **安装**，然后 **启用**

### 手动安装

1. 从 [GitHub Releases](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/releases) 下载最新版本
2. 解压插件文件夹到你的 vault 插件目录：
   ```
   <你的vault>/.obsidian/plugins/obsidian-typographic-flow/
   ```
3. 重新加载 Obsidian（Ctrl/Cmd+P → "Reload app without saving"）
4. 在设置 → 第三方插件中启用插件

---

## 命令

所有功能都可以通过命令面板（Ctrl/Cmd+P）切换：

| 命令 | 说明 |
|------|------|
| Toggle Typewriter Scrolling | 开关打字机滚动 |
| Toggle Zen Mode | 开关禅模式 |
| Cycle Focus Mode | 循环切换聚焦模式（关 → 行 → 段落 → 标题 → 句子） |
| Turn Off Focus Mode | 关闭聚焦模式 |
| Toggle Reading Colors | 开关阅读配色 |
| Toggle Baseline Grid | 开关基线网格 |
| Toggle CJK Prose | 开关中文排版 |
| Toggle CJK First-line Indent | 开关首行缩进 |
| Toggle CJK Justification | 开关两端对齐 |
| Toggle Breathing Cursor | 开关呼吸光标 |
| Toggle Strikethrough Animation | 开关删除线动画 |

---

## 设置

插件设置分为 5 个部分：

1. **打字机滚动** — 核心滚动行为
2. **专注模式** — 聚焦模式和禅模式透明度
3. **光标与动画** — 呼吸光标和删除线动画
4. **排版** — 基线网格和中文排版
5. **配色** — 阅读配色方案

访问路径：设置 → 第三方插件 → Typographic Flow → ⚙️

---

## 技术架构

```
obsidian-typographic-flow/
├── main.js          # 插件代码（esbuild 输出）
├── styles.css       # 所有 CSS 模块
├── manifest.json    # 插件元数据
└── README.md        # 说明文档
```

技术栈：
- **CodeMirror 6** ViewPlugin 实现打字机滚动和聚焦模式
- **Facets** 运行时配置
- **Compartments** 动态扩展重配置
- **CSS 自定义属性** 排版常量桥接（JS ↔ CSS）

---

## 致谢

本插件的灵感来源于以下优秀的插件：

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

- ⭐ 给仓库点个 Star
- 🐛 通过 [GitHub Issues](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/issues) 报告问题
- 💡 通过 [GitHub Discussions](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/discussions) 提出建议

---

**享受写作！** ✍️
