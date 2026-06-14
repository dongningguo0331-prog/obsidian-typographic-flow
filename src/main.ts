/**
 * Typographic Flow — Main Plugin Entry
 *
 * Orchestrates all modules: typewriter scroll, focus/zen modes,
 * breathing cursor, strikethrough animation, baseline grid,
 * reading colors, and CJK prose formatting.
 */

import { Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { Compartment } from '@codemirror/state';
import type { App, Editor, MarkdownView } from 'obsidian';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

import {
  buildTypewriterExtensions,
} from './engine/typewriter';
import {
  buildFocusExtensions,
  type FocusMode,
} from './engine/focus-mode';
import { ZenModeManager } from './engine/zen-mode';
import { BreathingCursorManager } from './engine/breathing-cursor';
import { StrikethroughAnimManager } from './engine/strikethrough-anim';

// ── CSS Helpers ──

function setBodyCSS(key: string, value: string): void {
  document.body.style.setProperty(key, value);
}

function removeBodyCSS(key: string): void {
  document.body.style.removeProperty(key);
}

// ── CM6 EditorView accessor ──
// Obsidian's Editor interface doesn't expose .cm, but the underlying
// CodeMirror 6 editor has it. This helper safely extracts it.

interface EditorWithCm extends Editor {
  cm: EditorView;
}

function getCmView(view: MarkdownView): EditorView | null {
  if (!view?.editor) return null;
  const editor = view.editor as EditorWithCm;
  return editor.cm ?? null;
}

// ── Deep merge (source wins for primitives; objects merge recursively) ──

function _deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = Object.assign({}, target) as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    const srcVal = (source as Record<string, unknown>)[key];
    const tgtVal = result[key];
    const srcIsObj = srcVal !== null && typeof srcVal === 'object' && !Array.isArray(srcVal);
    const tgtIsObj = tgtVal !== null && typeof tgtVal === 'object' && !Array.isArray(tgtVal);
    if (srcIsObj && tgtIsObj) {
      result[key] = _deepMerge(
        tgtVal as Record<string, unknown>,
        srcVal as Record<string, unknown>,
      );
    } else if (srcVal !== undefined) {
      result[key] = srcVal;
    }
  }
  return result as T;
}

// ── Settings Schema ──

const SETTINGS_VERSION = 1;

const SETTING_MIGRATIONS: Record<number, (s: PluginSettings) => PluginSettings> = {
  1: (s) => s,
};

function migrateSettings(settings: PluginSettings): PluginSettings {
  let v = settings.settingsVersion || 0;
  while (v < SETTINGS_VERSION) {
    const fn = SETTING_MIGRATIONS[v + 1];
    if (fn) {
      settings = fn(settings);
      v = settings.settingsVersion || v + 1;
    } else {
      settings.settingsVersion = SETTINGS_VERSION;
      break;
    }
  }
  return settings;
}

export interface PluginSettings {
  // Typewriter
  enabled: boolean;
  typewriterOffset: number;
  deadZone: number;
  suspensionEnabled: boolean;
  smoothScrollEnabled: boolean;
  smartOffsetEnabled: boolean;

  // Zen
  zenEnabled: boolean;
  zenOpacity: number;

  // Focus
  focusMode: FocusMode;

  // Colors
  colorsEnabled: boolean;
  colorsAccentHue: number;
  colorsAccentSat: number;
  colorsBgWarmth: number;
  colorsTextContrast: number;

  // Grid
  gridEnabled: boolean;
  gridShowLines: boolean;
  gridUnit: number;
  gridOffsetY: number;
  gridLineOpacityLight: number;
  gridLineOpacityDark: number;
  gridRadiusCoef: number;

  // CJK Prose
  cjkProseEnabled: boolean;
  cjkProseJustify: boolean;
  cjkProseIndent: boolean;

  // Breathing Cursor
  breatheEnabled: boolean;
  breatheDuration: number;
  breatheMinOpacity: number;

  // Strikethrough Animation
  strikeAnimEnabled: boolean;
  strikeAnimDuration: number;

  // Schema
  settingsVersion: number;
}

