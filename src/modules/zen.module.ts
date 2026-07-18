/**
 * Zen Mode module — dim all non-active lines.
 *
 * Owns both the ZenModeManager (CSS class + opacity variable) and the
 * VelocityZenEngine (typing-speed-driven opacity), absorbing the
 * static/dynamic coordination that used to live in main.ts.
 */

import type {Command} from 'obsidian';
import {ZenModeManager} from '../engine/zen-mode';
import {VelocityZenEngine} from '../engine/velocity-zen';
import type {
  FeatureModule,
  ModuleContext,
  SettingRow,
  StatusBarPart,
} from './types';

type ZenMode = 'off' | 'static' | 'dynamic';

const SECTION = 'Focus & Zen / 专注模式';
const ZEN_MODES: readonly ZenMode[] = ['off', 'static', 'dynamic'];

export class ZenModule implements FeatureModule {
  readonly id = 'zen';
  readonly settingOrder = 20;
  private readonly zenMode = new ZenModeManager();
  private readonly velocityZen = new VelocityZenEngine((opacity) => {
    this.zenMode.setOpacity(opacity);
  });

  syncFromSettings(ctx: ModuleContext): void {
    const mode = ctx.settings.zenMode;
    if (mode === 'static') {
      this.velocityZen.disable();
      this.zenMode.setDynamic(false);
      this.zenMode.setOpacity(ctx.settings.zenOpacity);
      this.zenMode.enable();
    } else if (mode === 'dynamic') {
      this.zenMode.enable();
      this.zenMode.setDynamic(true);
      this.velocityZen.enable();
    } else {
      this.velocityZen.disable();
      this.zenMode.setDynamic(false);
      this.zenMode.disable();
    }
  }

  teardown(_ctx: ModuleContext): void {
    this.velocityZen.destroy();
    this.zenMode.destroy();
  }

  commands(ctx: ModuleContext): Command[] {
    return [
      {
        id: 'toggle-zen-mode',
        name: 'Toggle Zen Mode On/Off',
        callback: () => {
          const idx = ZEN_MODES.indexOf(ctx.settings.zenMode);
          const next = ZEN_MODES[(idx + 1) % ZEN_MODES.length];
          this.changeMode(ctx, next);
        },
      },
    ];
  }

  statusBarContribution(ctx: ModuleContext): StatusBarPart | null {
    return ctx.settings.zenMode !== 'off'
      ? {abbr: 'Z', fullName: 'Zen Mode'}
      : null;
  }

  settingRows(ctx: ModuleContext): SettingRow[] {
    return [
      {
        section: SECTION,
        name: 'Zen Mode / 禅模式',
        desc: 'Dim non-active lines. Static: fixed opacity. Dynamic: responds to typing speed.',
        key: 'zenMode',
        type: 'dropdown',
        options: {
          off: 'Off',
          static: 'Static / 固定',
          dynamic: 'Dynamic / 动态响应',
        },
        onChange: (v) => this.changeMode(ctx, v as ZenMode),
      },
      {
        section: SECTION,
        name: 'Zen Opacity / 禅模式透明度',
        desc: 'Brightness of dimmed lines (lower = darker)',
        key: 'zenOpacity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 5,
        toSlider: (v) => v * 100,
        fromSlider: (v) => v / 100,
        onChange: (v) => {
          ctx.settings.zenOpacity = v;
          this.zenMode.setOpacity(v);
          void ctx.save();
        },
      },
    ];
  }

  private changeMode(ctx: ModuleContext, mode: ZenMode): void {
    // Tear down current mode
    if (ctx.settings.zenMode === 'dynamic') {
      this.velocityZen.disable();
      this.zenMode.setDynamic(false);
    }
    if (ctx.settings.zenMode !== 'off') {
      this.zenMode.disable();
    }

    ctx.settings.zenMode = mode;

    if (mode === 'static') {
      this.zenMode.enable();
      this.zenMode.setOpacity(ctx.settings.zenOpacity);
    } else if (mode === 'dynamic') {
      this.zenMode.enable();
      this.zenMode.setDynamic(true);
      this.velocityZen.enable();
    }
    void ctx.save();
    ctx.refreshStatusBar();
  }
}
