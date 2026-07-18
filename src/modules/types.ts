/**
 * Feature module contract — the building blocks of Typographic Flow.
 *
 * Each module owns one feature domain (typewriter, zen, grid, ...) and is
 * responsible for its own lifecycle, commands, settings rows, and status bar
 * contribution. main.ts only assembles modules in dependency order.
 */

import type {App, Command} from 'obsidian';
import type {Extension} from '@codemirror/state';
import type TypographicFlowPlugin from '../main';
import type {PluginSettings} from '../settings';

/**
 * Services the plugin shell provides to modules.
 * `settings` is a live view of the plugin's settings object (it is replaced
 * on reset-to-defaults, so modules must always read it through the context).
 */
export interface ModuleContext {
  app: App;
  plugin: TypographicFlowPlugin;
  readonly settings: PluginSettings;
  save(): Promise<void>;
  /** Re-render the status bar indicator after a state change. */
  refreshStatusBar(): void;
  /** Ask the typewriter module to rebuild its extensions (grid calibration). */
  rebuildTypewriter(): void;
}

export interface StatusBarPart {
  abbr: string;
  fullName: string;
}

export interface FeatureModule {
  readonly id: string;
  /**
   * Ordering hint for settings-tab rows. Initialization order is fixed by
   * the module array (dependency constraints), but settings UI order is a
   * separate concern — e.g. cursor-restore must sync before typewriter,
   * while its settings row appears after the cursor-fx rows.
   */
  readonly settingOrder?: number;
  /**
   * Initial CM6 extension containers (e.g. compartments) to be registered
   * once via Plugin.registerEditorExtension during onload.
   */
  initialEditorExtensions?(): Extension[];
  /**
   * Bring the module's runtime state in line with ctx.settings.
   * MUST be idempotent — called on load and after every reset-to-defaults.
   */
  syncFromSettings(ctx: ModuleContext): void;
  /** Fully disable and clean up (onunload / reset-to-defaults). */
  teardown(ctx: ModuleContext): void;
  /** Obsidian commands contributed by this module. */
  commands?(ctx: ModuleContext): Command[];
  /** Settings-tab rows contributed by this module. */
  settingRows?(ctx: ModuleContext): SettingRow[];
  /** Status bar abbreviation while active, null when inactive. */
  statusBarContribution?(ctx: ModuleContext): StatusBarPart | null;
}

// ── Settings-tab row definitions ──
// Rows carry their onChange as a typed function reference (no stringly-typed
// method names), so renames and typos are caught at compile time.

interface SettingRowBase {
  section: string;
  name: string;
  desc: string;
  key: keyof PluginSettings;
}

export interface ToggleRow extends SettingRowBase {
  type: 'toggle';
  onChange(value: boolean): void;
}

export interface SliderRow extends SettingRowBase {
  type: 'slider';
  min: number;
  max: number;
  step: number;
  toSlider?: (v: number) => number;
  fromSlider?: (v: number) => number;
  /** Disable the slider based on current settings (e.g. auto-calibrate). */
  disabledWhen?(settings: PluginSettings): boolean;
  /** Override the display name based on current settings. */
  dynamicName?(settings: PluginSettings): string;
  onChange(value: number): void;
}

export interface DropdownRow extends SettingRowBase {
  type: 'dropdown';
  options: Record<string, string>;
  onChange(value: string): void;
}

export type SettingRow = ToggleRow | SliderRow | DropdownRow;