const DEFAULT_SETTINGS: PluginSettings = {
  // Typewriter
  enabled: true,
  typewriterOffset: 0.5,
  deadZone: 2,
  suspensionEnabled: true,
  smoothScrollEnabled: true,
  smartOffsetEnabled: true,

  // Zen
  zenEnabled: false,
  zenOpacity: 0.25,

  // Focus
  focusMode: 'off',

  // Colors
  colorsEnabled: false,
  colorsAccentHue: 0,
  colorsAccentSat: 0,
  colorsBgWarmth: 0,
  colorsTextContrast: 0,

  // Grid
  gridEnabled: true,
  gridShowLines: true,
  gridUnit: 16,
  gridOffsetY: 35,
  gridLineOpacityLight: 0.045,
  gridLineOpacityDark: 0.04,
  gridRadiusCoef: 0.285,

  // CJK Prose
  cjkProseEnabled: false,
  cjkProseJustify: false,
  cjkProseIndent: false,

  // Breathing Cursor
  breatheEnabled: false,
  breatheDuration: 4,
  breatheMinOpacity: 0.4,

  // Strikethrough Animation
  strikeAnimEnabled: false,
  strikeAnimDuration: 0.35,

  // Schema
  settingsVersion: SETTINGS_VERSION,
};

// ── Plugin ──

export default class TypographicFlowPlugin extends Plugin {
  settings!: PluginSettings;

  private zenMode!: ZenModeManager;
  private breathe!: BreathingCursorManager;
  private strike!: StrikethroughAnimManager;

  private _compartments!: {
    typewriter: Compartment;
    focusMode: Compartment;
  };

  private _compartmentValues!: {
    typewriter: Extension;
    focusMode: Extension;
  };

  private _layoutChangeHandler: (() => void) | null = null;
  private _statusBarItem: HTMLElement | null = null;

  // ---- Lifecycle ----

  async onload(): Promise<void> {
    try {
      await this._initPlugin();
    } catch (err) {
      console.error('[TypographicFlow] Failed to load:', err);
      new Notice('Typographic Flow: failed to load. Check console for details.');
    }
  }

  /** Re-initialize all modules from current settings. Public for settings tab reset. */
  async _initPlugin(): Promise<void> {
    const loaded = await this.loadData();
    const migrated = migrateSettings(loaded || {});
    this.settings = _deepMerge(
      DEFAULT_SETTINGS as unknown as Record<string, unknown>,
      migrated as unknown as Record<string, unknown>,
    ) as unknown as PluginSettings;

    this._compartments = {
      typewriter: new Compartment(),
      focusMode: new Compartment(),
    };

    this._compartmentValues = {
      typewriter: this._compartments.typewriter.of(
        this.settings.enabled
          ? buildTypewriterExtensions(this.settings)
          : [],
      ),
      focusMode: this._compartments.focusMode.of(
        this.settings.focusMode !== 'off'
          ? buildFocusExtensions(this.settings.focusMode)
          : [],
      ),
    };

    this.registerEditorExtension(
      Object.values(this._compartmentValues),
    );

    this.zenMode = new ZenModeManager();
    if (this.settings.enabled) {
      document.body.classList.add('plugin-cm-typewriter-scroll');
      this.dispatchToEditors(buildTypewriterExtensions(this.settings));
    }

    if (this.settings.zenEnabled) {
      this.zenMode.setOpacity(this.settings.zenOpacity);
      this.zenMode.enable();
    }

    this.breathe = new BreathingCursorManager();
    if (this.settings.breatheEnabled) {
      this.breathe.setDuration(this.settings.breatheDuration);
      this.breathe.setMinOpacity(this.settings.breatheMinOpacity);
      this.breathe.enable();
    }

    this.strike = new StrikethroughAnimManager();
    if (this.settings.strikeAnimEnabled) {
      this.strike.setDuration(this.settings.strikeAnimDuration);
      this.strike.enable();
    }

    if (this.settings.focusMode !== 'off') {
      document.body.classList.add('plugin-tf-focus');
      this.dispatchFocusExtensions(this.settings.focusMode);
    }

    if (this.settings.colorsEnabled) this.enableColors();
    if (this.settings.gridEnabled) this.enableGrid();
    if (this.settings.cjkProseEnabled) this.enableCjkProse();
    if (this.settings.cjkProseJustify) this.enableCjkJustify();
    if (this.settings.cjkProseIndent) this.enableCjkIndent();

    // Recalculate typewriter offset when layout changes (sidebar toggle, split pane, etc.)
    if (this.settings.enabled) {
      this._layoutChangeHandler = () => this.dispatchToEditors(buildTypewriterExtensions(this.settings));
      this.registerEvent(this.app.workspace.on('layout-change', this._layoutChangeHandler));
    }

    // Status bar indicator
    this._statusBarItem = this.addStatusBarItem();
    this._statusBarItem.addClass('tf-status-bar');
    this._updateStatusBar();

    this.addSettingTab(new TypographicFlowSettingTab(this.app, this));
    this.addCommands();
  }

