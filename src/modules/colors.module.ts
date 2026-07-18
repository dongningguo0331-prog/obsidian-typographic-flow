/**
 * Reading Colors module — oklch-based zen reading palette.
 *
 * Pure CSS module: toggles body.plugin-tf-colors and pushes the four
 * adjustment sliders into CSS custom properties consumed by styles.css.
 */

import type {Command} from 'obsidian';
import {removeBodyCSS, setBodyCSS} from '../ui/helpers';
import {applyCssSetting} from './apply-setting';
import type {
  FeatureModule,
  ModuleContext,
  SettingRow,
  StatusBarPart,
} from './types';

const SECTION = 'Colors / 配色';
const COLOR_VARS = [
  '--accent-hue',
  '--accent-sat-adjust',
  '--bg-warmth',
  '--text-contrast',
] as const;

export class ColorsModule implements FeatureModule {
  readonly id = 'colors';
  readonly settingOrder = 90;

  syncFromSettings(ctx: ModuleContext): void {
    if (ctx.settings.colorsEnabled) {
      document.body.classList.add('plugin-tf-colors');
      this.applySettings(ctx);
    } else {
      this.disable();
    }
  }

  teardown(_ctx: ModuleContext): void {
    this.disable();
  }

  commands(ctx: ModuleContext): Command[] {
    return [
      {
        id: 'toggle-colors',
        name: 'Toggle Reading Colors On/Off',
        callback: () => this.toggle(ctx),
      },
    ];
  }

  statusBarContribution(ctx: ModuleContext): StatusBarPart | null {
    return ctx.settings.colorsEnabled
      ? {abbr: 'C', fullName: 'Reading Colors'}
      : null;
  }

  settingRows(ctx: ModuleContext): SettingRow[] {
    return [
      {
        section: SECTION,
        name: 'Enable Reading Colors / 阅读配色',
        desc: 'Apply zen reading color palette',
        key: 'colorsEnabled',
        type: 'toggle',
        onChange: (v) => this.toggle(ctx, v),
      },
      {
        section: SECTION,
        name: 'Accent Hue Shift / 强调色色相',
        desc: 'Shift accent color (0 = green, + = warm, − = cool)',
        key: 'colorsAccentHue',
        type: 'slider',
        min: -30,
        max: 30,
        step: 1,
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'colorsAccentHue',
            v,
            '--accent-hue',
            'colorsEnabled',
          ),
      },
      {
        section: SECTION,
        name: 'Accent Saturation / 强调色饱和度',
        desc: 'Accent color intensity',
        key: 'colorsAccentSat',
        type: 'slider',
        min: -30,
        max: 30,
        step: 1,
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'colorsAccentSat',
            v,
            '--accent-sat-adjust',
            'colorsEnabled',
          ),
      },
      {
        section: SECTION,
        name: 'Background Warmth / 背景暖度',
        desc: 'Background tone (0 = neutral)',
        key: 'colorsBgWarmth',
        type: 'slider',
        min: -10,
        max: 10,
        step: 1,
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'colorsBgWarmth',
            v,
            '--bg-warmth',
            'colorsEnabled',
          ),
      },
      {
        section: SECTION,
        name: 'Text Contrast / 文字对比度',
        desc: 'Text darkness/brightness',
        key: 'colorsTextContrast',
        type: 'slider',
        min: -15,
        max: 15,
        step: 1,
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'colorsTextContrast',
            v,
            '--text-contrast',
            'colorsEnabled',
          ),
      },
    ];
  }

  private toggle(ctx: ModuleContext, newValue: boolean | null = null): void {
    if (newValue === null) newValue = !ctx.settings.colorsEnabled;
    ctx.settings.colorsEnabled = newValue;
    ctx.refreshStatusBar();
    if (newValue) {
      document.body.classList.add('plugin-tf-colors');
      this.applySettings(ctx);
    } else {
      this.disable();
    }
    void ctx.save();
  }

  private applySettings(ctx: ModuleContext): void {
    setBodyCSS('--accent-hue', String(ctx.settings.colorsAccentHue));
    setBodyCSS('--accent-sat-adjust', String(ctx.settings.colorsAccentSat));
    setBodyCSS('--bg-warmth', String(ctx.settings.colorsBgWarmth));
    setBodyCSS('--text-contrast', String(ctx.settings.colorsTextContrast));
  }

  private disable(): void {
    document.body.classList.remove('plugin-tf-colors');
    for (const key of COLOR_VARS) {
      removeBodyCSS(key);
    }
  }
}
