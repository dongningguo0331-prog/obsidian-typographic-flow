# Typographic Flow — 全屏写作模式技术方案

> 基于 Typewriter Mode 插件逆向分析 + Obsidian CSS 结构研究

---

## 一、竞品分析：Typewriter Mode 的 Writing Focus

### 实现方式

Typewriter Mode 的 Writing Focus 模式通过以下方式实现：

1. **Body class 切换**：添加 `ptm-focus-mode` 到 `document.body`
2. **Split 隐藏**：查询所有 `.workspace-split`，隐藏非活跃的 split
3. **UI 元素隐藏**：通过 CSS 隐藏 header、status bar 等
4. **Vignette 效果**：添加暗角遮罩元素

### 配置选项

```json
{
  "doesWritingFocusShowHeader": false,      // 是否显示标题栏
  "doesWritingFocusShowVignette": true,     // 是否显示暗角效果
  "doesWritingFocusShowStatusBar": false,   // 是否显示状态栏
  "isWritingFocusFullscreen": true,         // 是否全屏
  "writingFocusVignetteStyle": "box",       // 暗角样式
  "writingFocusFontSize": 0                 // 字体大小调整
}
```

### CSS 类名

```
ptm-focus-mode                    — body class，激活写作焦点
ptm-writing-focus-shows-header    — 显示标题栏
ptm-writing-focus-shows-status-bar — 显示状态栏
ptm-writing-focus-vignette-element — 暗角元素
ptm-writing-focus-vignette-style   — 暗角样式
ptm-wf-split-hidden               — 隐藏的 split
ptm-maximized                     — 最大化状态
```

---

## 二、Obsidian UI 结构分析

### 需要隐藏的 UI 元素

| 元素 | CSS 选择器 | 说明 |
|------|-----------|------|
| 左侧边栏 | `.sidebar.mod-left` | 文件树、搜索等 |
| 右侧边栏 | `.sidebar.mod-right` | 反向链接、大纲等 |
| 标签栏 | `.workspace-tab-header-container` | 编辑器标签 |
| 标题栏 | `.titlebar` | 窗口标题栏（桌面端） |
| 状态栏 | `.status-bar` | 底部状态信息 |
| 左侧功能区 | `.ribbon` | 左侧快捷按钮 |
| 非活跃编辑器 | `.workspace-split:not(.mod-active)` | 分屏中的其他编辑器 |

### 保留的元素

| 元素 | 说明 |
|------|------|
| `.workspace-leaf.mod-active` | 当前活跃的编辑器 |
| `.cm-editor` | CodeMirror 编辑器 |
| `.markdown-source-view` | 编辑视图 |
| `.markdown-rendered` | 阅读视图 |

---

## 三、技术方案

### 3.1 架构设计

```
TypographicFlowPlugin
├── FullscreenManager (新增)
│   ├── enable()          — 进入全屏
│   ├── disable()         — 退出全屏
│   ├── toggle()          — 切换
│   ├── isActive: boolean — 当前状态
│   └── _savedState       — 保存的布局状态
└── Settings
    ├── fullscreenEnabled: boolean
    ├── fullscreenShowHeader: boolean
    ├── fullscreenShowStatusBar: boolean
    └── fullscreenShowVignette: boolean
```

### 3.2 实现细节

#### FullscreenManager 类