  onunload(): void {
    this.disableTypewriterScroll();
    this._layoutChangeHandler = null;
    this._statusBarItem?.remove();
    this._statusBarItem = null;
    this.zenMode.disable();
    this.zenMode.destroy();
    this.breathe.destroy();
    this.strike.destroy();
    document.body.classList.remove('plugin-tf-focus');
    this.disableColors();
    this.disableGrid();
    this.disableCjkProse();
    this.disableCjkJustify();
    this.disableCjkIndent();
  }

  // ---- Commands ----

  private addCommands(): void {
    this.addCommand({
      id: 'toggle-typewriter-scroll',
      name: 'Toggle Typewriter Scrolling On/Off',
      callback: () => this.toggleTypewriterScroll(),
    });

    this.addCommand({
      id: 'toggle-zen-mode',
      name: 'Toggle Zen Mode On/Off',
      callback: () => this.toggleZen(),
    });

    this.addCommand({
      id: 'cycle-focus-mode',
      name: 'Cycle Focus Mode (off → line → paragraph → heading → sentence)',
      callback: () => {
        const modes: FocusMode[] = [
          'off',
          'line',
          'paragraph',
          'heading',
          'sentence',
        ];
        const idx = modes.indexOf(this.settings.focusMode);
        const next = modes[(idx + 1) % modes.length];
        this.changeFocusMode(next);
      },
    });

    this.addCommand({
      id: 'focus-mode-off',
      name: 'Turn Off Focus Mode',
      callback: () => this.changeFocusMode('off'),
    });

    this.addCommand({
      id: 'toggle-colors',
      name: 'Toggle Reading Colors On/Off',
      callback: () => this.toggleColors(),
    });

    this.addCommand({
      id: 'toggle-grid',
      name: 'Toggle Baseline Grid On/Off',
      callback: () => this.toggleGrid(),
    });

    this.addCommand({
      id: 'toggle-cjk-prose',
      name: 'Toggle CJK Prose Formatting On/Off',
      callback: () => this.toggleCjkProse(),
    });

    this.addCommand({
      id: 'toggle-cjk-indent',
      name: 'Toggle CJK First-line Indent On/Off',
      callback: () => this.toggleCjkIndent(),
    });

    this.addCommand({
      id: 'toggle-cjk-justify',
      name: 'Toggle CJK Justification On/Off',
      callback: () => this.toggleCjkJustify(),
    });

    this.addCommand({
      id: 'toggle-breathing-cursor',
      name: 'Toggle Breathing Cursor On/Off',
      callback: () => this.toggleBreathe(),
    });

    this.addCommand({
      id: 'toggle-strikethrough-anim',
      name: 'Toggle Strikethrough Animation On/Off',
      callback: () => this.toggleStrikeAnim(),
    });
  }

  // ---- Dispatch Helpers ----

  private dispatchToEditors(extensions: Extension[]): void {
    const leaves = this.app.workspace.getLeavesOfType('markdown');
    for (const leaf of leaves) {
      const view = leaf.view as MarkdownView;
      const cm = getCmView(view);
      if (cm) {
        cm.dispatch({
          effects: this._compartments.typewriter.reconfigure(extensions),
        });
      }
    }
  }

