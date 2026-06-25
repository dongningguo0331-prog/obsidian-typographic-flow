/**
 * Typographic Flow �?Main Plugin Entry
 *
 * Orchestrates all modules: typewriter scroll, focus/zen modes,
 * breathing cursor, strikethrough animation, baseline grid,
 * reading colors, and CJK prose formatting.
 */

import {Notice, Plugin} from 'obsidian';
import {Compartment} from '@codemirror/state';
import type {MarkdownView} from 'obsidian';
import type {Extension} from '@codemirror/state';

import {buildTypewriterExtensions} from './engine/typewriter';
import {buildFocusExtensions, type FocusMode} from './engine/focus-mode';
import {ZenModeManager} from './engine/zen-mode';
import {VelocityZenEngine} from './engine/velocity-zen';
import {BreathingCursorManager} from './engine/breathing-cursor';
import {StrikethroughAnimManager} from './engine/strikethrough-anim';
import {FullscreenManager, type VignetteStyle} from './engine/fullscreen';
import {
  CursorRestoreManager,
  setCursorRestoreForViewPlugin,
} from './engine/cursor-restore';
import {FlowStateManager, setFlowStateForViewPlugin} from './engine/flow-state';

import {
  PluginSettings,
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  migrateSettings,
  validateSettings,
} from './settings';
import {setBodyCSS, removeBodyCSS, getCmView} from './ui/helpers';
import {TypographicFlowSettingTab} from './ui/settings-tab';

// ── Plugin ──

export default class TypographicFlowPlugin extends Plugin {
  settings!: PluginSettings;

  private zenMode!: ZenModeManager;
  private velocityZen!: VelocityZenEngine;
  private breathe!: BreathingCursorManager;
  private strike!: StrikethroughAnimManager;
  private fullscreen!: FullscreenManager;
  private flowState!: FlowStateManager;

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
  private cursorRestore!: CursorRestoreManager;

  // ---- Lifecycle ----

  async onload(): Promise<void> {
    // Create Compartments once �?they persist for the plugin's lifetime
    this._compartments = {
      typewriter: new Compartment(),
      focusMode: new Compartment(),
    };
    this._compartmentValues = {
      typewriter: this._compartments.typewriter.of([]),
      focusMode: this._compartments.focusMode.of([]),
    };
    this.registerEditorExtension(Object.values(this._compartmentValues));

    this.zenMode = new ZenModeManager();
    this.velocityZen = new VelocityZenEngine((opacity) => {
      this.zenMode.setOpacity(opacity);
    });
    this.breathe = new BreathingCursorManager();
    this.strike = new StrikethroughAnimManager();
    this.fullscreen = new FullscreenManager(this.app);
    this.fullscreen.onExit = () => this.toggleFullscreen(false);
    this.fullscreen.onToggle = () => this.toggleFullscreen();
    this.cursorRestore = new CursorRestoreManager(this.app);
    this.flowState = new FlowStateManager();

    try {
      await this._initPlugin();
    } catch (err) {
      console.error('[TypographicFlow] Failed to load:', err);
      new Notice(
        'Typographic Flow: failed to load. Check console for details.',
      );
    }
  }

