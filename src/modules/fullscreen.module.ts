/**
 * Fullscreen Writing Mode module — distraction-free writing environment.
 *
 * Owns the FullscreenManager and wires its Esc/F11/exit-button callbacks
 * back to the module's own toggle (callbacks are (re)bound on every sync,
 * which is idempotent because they are plain property setters).
 */

import type {App, Command} from 'obsidian';
import {FullscreenManager, type VignetteStyle} from '../engine/fullscreen';
import type {FeatureModule, ModuleContext, SettingRow} from './types';

const SECTION = 'Fullscreen / 全屏模式';

export class FullscreenModule implements FeatureModule {
  readonly id = 'fullscreen';
  readonly settingOrder = 100;
  private readonly manager: FullscreenManager;

  constructor(app: App) {
    this.manager = new FullscreenManager(app);
  }

  syncFromSettings(ctx: ModuleContext): void {
    this.manager.onExit = () => this.toggle(ctx, false);
    this.manager.onToggle = () => this.toggle(ctx);

    if (ctx.settings.fullscreenEnabled) {
      this.manager.enable();
      this.manager.setShowHeader(ctx.settings.fullscreenShowHeader);
      this.manager.setShowStatusBar(ctx.settings.fullscreenShowStatusBar);
      if (ctx.settings.fullscreenShowVignette) {
        this.manager.setVignetteStyle(ctx.settings.fullscreenVignetteStyle);
      }
    } else {
      this.manager.disable();
    }
  }

  teardown(_ctx: ModuleContext): void {
    this.manager.destroy();
  }

  commands(ctx: ModuleContext): Command[] {
    return [
      {
        id: 'toggle-fullscreen-mode',
        name: 'Toggle Fullscreen Writing Mode',
        callback: () => this.toggle(ctx),
      },
      {
        id: 'toggle-fullscreen-header',
        name: 'Toggle Fullscreen Header',
        callback: () => this.toggleHeader(ctx),
      },
      {
        id: 'toggle-fullscreen-status-bar',
        name: 'Toggle Fullscreen Status Bar',
        callback: () => this.toggleStatusBar(ctx),
      },
    ];
  }

  settingRows(ctx: ModuleContext): SettingRow[] {
    return [
      {
        section: SECTION,
        name: 'Enable Fullscreen Mode / 启用全屏模式',
        desc: 'Hide all UI elements for distraction-free writing',
        key: 'fullscreenEnabled',
        type: 'toggle',
        onChange: (v) => this.toggle(ctx, v),
      },
      {
        section: SECTION,
        name: 'Show Header / 显示标题栏',
        desc: 'Show title bar in fullscreen mode',
        key: 'fullscreenShowHeader',
        type: 'toggle',
        onChange: (v) => this.toggleHeader(ctx, v),
      },
      {
        section: SECTION,
        name: 'Show Status Bar / 显示状态栏',
        desc: 'Show status bar in fullscreen mode',
        key: 'fullscreenShowStatusBar',
        type: 'toggle',
        onChange: (v) => this.toggleStatusBar(ctx, v),
      },
      {
        section: SECTION,
        name: 'Vignette Effect / 暗角效果',
        desc: 'Dark edges effect in fullscreen mode',
        key: 'fullscreenShowVignette',
        type: 'toggle',
        onChange: (v) => this.toggleVignette(ctx, v),
      },
      {
        section: SECTION,
        name: 'Vignette Style / 暗角样式',
        desc: 'Style of the vignette overlay',
        key: 'fullscreenVignetteStyle',
        type: 'dropdown',
        options: {radial: 'Radial (default)', box: 'Box shadow', none: 'None'},
        onChange: (v) => this.changeVignetteStyle(ctx, v as VignetteStyle),
      },
    ];
  }

  private toggle(ctx: ModuleContext, newValue: boolean | null = null): void {
    if (newValue === null) newValue = !ctx.settings.fullscreenEnabled;
    ctx.settings.fullscreenEnabled = newValue;
    ctx.refreshStatusBar();
    if (newValue) {
      this.manager.enable();
      this.manager.setShowHeader(ctx.settings.fullscreenShowHeader);
      this.manager.setShowStatusBar(ctx.settings.fullscreenShowStatusBar);
      if (ctx.settings.fullscreenShowVignette) {
        this.manager.setVignetteStyle(ctx.settings.fullscreenVignetteStyle);
      }
    } else {
      this.manager.disable();
    }
    void ctx.save();
  }

  private toggleHeader(ctx: ModuleContext, newValue: boolean | null = null) {
    if (newValue === null) newValue = !ctx.settings.fullscreenShowHeader;
    ctx.settings.fullscreenShowHeader = newValue;
    this.manager.setShowHeader(newValue);
    void ctx.save();
  }

  private toggleStatusBar(
    ctx: ModuleContext,
    newValue: boolean | null = null,
  ): void {
    if (newValue === null) newValue = !ctx.settings.fullscreenShowStatusBar;
    ctx.settings.fullscreenShowStatusBar = newValue;
    this.manager.setShowStatusBar(newValue);
    void ctx.save();
  }

  private toggleVignette(
    ctx: ModuleContext,
    newValue: boolean | null = null,
  ): void {
    if (newValue === null) newValue = !ctx.settings.fullscreenShowVignette;
    ctx.settings.fullscreenShowVignette = newValue;
    if (newValue) {
      this.manager.setVignetteStyle(ctx.settings.fullscreenVignetteStyle);
    } else {
      this.manager.setVignetteStyle('none');
    }
    void ctx.save();
  }

  private changeVignetteStyle(ctx: ModuleContext, v: VignetteStyle): void {
    ctx.settings.fullscreenVignetteStyle = v;
    if (ctx.settings.fullscreenShowVignette) {
      this.manager.setVignetteStyle(v);
    }
    void ctx.save();
  }
}