  private dispatchFocusExtensions(mode: FocusMode): void {
    const leaves = this.app.workspace.getLeavesOfType('markdown');
    const exts = buildFocusExtensions(mode);
    this._compartmentValues.focusMode = this._compartments.focusMode.of(exts);
    for (const leaf of leaves) {
      const view = leaf.view as MarkdownView;
      const cm = getCmView(view);
      if (cm) {
        cm.dispatch({
          effects: this._compartments.focusMode.reconfigure(exts),
        });
      }
    }
  }

  // ---- Typewriter Toggle & Settings ----

  private _notify(label: string, on: boolean): void {
    new Notice(`${label}: ${on ? 'ON' : 'OFF'}`);
    this._updateStatusBar();
  }

  private _updateStatusBar(): void {
    if (!this._statusBarItem) return;
    const parts: string[] = [];
    if (this.settings.enabled) parts.push('TW');
    if (this.settings.zenEnabled) parts.push('Z');
    if (this.settings.focusMode !== 'off') {
      const abbrev: Record<string, string> = {
        line: 'FL', paragraph: 'FP', heading: 'FH', sentence: 'FS',
      };
      parts.push(abbrev[this.settings.focusMode] ?? 'F');
    }
    if (this.settings.colorsEnabled) parts.push('C');
    if (this.settings.gridEnabled) parts.push('G');
    if (this.settings.cjkProseEnabled) parts.push('CJK');
    this._statusBarItem.setText(parts.length ? `⚙ ${parts.join('·')}` : '');
  }

  toggleTypewriterScroll(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.enabled;
    this.settings.enabled = newValue;
    this._notify('Typewriter', newValue);
    newValue
      ? this.enableTypewriterScroll()
      : this.disableTypewriterScroll();
    this.saveData(this.settings);
  }

  private enableTypewriterScroll(): void {
    document.body.classList.add('plugin-cm-typewriter-scroll');
    const exts = buildTypewriterExtensions(this.settings);
    this._compartmentValues.typewriter =
      this._compartments.typewriter.of(exts);
    this.dispatchToEditors(exts);
  }

  private disableTypewriterScroll(): void {
    document.body.classList.remove('plugin-cm-typewriter-scroll');
    this._compartmentValues.typewriter =
      this._compartments.typewriter.of([]);
    this.dispatchToEditors([]);

    // Clean up padding styles
    const leaves = this.app.workspace.getLeavesOfType('markdown');
    for (const leaf of leaves) {
      const view = leaf.view as MarkdownView;
      const cm = getCmView(view);
      if (cm) {
        cm.contentDOM.style.paddingTop = '';
        cm.contentDOM.style.paddingBottom = '';
      }
    }
  }

  private reconfigureTypewriter(): void {
    if (!this.settings.enabled) {
      this.saveData(this.settings);
      return;
    }
    const exts = buildTypewriterExtensions(this.settings);
    this._compartmentValues.typewriter =
      this._compartments.typewriter.of(exts);
    this.dispatchToEditors(exts);
    this.saveData(this.settings);
  }

  changeTypewriterOffset(newValue: number): void {
    this.settings.typewriterOffset = newValue;
    this.reconfigureTypewriter();
  }

  changeDeadZone(newValue: number): void {
    this.settings.deadZone = newValue;
    this.reconfigureTypewriter();
  }

  toggleSuspension(newValue: boolean): void {
    this.settings.suspensionEnabled = newValue;
    this.reconfigureTypewriter();
  }

  toggleSmoothScroll(newValue: boolean): void {
    this.settings.smoothScrollEnabled = newValue;
    this.reconfigureTypewriter();
  }

  toggleSmartOffset(newValue: boolean): void {
    this.settings.smartOffsetEnabled = newValue;
    this.reconfigureTypewriter();
  }

  // ---- Zen Mode ----

  toggleZen(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.zenEnabled;
    this.settings.zenEnabled = newValue;
    this._notify('Zen Mode', newValue);
    newValue ? this.zenMode.enable() : this.zenMode.disable();
    this.zenMode.setOpacity(this.settings.zenOpacity);
    this.saveData(this.settings);
  }

