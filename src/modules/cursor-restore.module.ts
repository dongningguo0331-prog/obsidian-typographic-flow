/**
 * Cursor Restore module — remember cursor/scroll position per file.
 *
 * Owns the CursorRestoreManager and its ViewPlugin singleton wiring.
 * MUST be synced before the typewriter module: the typewriter ViewPlugin
 * reads the singleton during construction and on every update.
 */

import type {App} from 'obsidian';
import {
  CursorRestoreManager,
  setCursorRestoreForViewPlugin,
} from '../engine/cursor-restore';
import type {FeatureModule, ModuleContext, SettingRow} from './types';

export class CursorRestoreModule implements FeatureModule {
  readonly id = 'cursor-restore';
  readonly settingOrder = 50;
  private readonly manager: CursorRestoreManager;

  constructor(app: App) {
    this.manager = new CursorRestoreManager(app);
  }

  syncFromSettings(ctx: ModuleContext): void {
    if (ctx.settings.cursorRestoreEnabled) {
      this.manager.enable(ctx.settings.cursorPositions, () => ctx.save());
      setCursorRestoreForViewPlugin(this.manager);
    } else {
      this.manager.disable();
      setCursorRestoreForViewPlugin(null);
    }
  }

  teardown(_ctx: ModuleContext): void {
    this.manager.destroy();
    setCursorRestoreForViewPlugin(null);
  }

  settingRows(ctx: ModuleContext): SettingRow[] {
    return [
      {
        section: 'Cursor & Animation / 光标与动画',
        name: 'Restore Cursor Position / 恢复光标位置',
        desc: 'Remember cursor and scroll position when reopening files',
        key: 'cursorRestoreEnabled',
        type: 'toggle',
        onChange: (v) => this.toggle(ctx, v),
      },
    ];
  }

  private toggle(ctx: ModuleContext, newValue: boolean | null = null): void {
    if (newValue === null) newValue = !ctx.settings.cursorRestoreEnabled;
    ctx.settings.cursorRestoreEnabled = newValue;
    ctx.refreshStatusBar();
    if (newValue) {
      this.manager.enable(ctx.settings.cursorPositions, () => ctx.save());
      setCursorRestoreForViewPlugin(this.manager);
    } else {
      this.manager.disable();
      setCursorRestoreForViewPlugin(null);
    }
    void ctx.save();
  }
}
