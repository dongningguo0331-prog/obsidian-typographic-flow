# Typographic Flow — 项目计划书

> 最后更新：2026-06-15
> 版本：v1.2.0
> 状态：已上架社区插件（审核中）

---

## 一、产品定位

**一句话**：Obsidian 的排版引擎——让编辑器拥有专业写作软件的质感。

**核心差异化**：
- 唯一提供基线网格的 Obsidian 插件
- 唯一支持 CJK 排版的 Obsidian 插件
- 一个插件替代 4 个（滚动 + 专注 + 网格 + 配色）

**目标用户**：
1. 中文/日文/韩文 Obsidian 用户（1000万+，零竞品）
2. 追求排版美感的写作者（对标 iA Writer 用户）
3. 学术写作用户（论文、书籍排版）

---

## 二、功能路线图

### Phase 1：核心功能补全（优先）

#### 1.1 全屏写作模式
- 隐藏 Obsidian 所有 UI 元素（侧边栏、标题栏、状态栏、标签栏）
- 只保留编辑区 + 极简工具栏
- 快捷键切换（F11 或自定义）
- 退出时恢复之前的布局状态

**技术方案**：
- 添加 `body.plugin-tf-fullscreen` 类
- CSS 隐藏 `.workspace-leaf-header`、`.status-bar`、`.titlebar`、`.ribbon`、`.sidebar`
- 用 `this.app.workspace.iterateAllLeaves()` 记录当前布局，退出时恢复
- 注册 Obsidian 命令 `toggle-fullscreen-mode`

**对标**：iA Writer 的全屏模式、Typewriter Mode 的 Fullscreen Focus

**工作量**：2-3 天

#### 1.2 光标位置恢复
- 重新打开文件时，恢复上次的光标位置和滚动位置
- 每个文件独立存储位置信息
- 设置中可开关

**技术方案**：
- 监听 `active-leaf-change` 事件
- 用 `this.loadData()` / `this.saveData()` 存储 `{ [filePath]: { cursor, scrollTop } }`
- 在文件打开时调用 `editor.setCursor()` 和 `editor.scrollTo()`
- 设置项：`restoreCursorPosition: boolean`

**对标**：Typewriter Mode 的 Restore Cursor Position、Obsidian 内置的 `scrollPosition`

**工作量**：1-2 天

### Phase 2：传播与品牌建设

#### 2.1 视觉品牌建设

**GIF 动图演示**（6 个）：
| # | 功能 | 录制内容 | 时长 |
|---|------|---------|------|
| 1 | 打字机滚动 | 连续输入，光标始终居中 | 5-8 秒 |
| 2 | Focus Mode | 循环切换 off→line→paragraph→heading | 8-10 秒 |
| 3 | 基线网格 | 开关网格线，展示对齐效果 | 5 秒 |
| 4 | CJK 排版 | 中文文本，开关半角标点/两端对齐 | 5 秒 |
| 5 | 阅读配色 | 滑动暖度/色相滑块 | 5 秒 |
| 6 | 全屏模式 | 进入/退出全屏 | 5 秒 |

**录制工具**：ScreenToGif（Windows，免费）
**输出格式**：GIF，800×500px，15fps，< 2MB
**存放位置**：`assets/demo-*.gif`

**Before/After 对比图**：
- 默认 Obsidian vs Typographic Flow 开启后
- 浅色主题 + 深色主题各一组

#### 2.2 平台传播策略

**中文社区（优先）**：

| 平台 | 内容形式 | 标题方向 | 发布时间 |
|------|---------|---------|---------|
| 少数派 | 深度教程 | 《让 Obsidian 拥有专业排版质感》 | 社区插件审核通过后 |
| V2EX | 分享帖 | 《我做了一个 Obsidian 排版引擎插件》 | 社区插件审核通过后 |
| 知乎 | 回答 + 文章 | 回答"Obsidian 有哪些好用的插件"相关问题 | 持续 |
| B 站 | 视频教程 | 《Obsidian 排版神器：Typographic Flow 完整教程》 | 有时间时 |
| 微信公众号 | 推文 | 《中文排版终于被 Obsidian 插件解决了》 | 社区插件审核通过后 |
| 小红书 | 图文 | Before/After 对比 + 安装教程 | 持续 |

**英文社区**：