  /** Re-initialize all modules from current settings. */
  async _initPlugin(): Promise<void> {
    const loaded = await this.loadData();
    const migrated = migrateSettings(loaded || {});
    this.settings = validateSettings({...DEFAULT_SETTINGS, ...migrated});

    // Cursor position restore �?MUST be before typewriter so ViewPlugin can access it
    if (this.settings.cursorRestoreEnabled) {
      this.cursorRestore.enable(this.settings.cursorPositions, () =>
        this._save(),
      );
      setCursorRestoreForViewPlugin(this.cursorRestore);
    }

    // Reconfigure compartments (do NOT recreate them)
    if (this.settings.enabled) {
      document.body.classList.add('plugin-cm-typewriter-scroll');
      const exts = buildTypewriterExtensions(this.settings);
      this._compartmentValues.typewriter =
        this._compartments.typewriter.of(exts);
      this.dispatchToEditors(exts);
    }

    if (this.settings.zenMode === 'static') {
      this.zenMode.setOpacity(this.settings.zenOpacity);
      this.zenMode.enable();
    } else if (this.settings.zenMode === 'dynamic') {
      this.zenMode.enable();
      this.zenMode.setDynamic(true);
      this.velocityZen.enable();
    }

    if (this.settings.breatheEnabled) {
      this.breathe.setDuration(this.settings.breatheDuration);
      this.breathe.setMinOpacity(this.settings.breatheMinOpacity);
      this.breathe.enable();
    }

    if (this.settings.strikeAnimEnabled) {
      this.strike.setDuration(this.settings.strikeAnimDuration);
      this.strike.enable();
    }

    if (this.settings.focusMode !== 'off') {
      document.body.classList.add('plugin-tf-focus');
      this.dispatchFocusExtensions(this.settings.focusMode);
    }
    // Always set focus opacity CSS variable (even when mode is off, for consistency)
    setBodyCSS('--focus-opacity', String(this.settings.focusOpacity));

    if (this.settings.colorsEnabled) this.enableColors();
    if (this.settings.gridEnabled) this.enableGrid();
    setBodyCSS('--user-wght', String(this.settings.fontWeight));
    if (this.settings.flowEnabled) {
      this.flowState.enable();
      this.flowState.setSensitivity(this.settings.flowSensitivity);
      this.flowState.setWeightRange(this.settings.flowWeightRange);
    }
    setFlowStateForViewPlugin(this.flowState);
    if (this.settings.cjkProseEnabled) this.enableCjkProse();
    if (this.settings.cjkProseJustify) this.enableCjkJustify();
    if (this.settings.cjkProseIndent) this.enableCjkIndent();

    // Fullscreen mode
    if (this.settings.fullscreenEnabled) {
      this.fullscreen.enable();
      this.fullscreen.setShowHeader(this.settings.fullscreenShowHeader);
      this.fullscreen.setShowStatusBar(this.settings.fullscreenShowStatusBar);
      if (this.settings.fullscreenShowVignette) {
        this.fullscreen.setVignetteStyle(this.settings.fullscreenVignetteStyle);
      }
    }

    // Recalculate typewriter offset when layout changes (sidebar toggle, split pane, etc.)
    // Debounced via requestAnimationFrame to avoid rebuilding extensions on every event.
    if (this.settings.enabled) {
      let raf = 0;
      this._layoutChangeHandler = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          this.dispatchToEditors(buildTypewriterExtensions(this.settings));
        });
      };
      this.registerEvent(
        this.app.workspace.on('layout-change', this._layoutChangeHandler),
      );
    }

    // Auto-calibrate grid when theme / CSS changes
    if (this.settings.gridAutoCalibrate && this.settings.gridEnabled) {
      this.registerEvent(
        this.app.workspace.on('css-change', () => {
          this._debouncedCalibrate();
        }),
      );
      // Also run once on load (delayed so DOM can settle)
      this.app.workspace.onLayoutReady(() => {
        this._autoCalibrateGrid();
      });
    }

    // Status bar indicator
    this._statusBarItem = this.addStatusBarItem();
    this._statusBarItem.addClass('tf-status-bar');
    this._updateStatusBar();

    this.addSettingTab(new TypographicFlowSettingTab(this.app, this));
    this.addCommands();
  }

  /** Reset all settings to defaults and re-initialize. */
  async resetToDefaults(): Promise<void> {
    // Tear down current state
    this.disableTypewriterScroll();
    this.zenMode?.disable();
    this.breathe?.disable();
    this.strike?.disable();
    this.fullscreen?.disable();
    document.body.classList.remove('plugin-tf-focus');
    this.disableColors();
    this.disableGrid();
    this.disableCjkProse();
    this.disableCjkJustify();
    this.disableCjkIndent();

    // Reset settings
    this.settings = {...DEFAULT_SETTINGS, settingsVersion: SETTINGS_VERSION};
    await this._save();

    // Re-initialize
    await this._initPlugin();
  }

  onunload(): void {
    this.disableTypewriterScroll();
    this._layoutChangeHandler = null;
    this._statusBarItem?.remove();
    this._statusBarItem = null;
    this.fullscreen?.destroy();
    this.cursorRestore?.destroy();
    setCursorRestoreForViewPlugin(null);
    this.flowState?.destroy();
    setFlowStateForViewPlugin(null);
    this.zenMode?.disable();
    this.zenMode?.destroy();
    this.velocityZen?.destroy();
    this.breathe?.destroy();
    this.strike?.destroy();
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
      callback: () => {
        const modes: Array<'off' | 'static' | 'dynamic'> = [
          'off',
          'static',
          'dynamic',
        ];
        const idx = modes.indexOf(this.settings.zenMode);
        const next = modes[(idx + 1) % modes.length];
        this.changeZenMode(next);
      },
    });

    this.addCommand({
      id: 'cycle-focus-mode',
      name: 'Cycle Focus Mode (off �?line �?paragraph �?heading �?sentence)',
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

  private _notify(..._args: unknown[]): void {
    // Status bar is the primary feedback channel �?no Notice spam on rapid toggles.
    // Users can see active modes in the status bar (�?TW·Z·FL·C·G·CJK).
    this._updateStatusBar();
  }

  private _save(): Promise<void> {
    return this.saveData(this.settings)
      .catch((e) => {
        console.error('[TypographicFlow] Failed to save settings', e);
        new Notice('TypographicFlow: Failed to save settings');
      })
      .then(() => {});
  }

  private static readonly _statusAbbreviations: Record<string, string> = {
    TW: 'Typewriter Scrolling',
    Z: 'Zen Mode',
    FL: 'Focus: Line',
    FP: 'Focus: Paragraph',
    FH: 'Focus: Heading',
    FS: 'Focus: Sentence',
    C: 'Reading Colors',
    G: 'Baseline Grid',
    CJK: 'CJK Prose',
  };

  private _updateStatusBar(): void {
    if (!this._statusBarItem) return;
    const parts: string[] = [];
    if (this.settings.enabled) parts.push('TW');
    if (this.settings.zenMode !== 'off') parts.push('Z');
    if (this.settings.focusMode !== 'off') {
      const abbrev: Record<string, string> = {
        line: 'FL',
        paragraph: 'FP',
        heading: 'FH',
        sentence: 'FS',
      };
      parts.push(abbrev[this.settings.focusMode] ?? 'F');
    }
    if (this.settings.colorsEnabled) parts.push('C');
    if (this.settings.gridEnabled) parts.push('G');
    if (this.settings.cjkProseEnabled) parts.push('CJK');

    if (parts.length) {
      this._statusBarItem.setText(`�?${parts.join('·')}`);
      const fullNames = parts.map(
        (p) => TypographicFlowPlugin._statusAbbreviations[p] ?? p,
      );
      this._statusBarItem.setAttribute('title', fullNames.join(', '));
    } else {
      this._statusBarItem.setText('');
      this._statusBarItem.removeAttribute('title');
    }
  }

  toggleTypewriterScroll(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.enabled;
    this.settings.enabled = newValue;
    this._notify('Typewriter', newValue);
    newValue ? this.enableTypewriterScroll() : this.disableTypewriterScroll();
    this._save();
  }

  private enableTypewriterScroll(): void {
    document.body.classList.add('plugin-cm-typewriter-scroll');
    const exts = buildTypewriterExtensions(this.settings);
    this._compartmentValues.typewriter = this._compartments.typewriter.of(exts);
    this.dispatchToEditors(exts);
  }

  private disableTypewriterScroll(): void {
    document.body.classList.remove('plugin-cm-typewriter-scroll');
    this._compartmentValues.typewriter = this._compartments.typewriter.of([]);
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
      this._save();
      return;
    }
    const exts = buildTypewriterExtensions(this.settings);
    this._compartmentValues.typewriter = this._compartments.typewriter.of(exts);
    this.dispatchToEditors(exts);
    this._save();
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

  changeZenMode(mode: 'off' | 'static' | 'dynamic'): void {
    // Tear down current mode
    if (this.settings.zenMode === 'dynamic') {
      this.velocityZen.disable();
      this.zenMode.setDynamic(false);
    }
    if (this.settings.zenMode !== 'off') {
      this.zenMode.disable();
    }

    this.settings.zenMode = mode;

    if (mode === 'static') {
      this.zenMode.enable();
      this.zenMode.setOpacity(this.settings.zenOpacity);
    } else if (mode === 'dynamic') {
      this.zenMode.enable();
      this.zenMode.setDynamic(true);
      this.velocityZen.enable();
    }
    this._save();
    this._notify('Zen Mode', mode !== 'off');
  }

  changeZenOpacity(newValue: number): void {
    this.settings.zenOpacity = newValue;
    this.zenMode.setOpacity(newValue);
    this._save();
  }

  // ---- Focus Mode ----

  changeFocusMode(mode: FocusMode = 'off'): void {
    this.settings.focusMode = mode;
    this._updateStatusBar();
    if (mode === 'off') {
      document.body.classList.remove('plugin-tf-focus');
    } else {
      document.body.classList.add('plugin-tf-focus');
    }
    this.dispatchFocusExtensions(mode);
    this._save();
  }

  changeFocusOpacity(v: number): void {
    this._applySetting(
      'focusOpacity',
      v,
      '--focus-opacity',
      'focusMode' as keyof PluginSettings,
    );
  }

  // ---- Breathing Cursor ----

  toggleBreathe(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.breatheEnabled;
    this.settings.breatheEnabled = newValue;
    this._notify('Breathing Cursor', newValue);
    if (newValue) {
      this.breathe.setDuration(this.settings.breatheDuration);
      this.breathe.setMinOpacity(this.settings.breatheMinOpacity);
      this.breathe.enable();
    } else {
      this.breathe.disable();
    }
    this._save();
  }

  changeBreatheDuration(v: number): void {
    this._applySetting(
      'breatheDuration',
      v,
      '--tf-breathe-duration',
      'breatheEnabled',
      's',
    );
  }

  changeBreatheMinOpacity(v: number): void {
    this._applySetting(
      'breatheMinOpacity',
      v,
      '--tf-breathe-min-opacity',
      'breatheEnabled',
    );
  }

  // ---- Strikethrough Animation ----

  toggleStrikeAnim(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.strikeAnimEnabled;
    this.settings.strikeAnimEnabled = newValue;
    this._notify('Strikethrough Animation', newValue);
    newValue ? this.strike.enable() : this.strike.disable();
    this.strike.setDuration(this.settings.strikeAnimDuration);
    this._save();
  }

  changeStrikeAnimDuration(v: number): void {
    this.settings.strikeAnimDuration = v;
    if (this.settings.strikeAnimEnabled) this.strike.setDuration(v);
    this._save();
  }

  // ---- Fullscreen Mode ----

  toggleFullscreen(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.fullscreenEnabled;
    this.settings.fullscreenEnabled = newValue;
    this._notify('Fullscreen', newValue);
    if (newValue) {
      this.fullscreen.enable();
      this.fullscreen.setShowHeader(this.settings.fullscreenShowHeader);
      this.fullscreen.setShowStatusBar(this.settings.fullscreenShowStatusBar);
      if (this.settings.fullscreenShowVignette) {
        this.fullscreen.setVignetteStyle(this.settings.fullscreenVignetteStyle);
      }
    } else {
      this.fullscreen.disable();
    }
    this._save();
  }

  toggleFullscreenHeader(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.fullscreenShowHeader;
    this.settings.fullscreenShowHeader = newValue;
    this.fullscreen.setShowHeader(newValue);
    this._save();
  }

  toggleFullscreenStatusBar(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.fullscreenShowStatusBar;
    this.settings.fullscreenShowStatusBar = newValue;
    this.fullscreen.setShowStatusBar(newValue);
    this._save();
  }

  toggleFullscreenVignette(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.fullscreenShowVignette;
    this.settings.fullscreenShowVignette = newValue;
    if (newValue) {
      this.fullscreen.setVignetteStyle(this.settings.fullscreenVignetteStyle);
    } else {
      this.fullscreen.setVignetteStyle('none');
    }
    this._save();
  }

  changeFullscreenVignetteStyle(v: VignetteStyle): void {
    this.settings.fullscreenVignetteStyle = v;
    if (this.settings.fullscreenShowVignette) {
      this.fullscreen.setVignetteStyle(v);
    }
    this._save();
  }

  // ---- Cursor Restore ----

  toggleCursorRestore(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.cursorRestoreEnabled;
    this.settings.cursorRestoreEnabled = newValue;
    this._notify('Cursor Restore', newValue);
    if (newValue) {
      this.cursorRestore.enable(this.settings.cursorPositions, () =>
        this._save(),
      );
      setCursorRestoreForViewPlugin(this.cursorRestore);
    } else {
      this.cursorRestore.disable();
      setCursorRestoreForViewPlugin(null);
    }
    this._save();
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
        this._save();
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
    this._save();
  }

  // ============================================================
  //  Colors Module
  // ============================================================

  toggleColors(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.colorsEnabled;
    this.settings.colorsEnabled = newValue;
    this._notify('Reading Colors', newValue);
    newValue ? this.enableColors() : this.disableColors();
    this._save();
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
    this._applySetting(
      'colorsAccentSat',
      v,
      '--accent-sat-adjust',
      'colorsEnabled',
    );
  }

  changeColorsBgWarmth(v: number): void {
    this._applySetting('colorsBgWarmth', v, '--bg-warmth', 'colorsEnabled');
  }

  changeColorsTextContrast(v: number): void {
    this._applySetting(
      'colorsTextContrast',
      v,
      '--text-contrast',
      'colorsEnabled',
    );
  }

  // ============================================================
  //  Grid Module
  // ============================================================

  toggleGrid(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.gridEnabled;
    this.settings.gridEnabled = newValue;
    this._notify('Baseline Grid', newValue);
    newValue ? this.enableGrid() : this.disableGrid();
    this._save();
  }

  toggleGridLines(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.gridShowLines;
    this.settings.gridShowLines = newValue;
    if (newValue) {
      document.body.classList.add('plugin-tf-grid-visible');
    } else {
      document.body.classList.remove('plugin-tf-grid-visible');
    }
    this._save();
  }

  private enableGrid(showLines = this.settings.gridShowLines): void {
    document.body.classList.add('plugin-tf-grid');
    if (showLines) {
      document.body.classList.add('plugin-tf-grid-visible');
    }
    this.applyGridSettings();
    // Auto-calibrate when grid is toggled on with auto mode enabled
    if (this.settings.gridAutoCalibrate) {
      this._debouncedCalibrate();
    }
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
    setBodyCSS(
      '--grid-line-opacity-light',
      String(this.settings.gridLineOpacityLight),
    );
    setBodyCSS(
      '--grid-line-opacity-dark',
      String(this.settings.gridLineOpacityDark),
    );
    setBodyCSS('--grid-radius-coef', String(this.settings.gridRadiusCoef));
  }

  changeGridUnit(v: number): void {
    this._applySetting('gridUnit', v, '--grid-unit', 'gridEnabled', 'px');
  }

  changeGridOffsetY(v: number): void {
    this._applySetting(
      'gridOffsetY',
      v,
      '--grid-offset-y',
      'gridEnabled',
      'px',
    );
  }

  changeGridLineOpacityLight(v: number): void {
    this._applySetting(
      'gridLineOpacityLight',
      v,
      '--grid-line-opacity-light',
      'gridEnabled',
    );
  }

  changeGridLineOpacityDark(v: number): void {
    this._applySetting(
      'gridLineOpacityDark',
      v,
      '--grid-line-opacity-dark',
      'gridEnabled',
    );
  }

  changeGridRadiusCoef(v: number): void {
    this._applySetting(
      'gridRadiusCoef',
      v,
      '--grid-radius-coef',
      'gridEnabled',
    );
  }

  // ── Variable Font Weight ──

  changeFontWeight(v: number): void {
    this.settings.fontWeight = v;
    setBodyCSS('--user-wght', String(v));
    this._save();
  }

  // ── Mindful Font Weight (Flow State) ──

  toggleFlowState(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.flowEnabled;
    this.settings.flowEnabled = newValue;
    this._notify('Mindful Font Weight', newValue);
    if (newValue) {
      this.flowState.enable();
      this.flowState.setSensitivity(this.settings.flowSensitivity);
      this.flowState.setWeightRange(this.settings.flowWeightRange);
      setFlowStateForViewPlugin(this.flowState);
    } else {
      this.flowState.disable();
      setFlowStateForViewPlugin(null);
    }
    this._save();
  }

  changeFlowSensitivity(v: number): void {
    this.settings.flowSensitivity = v;
    this.flowState.setSensitivity(v);
    this._save();
  }

  changeFlowWeightRange(v: number): void {
    this.settings.flowWeightRange = v;
    this.flowState.setWeightRange(v);
    this._save();
  }

  // ── Grid Auto-Calibration ──

  private _calibrateTimer: number = 0;

  private _debouncedCalibrate(): void {
    window.clearTimeout(this._calibrateTimer);
    this._calibrateTimer = window.setTimeout(() => {
      this._autoCalibrateGrid();
    }, 500);
  }

  private _measureNaturalLineHeight(): number | null {
    const leaf = this.app.workspace.activeLeaf;
    if (!leaf?.view || leaf.view.getViewType() !== 'markdown') return null;
    const view = leaf.view as MarkdownView;
    const cm = getCmView(view);
    if (!cm) return null;

    const computed = window.getComputedStyle(cm.dom);

    // Create a hidden probe that inherits the editor's font but lives outside
    // the .plugin-tf-grid scope, so it is NOT affected by the grid's
    // line-height: !important override.
    const probe = document.createElement('span');
    probe.textContent = 'AaAg中文字体';
    probe.style.fontFamily = computed.fontFamily;
    probe.style.fontSize = computed.fontSize;
    probe.style.fontWeight = computed.fontWeight;
    probe.style.letterSpacing = computed.letterSpacing;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.whiteSpace = 'nowrap';
    probe.style.lineHeight = 'normal';
    document.body.appendChild(probe);

    const height = probe.offsetHeight;
    probe.remove();
    return height > 0 ? height : null;
  }

  private _autoCalibrateGrid(): void {
    if (!this.settings.gridAutoCalibrate || !this.settings.gridEnabled) return;

    const naturalLH = this._measureNaturalLineHeight();
    if (!naturalLH || naturalLH <= 0) return;

    // gridUnit = naturalLH / 3 (because lh-normal = gridUnit * 3)
    let gridUnit = Math.round(naturalLH / 3);

    // Snap to even values for clean pixel alignment
    gridUnit = Math.round(gridUnit / 2) * 2;

    // Clamp to valid range
    gridUnit = Math.max(10, Math.min(20, gridUnit));

    // Apply via existing CSS variable path
    this.settings.gridUnit = gridUnit;
    setBodyCSS('--grid-unit', gridUnit + 'px');
    this._save();

    // Force typewriter engine to re-read typography constants
    this.dispatchToEditors(buildTypewriterExtensions(this.settings));
  }

  changeGridAutoCalibrate(v: boolean): void {
    this.settings.gridAutoCalibrate = v;
    if (v && this.settings.gridEnabled) {
      this._autoCalibrateGrid();
    }
    this._save();
  }

  // ============================================================
  //  CJK Prose Formatting
  // ============================================================

  toggleCjkProse(newValue: boolean | null = null): void {
    if (newValue === null) newValue = !this.settings.cjkProseEnabled;
    this.settings.cjkProseEnabled = newValue;
    this._notify('CJK Prose', newValue);
    newValue ? this.enableCjkProse() : this.disableCjkProse();
    this._save();
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
    this._save();
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
    this._save();
  }

  private enableCjkIndent(): void {
    document.body.classList.add('plugin-tf-cjk-indent');
  }

  private disableCjkIndent(): void {
    document.body.classList.remove('plugin-tf-cjk-indent');
  }
}
