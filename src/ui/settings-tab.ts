import {Notice, PluginSettingTab, Setting} from 'obsidian';
import type {App} from 'obsidian';
import type TypographicFlowPlugin from '../main';

interface SettingRowBase {
  section: string;
  name: string;
  desc: string;
  key: string;
  method: string;
}

interface ToggleRow extends SettingRowBase {
  type: 'toggle';
}

interface SliderRow extends SettingRowBase {
  type: 'slider';
  min: number;
  max: number;
  step: number;
  toSlider?: (v: number) => number;
  fromSlider?: (v: number) => number;
}

interface DropdownRow extends SettingRowBase {
  type: 'dropdown';
  options: Record<string, string>;
}

type SettingRow = ToggleRow | SliderRow | DropdownRow;

export class TypographicFlowSettingTab extends PluginSettingTab {
  plugin: TypographicFlowPlugin;

  constructor(app: App, plugin: TypographicFlowPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Reset to defaults')
      .setDesc('Restore all settings to their original values')
      .addButton((btn) =>
        btn
          .setButtonText('Reset')
          .setWarning()
          .onClick(async () => {
            await this.plugin.resetToDefaults();
            this.display();
            new Notice('Settings reset to defaults');
          }),
      );

    let lastSection: string | null = null;
    for (const s of TypographicFlowSettingTab._table) {
      if (s.section !== lastSection) {
        containerEl.createEl('h2', {text: s.section});
        lastSection = s.section;
      }

      const setting = new Setting(containerEl).setName(s.name).setDesc(s.desc);

      const settingsRecord = this.plugin.settings as unknown as Record<
        string,
        unknown
      >;
      const pluginRecord = this.plugin as unknown as Record<
        string,
        (...args: unknown[]) => void
      >;
      const val = () => settingsRecord[s.key];
      const call = (v: unknown) => {
        if (typeof pluginRecord[s.method] !== 'function') {
          console.error(
            `[TypographicFlow] Settings method not found: ${s.method}`,
          );
          return;
        }
        pluginRecord[s.method](v);
      };

      if (s.type === 'toggle') {
        setting.addToggle((t) =>
          t.setValue(val() as boolean).onChange(call as (v: boolean) => void),
        );
      } else if (s.type === 'slider') {
        setting.addSlider((sl) => {
          sl.setLimits(s.min, s.max, s.step);
          const display = s.toSlider
            ? s.toSlider(val() as number)
            : (val() as number);
          sl.setValue(display);
          sl.onChange((v) => call(s.fromSlider ? s.fromSlider(v) : v));
          if (s.key === 'gridUnit' && this.plugin.settings.gridAutoCalibrate) {
            sl.setDisabled(true);
            setting.setName(
              s.name + ' (Auto: ' + this.plugin.settings.gridUnit + 'px)',
            );
          }
        });
      } else if (s.type === 'dropdown') {
        setting.addDropdown((dd) => {
          for (const [k, v] of Object.entries(s.options)) dd.addOption(k, v);
          dd.setValue(val() as string);
          dd.onChange(call as (v: string) => void);
        });
      }
    }
  }