| 平台 | 内容形式 | 标题方向 | 发布时间 |
|------|---------|---------|---------|
| Obsidian Forum | Showcase 帖 | `[Release] Typographic Flow — Unified Typography Engine` | 社区插件审核通过后 |
| Reddit r/ObsidianMD | 分享帖 | 专注 CJK 排版卖点 | 社区插件审核通过后 |
| Discord #updates | 公告 | 简短功能介绍 + GIF | 社区插件审核通过后 |
| Hacker News | Show HN | 强调技术深度（基线网格、现代 CSS） | 有时间时 |

**传播内容核心卖点**：
1. **CJK 排版** — "唯一支持中文排版的 Obsidian 插件"（蓝海市场）
2. **基线网格** — "专业印刷级排版"（技术壁垒）
3. **一个插件替代 4 个** — "不用再装 Typewriter Mode + Focus Mode + ..."（便利性）

#### 2.3 社区插件审核跟进

**当前状态**：PR 已提交到 obsidianmd/obsidian-releases

**审核周期**：通常 1-2 周

**审核可能的反馈**：
- 要求修改 `isDesktopOnly` 设置
- 要求补充 `fundingUrl`
- 要求修改描述文字长度
- 要求测试特定 Obsidian 版本

**准备**：
- 监控 PR 评论
- 快速响应修改请求
- 准备测试报告（Obsidian 1.4.0+ 兼容性）

---

## 三、技术债务与维护

### 已知技术债务

| 项目 | 优先级 | 说明 |
|------|--------|------|
| Pop-out 窗口支持 | 中 | CSS 变量只在主窗口生效，需改用 `<style>` 标签注入 |
| 单元测试 | 低 | 纯函数（computeEffectiveOffset、getParagraphBounds 等）适合单测 |
| CSS `!important` 精简 | 低 | 约 60 处，可通过提高选择器特异性减少 30% |

### 维护节奏

| 频率 | 动作 |
|------|------|
| 每周 | 检查 GitHub Issues，响应用户反馈 |
| 每月 | 检查 Obsidian 更新，确认兼容性 |
| 每季度 | 评估新 CSS 特性，考虑迁移到原生实现 |

### W3C CSS 规范跟踪

当浏览器实现以下规范时，考虑迁移：

| 规范 | 状态 | 迁移价值 |
|------|------|---------|
| `line-height-step` (css-rhythm-1) | Working Draft | 高 — 替代手动 line-height |
| `line-snap` (css-line-grid-1) | Working Draft | 高 — 替代手动对齐 |
| `block-step-size` (css-rhythm-1) | Working Draft | 中 — 替代手动 margin |
| `box-snap` (css-line-grid-1) | Working Draft | 中 — 块级元素自动对齐 |

**迁移策略**：用 `@supports` 守卫渐进增强，保持向后兼容。

---

## 四、里程碑

| 里程碑 | 目标 | 预计时间 |
|--------|------|---------|
| **M1: 社区插件上架** | PR 合并，插件出现在 Obsidian 社区插件浏览器 | 2026-06 月底 |
| **M2: 全屏模式 + 光标恢复** | 发布 v1.3.0 | 2026-07 月中 |
| **M3: 中文社区传播** | 少数派 + V2EX + 知乎发布 | 2026-07 月底 |
| **M4: 英文社区传播** | Obsidian Forum + Reddit 发布 | 2026-08 月中 |
| **M5: 100 Stars** | GitHub 100 Stars | 2026-09 月底 |

---

## 五、风险与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 社区插件审核被拒 | 中 | 高 | 按反馈快速修改，准备多次迭代 |
| Obsidian API 重大变更 | 低 | 高 | 关注 Obsidian 开发者文档，提前适配 |
| 竞品复制 CJK 功能 | 低 | 中 | 保持技术深度领先，建立用户粘性 |
| 用户增长缓慢 | 中 | 中 | 持续在中文社区推广，强调差异化 |
| CSS 规范变更导致兼容问题 | 低 | 低 | `@supports` 守卫 + 渐进增强 |

---

## 六、成功指标

| 指标 | 3 个月目标 | 6 个月目标 | 12 个月目标 |
|------|-----------|-----------|------------|
| GitHub Stars | 50 | 150 | 500 |
| 社区插件下载量 | 200 | 1000 | 5000 |
| GitHub Issues | 5 | 15 | 30 |
| 中文社区帖子 | 3 | 8 | 15 |
| 英文社区帖子 | 2 | 5 | 10 |