  changeZenOpacity(newValue: number): void {
    this.settings.zenOpacity = newValue;
    this.zenMode.setOpacity(newValue);
    this.saveData(this.settings);
  }

  // ---- Focus Mode ----

  changeFocusMode(mode: FocusMode = 'off'): void {
    this.settings.focusMode = mode;
    const labels: Record<FocusMode, string> = {
      off: 'Off', line: 'Line', paragraph: 'Paragraph', heading: 'Heading', sentence: 'Sentence',
    };
    new Notice(`Focus: ${labels[mode]}`);
    this._updateStatusBar();
    if (mode === 'off') {
      document.body.classList.remove('plugin-tf-focus');
    } else {
      document.body.classList.add('plugin-tf-focus');
    }
    this.dispatchFocusExtensions(mode);
    this.saveData(this.settings);
  }

  // ---- Breathing Cursor ----

  toggleBreathe(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.breatheEnabled;
    this.settings.breatheEnabled = newValue;
    this._notify('Breathing Cursor', newValue);
    newValue ? this.breathe.enable() : this.breathe.disable();
    this.saveData(this.settings);
  }

  changeBreatheDuration(v: number): void {
    this._applySetting('breatheDuration', v, '--tf-breathe-duration', 'breatheEnabled', 's');
  }

  changeBreatheMinOpacity(v: number): void {
    this._applySetting('breatheMinOpacity', v, '--tf-breathe-min-opacity', 'breatheEnabled');
  }

  // ---- Strikethrough Animation ----

  toggleStrikeAnim(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.strikeAnimEnabled;
    this.settings.strikeAnimEnabled = newValue;
    this._notify('Strikethrough Animation', newValue);
    newValue ? this.strike.enable() : this.strike.disable();
    this.strike.setDuration(this.settings.strikeAnimDuration);
    this.saveData(this.settings);
  }

  changeStrikeAnimDuration(v: number): void {
    this.settings.strikeAnimDuration = v;
    if (this.settings.strikeAnimEnabled) this.strike.setDuration(v);
    this.saveData(this.settings);
  }

  // ---- Generic Setting Setter ----