```typescript
// src/engine/fullscreen.ts

const FULLSCREEN_CLASS = 'plugin-tf-fullscreen';
const VIGNETTE_CLASS = 'tf-fullscreen-vignette';

interface SavedLayoutState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  activeLeafId: string | null;
}

export class FullscreenManager {
  private isActive = false;
  private vignetteEl: HTMLElement | null = null;
  private savedState: SavedLayoutState | null = null;

  constructor(private app: App) {}

  enable(): void {
    if (this.isActive) return;
    this.isActive = true;

    // 1. 保存当前布局状态
    this.savedState = this.captureLayoutState();

    // 2. 隐藏侧边栏
    this.app.workspace.leftSplit.collapse();
    this.app.workspace.rightSplit.collapse();

    // 3. 添加 body class
    document.body.classList.add(FULLSCREEN_CLASS);

    // 4. 创建暗角效果（可选）
    this.createVignette();

    // 5. 保存设置
    // (由调用方处理)
  }

  disable(): void {
    if (!this.isActive) return;
    this.isActive = false;

    // 1. 移除 body class
    document.body.classList.remove(FULLSCREEN_CLASS);

    // 2. 移除暗角效果
    this.removeVignette();

    // 3. 恢复布局状态
    if (this.savedState) {
      this.restoreLayoutState(this.savedState);
      this.savedState = null;
    }
  }

  toggle(): void {
    this.isActive ? this.disable() : this.enable();
  }

  private captureLayoutState(): SavedLayoutState {
    return {
      leftSidebarOpen: !this.app.workspace.leftSplit.collapsed,
      rightSidebarOpen: !this.app.workspace.rightSplit.collapsed,
      activeLeafId: this.app.workspace.activeLeaf?.id ?? null,
    };
  }

  private restoreLayoutState(state: SavedLayoutState): void {
    if (state.leftSidebarOpen) {
      this.app.workspace.leftSplit.expand();
    }
    if (state.rightSidebarOpen) {
      this.app.workspace.rightSplit.expand();
    }
  }

  private createVignette(): void {
    this.vignetteEl = document.createElement('div');
    this.vignetteEl.className = VIGNETTE_CLASS;
    document.body.appendChild(this.vignetteEl);
  }

  private removeVignette(): void {
    if (this.vignetteEl) {
      this.vignetteEl.remove();
      this.vignetteEl = null;
    }
  }

  destroy(): void {
    this.disable();
  }
}
```

#### CSS 样式

```css
/* styles.css — 全屏写作模式 */

/* 隐藏所有 UI 元素 */
body.plugin-tf-fullscreen .sidebar,
body.plugin-tf-fullscreen .workspace-tab-header-container,
body.plugin-tf-fullscreen .ribbon {
  display: none !important;
}

/* 隐藏标题栏（可选） */
body.plugin-tf-fullscreen:not(.tf-fullscreen-show-header) .titlebar {
  display: none !important;
}

/* 隐藏状态栏（可选） */
body.plugin-tf-fullscreen:not(.tf-fullscreen-show-status-bar) .status-bar {
  display: none !important;
}

/* 隐藏非活跃 split */
body.plugin-tf-fullscreen .workspace-split:not(:has(.mod-active)) {
  display: none !important;
}

/* 编辑器全屏填充 */
body.plugin-tf-fullscreen .workspace.mod-root {
  padding: 0;
}

/* 暗角效果 */
.tf-fullscreen-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(0, 0, 0, 0.15) 100%
  );
}

/* 暗角样式变体 */
body.plugin-tf-fullscreen .tf-fullscreen-vignette.style-box {
  background: none;
  box-shadow: inset 0 0 150px rgba(0, 0, 0, 0.2);
}

body.plugin-tf-fullscreen .tf-fullscreen-vignette.style-none {
  display: none;
}
```

### 3.3 设置集成

```typescript
// 在 PluginSettings 接口中添加：
export interface PluginSettings {
  // ... 现有设置 ...

  // Fullscreen
  fullscreenEnabled: boolean;
  fullscreenShowHeader: boolean;
  fullscreenShowStatusBar: boolean;
  fullscreenShowVignette: boolean;
  fullscreenVignetteStyle: 'radial' | 'box' | 'none';
}

// 默认值：
const DEFAULT_SETTINGS: PluginSettings = {
  // ... 现有默认值 ...

  // Fullscreen
  fullscreenEnabled: false,
  fullscreenShowHeader: false,
  fullscreenShowStatusBar: false,
  fullscreenShowVignette: true,
  fullscreenVignetteStyle: 'radial',
};
```

### 3.4 命令注册

```typescript
// 在 addCommands() 中添加：
this.addCommand({
  id: 'toggle-fullscreen-mode',
  name: 'Toggle Fullscreen Writing Mode',
  callback: () => this.toggleFullscreen(),
});

this.addCommand({
  id: 'toggle-fullscreen-header',
  name: 'Toggle Fullscreen Header',
  callback: () => this.toggleFullscreenHeader(),
});

this.addCommand({
  id: 'toggle-fullscreen-status-bar',
  name: 'Toggle Fullscreen Status Bar',
  callback: () => this.toggleFullscreenStatusBar(),
});
```

### 3.5 设置面板

