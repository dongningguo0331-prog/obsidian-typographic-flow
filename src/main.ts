/**
 * Typographic Flow — Main Plugin Entry
 *
 * Assembly shell: loads settings, builds the module context, instantiates
 * feature modules in dependency order, and wires up the status bar.
 *
 * All feature logic lives in the modules:
 *  - src/modules/  Obsidian integration (commands, settings rows, lifecycle)
 *  - src/engine/   Pure behavior (CM6 ViewPlugins, managers)
 */

import {Notice, Plugin} from 'obsidian';

import {
  PluginSettings,
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  migrateSettings,
  validateSettings,
} from './settings';
import type {FeatureModule, ModuleContext, SettingRow} from './modules/types';
import {createModuleRegistry, type ModuleRegistry} from './modules/registry';
import {CursorRestoreModule} from './modules/cursor-restore.module';
import {TypewriterModule} from './modules/typewriter.module';
import {ZenModule} from './modules/zen.module';
import {FocusModule} from './modules/focus.module';
import {CursorFxModule} from './modules/cursor-fx.module';
import {FlowStateModule} from './modules/flow-state.module';
import {ColorsModule} from './modules/colors.module';
import {GridModule} from './modules/grid.module';
import {CjkModule} from './modules/cjk.module';
import {FullscreenModule} from './modules/fullscreen.module';
import {TypographicFlowSettingTab} from './ui/settings-tab';

export default class TypographicFlowPlugin extends Plugin {
  settings!: PluginSettings;

  private registry!: ModuleRegistry;
  private ctx!: ModuleContext;
  private typewriterModule!: TypewriterModule;
  private statusBarItem: HTMLElement | null = null;

  // ---- Lifecycle ----

  async onload(): Promise<void> {
    try {
      const loaded = await this.loadData();
      const migrated = migrateSettings(loaded || {});
      this.settings = validateSettings({...DEFAULT_SETTINGS, ...migrated});

      const plugin = this;
      this.ctx = {
        app: this.app,
        plugin: this,
        // Live view: the settings object is replaced on reset-to-defaults,
        // so modules must never capture it by value.
        get settings() {
          return plugin.settings;
        },
        save: () => plugin._save(),
        refreshStatusBar: () => plugin._updateStatusBar(),
        rebuildTypewriter: () => plugin.typewriterModule.rebuild(plugin.ctx),
      };

      // Module order = initialization (dependency) order:
      //  - cursor-restore MUST sync before typewriter: the typewriter
      //    ViewPlugin reads its manager singleton during construction.
      //  - flow-state's singleton must exist before editors receive updates.
      // Settings-tab row order is independent (see ModuleContext settingOrder).
      this.typewriterModule = new TypewriterModule();
      const modules: FeatureModule[] = [
        new CursorRestoreModule(this.app),
        this.typewriterModule,
        new ZenModule(),
        new FocusModule(),
        new CursorFxModule(),
        new FlowStateModule(),
        new ColorsModule(),
        new GridModule(),
        new CjkModule(),
        new FullscreenModule(this.app),
      ];
      this.registry = createModuleRegistry(modules);

      this.registerEditorExtension(this.registry.initialEditorExtensions());

      this.registry.syncAll(this.ctx);

      for (const command of this.registry.allCommands(this.ctx)) {
        this.addCommand(command);
      }

      this.statusBarItem = this.addStatusBarItem();
      this.statusBarItem.addClass('tf-status-bar');
      this._updateStatusBar();

      this.addSettingTab(new TypographicFlowSettingTab(this.app, this));
    } catch (err) {
      console.error('[TypographicFlow] Failed to load:', err);
      new Notice(
        'Typographic Flow: failed to load. Check console for details.',
      );
    }
  }

  /** Reset all settings to defaults and re-initialize. */
  async resetToDefaults(): Promise<void> {
    this.registry.teardownAll(this.ctx);

    this.settings = {
      ...DEFAULT_SETTINGS,
      cursorPositions: {},
      settingsVersion: SETTINGS_VERSION,
    };
    await this._save();

    this.registry.syncAll(this.ctx);
    this._updateStatusBar();
  }

  onunload(): void {
    this.registry?.teardownAll(this.ctx);
    this.statusBarItem?.remove();
    this.statusBarItem = null;
  }

  // ---- Facades consumed by the setting tab ----

  /** Settings rows aggregated from all modules, in UI order. */
  getSettingRows(): SettingRow[] {
    return this.registry.allSettingRows(this.ctx);
  }

  // ---- Internals ----

  private _save(): Promise<void> {
    return this.saveData(this.settings)
      .catch((e) => {
        console.error('[TypographicFlow] Failed to save settings', e);
        new Notice('TypographicFlow: Failed to save settings');
      })
      .then(() => {});
  }

  private _updateStatusBar(): void {
    if (!this.statusBarItem) return;
    const parts = this.registry.statusBarParts(this.ctx);

    if (parts.length) {
      this.statusBarItem.setText(`⚙ ${parts.map((p) => p.abbr).join('·')}`);
      this.statusBarItem.setAttribute(
        'title',
        parts.map((p) => p.fullName).join(', '),
      );
    } else {
      this.statusBarItem.setText('');
      this.statusBarItem.removeAttribute('title');
    }
  }
}
