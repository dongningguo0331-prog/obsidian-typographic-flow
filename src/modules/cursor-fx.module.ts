/**
 * Cursor FX module — breathing cursor + strikethrough animation.
 *
 * Two small visual-effect managers that toggle body classes and CSS
 * variables; both honor prefers-reduced-motion via styles.css.
 */

import type {Command} from 'obsidian';
import {BreathingCursorManager} from '../engine/breathing-cursor';
import {StrikethroughAnimManager} from '../engine/strikethrough-anim';
import {applyCssSetting} from './apply-setting';
import type {FeatureModule, ModuleContext, SettingRow} from './types';

const SECTION = 'Cursor & Animation / 光标与动画';

export class CursorFxModule implements FeatureModule {
  readonly id = 'cursor-fx';
  readonly settingOrder = 40;
  private readonly breathe = new BreathingCursorManager();
  private readonly strike = new StrikethroughAnimManager();

  syncFromSettings(ctx: ModuleContext): void {
    if (ctx.settings.breatheEnabled) {
      this.breathe.setDuration(ctx.settings.breatheDuration);
      this.breathe.setMinOpacity(ctx.settings.breatheMinOpacity);
      this.breathe.enable();
    } else {
      this.breathe.disable();
    }

    if (ctx.settings.strikeAnimEnabled) {
      this.strike.setDuration(ctx.settings.strikeAnimDuration);
      this.strike.enable();
    } else {
      this.strike.disable();
    }
  }

  teardown(_ctx: ModuleContext): void {
    this.breathe.destroy();
    this.strike.destroy();
  }

  commands(ctx: ModuleContext): Command[] {
    return [
      {
        id: 'toggle-breathing-cursor',
        name: 'Toggle Breathing Cursor On/Off',
        callback: () => this.toggleBreathe(ctx),
      },
      {
        id: 'toggle-strikethrough-anim',
        name: 'Toggle Strikethrough Animation On/Off',
        callback: () => this.toggleStrikeAnim(ctx),
      },
    ];
  }

  settingRows(ctx: ModuleContext): SettingRow[] {
    return [
      {
        section: SECTION,
        name: 'Enable Breathing Cursor / 呼吸光标',
        desc: 'Smooth fade cycle instead of binary blink',
        key: 'breatheEnabled',
        type: 'toggle',
        onChange: (v) => this.toggleBreathe(ctx, v),
      },
      {
        section: SECTION,
        name: 'Breath Duration / 呼吸周期',
        desc: 'Speed of one breath cycle (seconds)',
        key: 'breatheDuration',
        type: 'slider',
        min: 2,
        max: 8,
        step: 0.5,
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'breatheDuration',
            v,
            '--tf-breathe-duration',
            'breatheEnabled',
            's',
          ),
      },
      {
        section: SECTION,
        name: 'Minimum Opacity / 最低透明度',
        desc: 'Lowest brightness in breath cycle',
        key: 'breatheMinOpacity',
        type: 'slider',
        min: 0.1,
        max: 0.8,
        step: 0.05,
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'breatheMinOpacity',
            v,
            '--tf-breathe-min-opacity',
            'breatheEnabled',
          ),
      },
      {
        section: SECTION,
        name: 'Enable Strikethrough Animation / 删除线动画',
        desc: 'Animate ~~strikethrough~~ from left to right',
        key: 'strikeAnimEnabled',
        type: 'toggle',
        onChange: (v) => this.toggleStrikeAnim(ctx, v),
      },
      {
        section: SECTION,
        name: 'Reveal Duration / 动画时长',
        desc: 'Speed of strikethrough animation (seconds)',
        key: 'strikeAnimDuration',
        type: 'slider',
        min: 0.1,
        max: 0.8,
        step: 0.05,
        onChange: (v) => {
          ctx.settings.strikeAnimDuration = v;
          if (ctx.settings.strikeAnimEnabled) this.strike.setDuration(v);
          void ctx.save();
        },
      },
    ];
  }

  private toggleBreathe(
    ctx: ModuleContext,
    newValue: boolean | null = null,
  ): void {
    if (newValue === null) newValue = !ctx.settings.breatheEnabled;
    ctx.settings.breatheEnabled = newValue;
    ctx.refreshStatusBar();
    if (newValue) {
      this.breathe.setDuration(ctx.settings.breatheDuration);
      this.breathe.setMinOpacity(ctx.settings.breatheMinOpacity);
      this.breathe.enable();
    } else {
      this.breathe.disable();
    }
    void ctx.save();
  }

  private toggleStrikeAnim(
    ctx: ModuleContext,
    newValue: boolean | null = null,
  ): void {
    if (newValue === null) newValue = !ctx.settings.strikeAnimEnabled;
    ctx.settings.strikeAnimEnabled = newValue;
    ctx.refreshStatusBar();
    if (newValue) {
      this.strike.enable();
    } else {
      this.strike.disable();
    }
    this.strike.setDuration(ctx.settings.strikeAnimDuration);
    void ctx.save();
  }
}