```typescript
// 在 TypographicFlowSettingTab._table 中添加：
{
  section: 'Fullscreen / 全屏模式',
  name: 'Enable Fullscreen Mode',
  desc: 'Hide all UI elements for distraction-free writing',
  key: 'fullscreenEnabled',
  type: 'toggle',
  method: 'toggleFullscreen',
},
{
  section: 'Fullscreen / 全屏模式',
  name: 'Show Header',
  desc: 'Show title bar in fullscreen mode',
  key: 'fullscreenShowHeader',
  type: 'toggle',
  method: 'toggleFullscreenHeader',
},
{
  section: 'Fullscreen / 全屏模式',
  name: 'Show Status Bar',
  desc: 'Show status bar in fullscreen mode',
  key: 'fullscreenShowStatusBar',
  type: 'toggle',
  method: 'toggleFullscreenStatusBar',
},
{
  section: 'Fullscreen / 全屏模式',
  name: 'Vignette Style',
  desc: 'Dark edges effect in fullscreen mode',
  key: 'fullscreenVignetteStyle',
  type: 'dropdown',
  options: {
    radial: 'Radial (default)',
    box: 'Box shadow',
    none: 'None',
  },
  method: 'changeFullscreenVignetteStyle',
},
```

---

## 四、关键差异：Typographic Flow vs Typewriter Mode

| 特性 | Typewriter Mode | Typographic Flow（规划） |
|------|:-:|:-:|
| 隐藏侧边栏 | ✅ | ✅ |
| 隐藏标签栏 | ✅ | ✅ |
| 隐藏标题栏 | ✅（可选） | ✅（可选） |
| 隐藏状态栏 | ✅（可选） | ✅（可选） |
| 暗角效果 | ✅ | ✅ |
| 暗角样式 | 2 种 | 3 种（radial/box/none） |
| 与网格/配色集成 | ❌ | ✅ |
| 与 Zen/Focus 协同 | ❌ | ✅ |
| 布局状态恢复 | ✅ | ✅ |

### 核心优势

1. **与现有模块协同**：全屏模式 + Zen Mode + Focus Mode + 基线网格 + 阅读配色 = 完整的沉浸式写作体验
2. **暗角样式更丰富**：支持 radial、box、none 三种样式
3. **设置更精细**：可以独立控制 header、status bar、vignette 的显示

---

## 五、实现步骤

### Step 1: 创建 FullscreenManager
- 文件：`src/engine/fullscreen.ts`
- 实现：enable/disable/toggle/captureLayoutState/restoreLayoutState
- 工作量：2 小时

### Step 2: 添加 CSS 样式
- 文件：`styles.css`
- 实现：隐藏 UI 元素、暗角效果、响应式适配
- 工作量：1 小时

### Step 3: 集成到 PluginSettings
- 文件：`src/main.ts`
- 实现：添加设置字段、默认值、toggle 方法
- 工作量：1 小时

### Step 4: 注册命令
- 文件：`src/main.ts`
- 实现：toggle-fullscreen-mode、toggle-fullscreen-header、toggle-fullscreen-status-bar
- 工作量：30 分钟

### Step 5: 添加设置面板
- 文件：`src/main.ts`
- 实现：Fullscreen section in settings table
- 工作量：30 分钟

### Step 6: 测试
- 测试全屏进入/退出
- 测试侧边栏恢复
- 测试与 Zen/Focus/Grid/Colors 的协同
- 测试移动端兼容性
- 工作量：1 小时

**总计**：约 6 小时（1 天）

---

## 六、风险与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 侧边栏恢复失败 | 低 | 高 | 保存完整布局状态，提供手动恢复命令 |
| 与其他插件冲突 | 中 | 中 | 使用独特的 CSS 类名前缀（`plugin-tf-`） |
| 移动端不支持 | 中 | 低 | 移动端隐藏 header/status bar 设置，保留侧边栏隐藏 |
| Obsidian API 变更 | 低 | 高 | 使用稳定的 workspace API，避免内部实现细节 |

---

## 七、Obsidian CSS 选择器参考

```css
/* 侧边栏 */
.sidebar.mod-left { }
.sidebar.mod-right { }

/* 标签栏 */
.workspace-tab-header-container { }

/* 标题栏（桌面端） */
.titlebar { }

/* 状态栏 */
.status-bar { }

/* 左侧功能区 */
.ribbon { }

/* 工作区根容器 */
.workspace.mod-root { }

/* 活跃编辑器 */
.workspace-leaf.mod-active { }

/* 所有 split */
.workspace-split { }

/* 非活跃 split */
.workspace-split:not(:has(.mod-active)) { }

/* 编辑器内容区 */
.cm-editor { }
.markdown-source-view { }
.markdown-rendered { }
```