  private _applySetting(
    key: keyof PluginSettings,
    value: number,
    cssVar: string,
    enabledKey: keyof PluginSettings,
    format?: 'px' | 's',
  ): void {
    const settingsRecord = this.settings as unknown as Record<string, unknown>;
    settingsRecord[key] = value;
    if (settingsRecord[enabledKey] && cssVar) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        console.warn(
          `[TypographicFlow] Invalid CSS value for ${String(key)}: ${value}`,
        );
        this.saveData(this.settings);
        return;
      }
      const formatted =
        format === 'px'
          ? value + 'px'
          : format === 's'
            ? value + 's'
            : String(value);
      setBodyCSS(cssVar, formatted);
    }
    this.saveData(this.settings);
  }

  // ============================================================
  //  Colors Module
  // ============================================================

  toggleColors(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.colorsEnabled;
    this.settings.colorsEnabled = newValue;
    this._notify('Reading Colors', newValue);
    newValue ? this.enableColors() : this.disableColors();
    this.saveData(this.settings);
  }

  private enableColors(): void {
    document.body.classList.add('plugin-tf-colors');
    this.applyColorsSettings();
  }

  private disableColors(): void {
    document.body.classList.remove('plugin-tf-colors');
    for (const key of [
      '--accent-hue',
      '--accent-sat-adjust',
      '--bg-warmth',
      '--text-contrast',
    ]) {
      removeBodyCSS(key);
    }
  }

  private applyColorsSettings(): void {
    setBodyCSS('--accent-hue', String(this.settings.colorsAccentHue));
    setBodyCSS('--accent-sat-adjust', String(this.settings.colorsAccentSat));
    setBodyCSS('--bg-warmth', String(this.settings.colorsBgWarmth));
    setBodyCSS('--text-contrast', String(this.settings.colorsTextContrast));
  }

  changeColorsAccentHue(v: number): void {
    this._applySetting('colorsAccentHue', v, '--accent-hue', 'colorsEnabled');
  }

  changeColorsAccentSat(v: number): void {
    this._applySetting('colorsAccentSat', v, '--accent-sat-adjust', 'colorsEnabled');
  }

  changeColorsBgWarmth(v: number): void {
    this._applySetting('colorsBgWarmth', v, '--bg-warmth', 'colorsEnabled');
  }

  changeColorsTextContrast(v: number): void {
    this._applySetting('colorsTextContrast', v, '--text-contrast', 'colorsEnabled');
  }

  // ============================================================
  //  Grid Module
  // ============================================================

  toggleGrid(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.gridEnabled;
    this.settings.gridEnabled = newValue;
    this._notify('Baseline Grid', newValue);
    newValue ? this.enableGrid() : this.disableGrid();
    this.saveData(this.settings);
  }

  toggleGridLines(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.gridShowLines;
    this.settings.gridShowLines = newValue;
    if (newValue) {
      document.body.classList.add('plugin-tf-grid-visible');
    } else {
      document.body.classList.remove('plugin-tf-grid-visible');
    }
    this.saveData(this.settings);
  }

  private enableGrid(showLines = this.settings.gridShowLines): void {
    document.body.classList.add('plugin-tf-grid');
    if (showLines) {
      document.body.classList.add('plugin-tf-grid-visible');
    }
    this.applyGridSettings();
  }

  private disableGrid(): void {
    document.body.classList.remove('plugin-tf-grid', 'plugin-tf-grid-visible');
    for (const key of [
      '--grid-unit',
      '--grid-offset-y',
      '--grid-line-opacity-light',
      '--grid-line-opacity-dark',
      '--grid-radius-coef',
    ]) {
      removeBodyCSS(key);
    }
  }

  private applyGridSettings(): void {
    setBodyCSS('--grid-unit', String(this.settings.gridUnit) + 'px');
    setBodyCSS('--grid-offset-y', String(this.settings.gridOffsetY) + 'px');
    setBodyCSS('--grid-line-opacity-light', String(this.settings.gridLineOpacityLight));
    setBodyCSS('--grid-line-opacity-dark', String(this.settings.gridLineOpacityDark));
    setBodyCSS('--grid-radius-coef', String(this.settings.gridRadiusCoef));
  }

  changeGridUnit(v: number): void {
    this._applySetting('gridUnit', v, '--grid-unit', 'gridEnabled', 'px');
  }

  changeGridOffsetY(v: number): void {
    this._applySetting('gridOffsetY', v, '--grid-offset-y', 'gridEnabled', 'px');
  }

  changeGridLineOpacityLight(v: number): void {
    this._applySetting('gridLineOpacityLight', v, '--grid-line-opacity-light', 'gridEnabled');
  }

  changeGridLineOpacityDark(v: number): void {
    this._applySetting('gridLineOpacityDark', v, '--grid-line-opacity-dark', 'gridEnabled');
  }

  changeGridRadiusCoef(v: number): void {
    this._applySetting('gridRadiusCoef', v, '--grid-radius-coef', 'gridEnabled');
  }

  // ============================================================
  //  CJK Prose Formatting
  // ============================================================

  toggleCjkProse(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.cjkProseEnabled;
    this.settings.cjkProseEnabled = newValue;
    this._notify('CJK Prose', newValue);
    newValue ? this.enableCjkProse() : this.disableCjkProse();
    this.saveData(this.settings);
  }

  private enableCjkProse(): void {
    document.body.classList.add('plugin-tf-cjk-prose');
    if (this.settings.cjkProseJustify)
      document.body.classList.add('plugin-tf-cjk-justify');
    if (this.settings.cjkProseIndent)
      document.body.classList.add('plugin-tf-cjk-indent');
  }

  private disableCjkProse(): void {
    document.body.classList.remove(
      'plugin-tf-cjk-prose',
      'plugin-tf-cjk-justify',
      'plugin-tf-cjk-indent',
    );
  }

  toggleCjkJustify(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.cjkProseJustify;
    this.settings.cjkProseJustify = newValue;
    this._notify('CJK Justify', newValue);
    if (newValue && !this.settings.cjkProseEnabled) this.toggleCjkProse(true);
    newValue ? this.enableCjkJustify() : this.disableCjkJustify();
    this.saveData(this.settings);
  }

  private enableCjkJustify(): void {
    document.body.classList.add('plugin-tf-cjk-justify');
  }

  private disableCjkJustify(): void {
    document.body.classList.remove('plugin-tf-cjk-justify');
  }

  toggleCjkIndent(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.cjkProseIndent;
    this.settings.cjkProseIndent = newValue;
    this._notify('CJK First-line Indent', newValue);
    if (newValue && !this.settings.cjkProseEnabled) this.toggleCjkProse(true);
    newValue ? this.enableCjkIndent() : this.disableCjkIndent();
    this.saveData(this.settings);
  }

  private enableCjkIndent(): void {
    document.body.classList.add('plugin-tf-cjk-indent');
  }

  private disableCjkIndent(): void {
    document.body.classList.remove('plugin-tf-cjk-indent');
  }
}