  private static _table: SettingRow[] = [
    {
      section: 'Typewriter Scroll / 打字机滚动',
      name: 'Toggle Typewriter Scrolling',
      desc: 'Enable or disable typewriter scrolling',
      key: 'enabled',
      type: 'toggle',
      method: 'toggleTypewriterScroll',
    },
    {
      section: 'Typewriter Scroll / 打字机滚动',
      name: 'Center offset / 居中偏移',
      desc: 'Cursor position as % of screen height (50 = center)',
      key: 'typewriterOffset',
      type: 'slider',
      min: 0,
      max: 100,
      step: 5,
      toSlider: (v) => v * 100,
      fromSlider: (v) => v / 100,
      method: 'changeTypewriterOffset',
    },
    {
      section: 'Typewriter Scroll / 打字机滚动',
      name: 'Dead Zone / 死区',
      desc: 'Lines to move before re-centering (prevents jitter)',
      key: 'deadZone',
      type: 'slider',
      min: 0,
      max: 10,
      step: 1,
      method: 'changeDeadZone',
    },
    {
      section: 'Typewriter Scroll / 打字机滚动',
      name: 'Scroll Suspension / 滚动暂停',
      desc: 'Pause auto-center on manual scroll, resume on typing',
      key: 'suspensionEnabled',
      type: 'toggle',
      method: 'toggleSuspension',
    },
    {
      section: 'Typewriter Scroll / 打字机滚动',
      name: 'Smooth Scroll / 平滑滚动',
      desc: 'Animate scroll to cursor position',
      key: 'smoothScrollEnabled',
      type: 'toggle',
      method: 'toggleSmoothScroll',
    },
    {
      section: 'Typewriter Scroll / 打字机滚动',
      name: 'Smart Offset / 智能偏移',
      desc: 'Adjust position for headings and empty lines',
      key: 'smartOffsetEnabled',
      type: 'toggle',
      method: 'toggleSmartOffset',
    },

    {
      section: 'Focus & Zen / 专注模式',
      name: 'Zen Mode / 禅模式',
      desc: 'Dim non-active lines. Static: fixed opacity. Dynamic: responds to typing speed.',
      key: 'zenMode',
      type: 'dropdown',
      options: {
        off: 'Off',
        static: 'Static / 固定',
        dynamic: 'Dynamic / 动态响应',
      },
      method: 'changeZenMode',
    },
    {
      section: 'Focus & Zen / 专注模式',
      name: 'Zen Opacity / 禅模式透明度',
      desc: 'Brightness of dimmed lines (lower = darker)',
      key: 'zenOpacity',
      type: 'slider',
      min: 0,
      max: 100,
      step: 5,
      toSlider: (v) => v * 100,
      fromSlider: (v) => v / 100,
      method: 'changeZenOpacity',
    },
    {
      section: 'Focus & Zen / 专注模式',
      name: 'Focus Mode / 聚焦模式',
      desc: 'Dim lines outside current range',
      key: 'focusMode',
      type: 'dropdown',
      options: {
        off: 'Off',
        line: 'Single Line',
        paragraph: 'Current Paragraph',
        heading: 'Current Heading',
        sentence: 'Sentence (experimental)',
      },
      method: 'changeFocusMode',
    },
    {
      section: 'Focus & Zen / 专注模式',
      name: 'Focus Dimming / 聚焦虚化',
      desc: 'Opacity of dimmed lines outside focus range (lower = darker)',
      key: 'focusOpacity',
      type: 'slider',
      min: 0,
      max: 100,
      step: 5,
      toSlider: (v) => v * 100,
      fromSlider: (v) => v / 100,
      method: 'changeFocusOpacity',
    },

    {
      section: 'Cursor & Animation / 光标与动画',
      name: 'Enable Breathing Cursor / 呼吸光标',
      desc: 'Smooth fade cycle instead of binary blink',
      key: 'breatheEnabled',
      type: 'toggle',
      method: 'toggleBreathe',
    },
    {
      section: 'Cursor & Animation / 光标与动画',
      name: 'Breath Duration / 呼吸周期',
      desc: 'Speed of one breath cycle (seconds)',
      key: 'breatheDuration',
      type: 'slider',
      min: 2,
      max: 8,
      step: 0.5,
      method: 'changeBreatheDuration',
    },
    {
      section: 'Cursor & Animation / 光标与动画',
      name: 'Minimum Opacity / 最低透明度',
      desc: 'Lowest brightness in breath cycle',
      key: 'breatheMinOpacity',
      type: 'slider',
      min: 0.1,
      max: 0.8,
      step: 0.05,
      method: 'changeBreatheMinOpacity',
    },
    {
      section: 'Cursor & Animation / 光标与动画',
      name: 'Enable Strikethrough Animation / 删除线动画',
      desc: 'Animate ~~strikethrough~~ from left to right',
      key: 'strikeAnimEnabled',
      type: 'toggle',
      method: 'toggleStrikeAnim',
    },
    {
      section: 'Cursor & Animation / 光标与动画',
      name: 'Reveal Duration / 动画时长',
      desc: 'Speed of strikethrough animation (seconds)',
      key: 'strikeAnimDuration',
      type: 'slider',
      min: 0.1,
      max: 0.8,
      step: 0.05,
      method: 'changeStrikeAnimDuration',
    },
    {
      section: 'Cursor & Animation / 光标与动画',
      name: 'Restore Cursor Position / 恢复光标位置',
      desc: 'Remember cursor and scroll position when reopening files',
      key: 'cursorRestoreEnabled',
      type: 'toggle',
      method: 'toggleCursorRestore',
    },

    {
      section: 'Typography / 排版',
      name: 'Enable Baseline Grid / 基线网格',
      desc: 'Align text to a vertical grid for consistent spacing',
      key: 'gridEnabled',
      type: 'toggle',
      method: 'toggleGrid',
    },
    {
      section: 'Typography / 排版',
      name: 'Show Grid Lines / 显示网格线',
      desc: 'Show grid lines (layout stays active when off)',
      key: 'gridShowLines',
      type: 'toggle',
      method: 'toggleGridLines',
    },
    {
      section: 'Typography / 排版',
      name: 'Grid Unit / 网格模数',
      desc: 'Base unit for grid spacing (px)',
      key: 'gridUnit',
      type: 'slider',
      min: 10,
      max: 20,
      step: 1,
      method: 'changeGridUnit',
    },
    {
      section: 'Typography / 排版',
      name: 'Y-axis Offset / Y轴偏移',
      desc: 'Vertical offset of grid lines (px)',
      key: 'gridOffsetY',
      type: 'slider',
      min: 20,
      max: 40,
      step: 1,
      method: 'changeGridOffsetY',
    },
    {
      section: 'Typography / 排版',
      name: 'Grid Line Opacity (Light) / 浅色模式透明度',
      desc: 'Grid line brightness in light mode',
      key: 'gridLineOpacityLight',
      type: 'slider',
      min: 0,
      max: 0.15,
      step: 0.005,
      method: 'changeGridLineOpacityLight',
    },
    {
      section: 'Typography / 排版',
      name: 'Grid Line Opacity (Dark) / 深色模式透明度',
      desc: 'Grid line brightness in dark mode',
      key: 'gridLineOpacityDark',
      type: 'slider',
      min: 0,
      max: 0.15,
      step: 0.005,
      method: 'changeGridLineOpacityDark',
    },
    {
      section: 'Typography / 排版',
      name: 'Corner Radius Coefficient / 圆角系数',
      desc: 'Roundness of corners (0 = sharp)',
      key: 'gridRadiusCoef',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.05,
      method: 'changeGridRadiusCoef',
    },
    {
      section: 'Typography / 排版',
      name: 'Font Weight / 字重',
      desc: 'Variable font weight axis (requires variable font installed)',
      key: 'fontWeight',
      type: 'slider',
      min: 250,
      max: 900,
      step: 50,
      method: 'changeFontWeight',
    },
    {
      section: 'Typography / 排版',
      name: 'Mindful Font Weight / 心流变字重',
      desc: 'Dynamic font weight based on typing speed (fast=light, pause=heavy)',
      key: 'flowEnabled',
      type: 'toggle',
      method: 'toggleFlowState',
    },
    {
      section: 'Typography / 排版',
      name: 'Flow Sensitivity / 心流灵敏度',
      desc: 'WPM threshold for flow state detection',
      key: 'flowSensitivity',
      type: 'slider',
      min: 10,
      max: 100,
      step: 5,
      method: 'changeFlowSensitivity',
    },
    {
      section: 'Typography / 排版',
      name: 'Weight Range / 字重变化幅度',
      desc: 'Maximum font weight change in flow state',
      key: 'flowWeightRange',
      type: 'slider',
      min: 10,
      max: 80,
      step: 5,
      method: 'changeFlowWeightRange',
    },
    {
      section: 'Typography / 排版',
      name: 'Auto Calibrate / 自动校准',
      desc: 'Measure theme font metrics and auto-compute optimal grid unit. Slider becomes read-only when enabled.',
      key: 'gridAutoCalibrate',
      type: 'toggle',
      method: 'changeGridAutoCalibrate',
    },
    {
      section: 'Typography / 排版',
      name: 'Enable CJK Prose / 中文排版',
      desc: 'CJK typography: half-width punctuation + margin trim',
      key: 'cjkProseEnabled',
      type: 'toggle',
      method: 'toggleCjkProse',
    },
    {
      section: 'Typography / 排版',
      name: 'Justify Text / 两端对齐',
      desc: 'Justify text ⚠ May cause uneven spacing. Not compatible with long inline math ($...$)',
      key: 'cjkProseJustify',
      type: 'toggle',
      method: 'toggleCjkJustify',
    },
    {
      section: 'Typography / 排版',
      name: 'First-line Indent / 首行缩进',
      desc: 'Indent first line ⚠ Reading View only',
      key: 'cjkProseIndent',
      type: 'toggle',
      method: 'toggleCjkIndent',
    },

    {
      section: 'Colors / 配色',
      name: 'Enable Reading Colors / 阅读配色',
      desc: 'Apply zen reading color palette',
      key: 'colorsEnabled',
      type: 'toggle',
      method: 'toggleColors',
    },
    {
      section: 'Colors / 配色',
      name: 'Accent Hue Shift / 强调色色相',
      desc: 'Shift accent color (0 = green, + = warm, − = cool)',
      key: 'colorsAccentHue',
      type: 'slider',
      min: -30,
      max: 30,
      step: 1,
      method: 'changeColorsAccentHue',
    },
    {
      section: 'Colors / 配色',
      name: 'Accent Saturation / 强调色饱和度',
      desc: 'Accent color intensity',
      key: 'colorsAccentSat',
      type: 'slider',
      min: -30,
      max: 30,
      step: 1,
      method: 'changeColorsAccentSat',
    },
    {
      section: 'Colors / 配色',
      name: 'Background Warmth / 背景暖度',
      desc: 'Background tone (0 = neutral)',
      key: 'colorsBgWarmth',
      type: 'slider',
      min: -10,
      max: 10,
      step: 1,
      method: 'changeColorsBgWarmth',
    },
    {
      section: 'Colors / 配色',
      name: 'Text Contrast / 文字对比度',
      desc: 'Text darkness/brightness',
      key: 'colorsTextContrast',
      type: 'slider',
      min: -15,
      max: 15,
      step: 1,
      method: 'changeColorsTextContrast',
    },

    {
      section: 'Fullscreen / 全屏模式',
      name: 'Enable Fullscreen Mode / 启用全屏模式',
      desc: 'Hide all UI elements for distraction-free writing',
      key: 'fullscreenEnabled',
      type: 'toggle',
      method: 'toggleFullscreen',
    },
    {
      section: 'Fullscreen / 全屏模式',
      name: 'Show Header / 显示标题栏',
      desc: 'Show title bar in fullscreen mode',
      key: 'fullscreenShowHeader',
      type: 'toggle',
      method: 'toggleFullscreenHeader',
    },
    {
      section: 'Fullscreen / 全屏模式',
      name: 'Show Status Bar / 显示状态栏',
      desc: 'Show status bar in fullscreen mode',
      key: 'fullscreenShowStatusBar',
      type: 'toggle',
      method: 'toggleFullscreenStatusBar',
    },
    {
      section: 'Fullscreen / 全屏模式',
      name: 'Vignette Effect / 暗角效果',
      desc: 'Dark edges effect in fullscreen mode',
      key: 'fullscreenShowVignette',
      type: 'toggle',
      method: 'toggleFullscreenVignette',
    },
    {
      section: 'Fullscreen / 全屏模式',
      name: 'Vignette Style / 暗角样式',
      desc: 'Style of the vignette overlay',
      key: 'fullscreenVignetteStyle',
      type: 'dropdown',
      options: {radial: 'Radial (default)', box: 'Box shadow', none: 'None'},
      method: 'changeFullscreenVignetteStyle',
    },
  ];
}