// ── Settings Tab ──

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

class TypographicFlowSettingTab extends PluginSettingTab {
  plugin: TypographicFlowPlugin;

  constructor(app: App, plugin: TypographicFlowPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Reset to defaults button
    new Setting(containerEl)
      .setName('Reset to defaults')
      .setDesc('Restore all settings to their original values')
      .addButton((btn) =>
        btn.setButtonText('Reset').setWarning().onClick(async () => {
          this.plugin.settings = { ...DEFAULT_SETTINGS, settingsVersion: SETTINGS_VERSION };
          await this.plugin.saveData(this.plugin.settings);
          // Re-apply all modules
          this.plugin.onunload();
          await this.plugin._initPlugin();
          this.display(); // Re-render settings
          new Notice('Settings reset to defaults');
        }),
      );

    let lastSection: string | null = null;
    for (const s of TypographicFlowSettingTab._table) {
      if (s.section !== lastSection) {
        containerEl.createEl('h2', { text: s.section });
        lastSection = s.section;
      }

      const setting = new Setting(containerEl)
        .setName(s.name)
        .setDesc(s.desc);

      const settingsRecord = this.plugin.settings as unknown as Record<string, unknown>;
      const pluginRecord = this.plugin as unknown as Record<string, (...args: unknown[]) => void>;
      const val = () => settingsRecord[s.key];
      const call = (v: unknown) => pluginRecord[s.method](v);

      if (s.type === 'toggle') {
        setting.addToggle((t) => t.setValue(val() as boolean).onChange(call as (v: boolean) => void));
      } else if (s.type === 'slider') {
        setting.addSlider((sl) => {
          sl.setLimits(s.min, s.max, s.step);
          const display = s.toSlider ? s.toSlider(val() as number) : (val() as number);
          sl.setValue(display);
          sl.onChange((v) => call(s.fromSlider ? s.fromSlider(v) : v));
        });
      } else if (s.type === 'dropdown') {
        setting.addDropdown((dd) => {
          for (const [k, v] of Object.entries(s.options))
            dd.addOption(k, v);
          dd.setValue(val() as string);
          dd.onChange(call as (v: string) => void);
        });
      }
    }
  }

  private static _table: SettingRow[] = [
    // ── Typewriter Scroll ──
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

    // ── Focus & Zen ──
    {
      section: 'Focus & Zen / 专注模式',
      name: 'Zen Mode / 禅模式',
      desc: 'Dim non-active lines while typing',
      key: 'zenEnabled',
      type: 'toggle',
      method: 'toggleZen',
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

    // ── Cursor & Animation ──
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

    // ── Typography ──
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
      name: 'Enable CJK Prose / 中文排版',
      desc: 'CJK typography: half-width punctuation + margin trim',
      key: 'cjkProseEnabled',
      type: 'toggle',
      method: 'toggleCjkProse',
    },
    {
      section: 'Typography / 排版',
      name: 'Justify Text / 两端对齐',
      desc: 'Justify text ⚠ May cause uneven spacing in Live Preview',
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

    // ── Colors ──
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
  ];
}
