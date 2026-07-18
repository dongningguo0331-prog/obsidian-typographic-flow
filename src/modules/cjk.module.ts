/**
 * CJK Prose module — Chinese/Japanese/Korean typography toggles.
 *
 * Pure body-class module (styles.css does the rendering work).
 * Justify and first-line indent imply the master prose switch: enabling
 * either one auto-enables CJK prose.
 */

import type {Command} from 'obsidian';
import type {
  FeatureModule,
  ModuleContext,
  SettingRow,
  StatusBarPart,
} from './types';

const SECTION = 'Typography / 排版';

export class CjkModule implements FeatureModule {
  readonly id = 'cjk';
  readonly settingOrder = 80;

  syncFromSettings(ctx: ModuleContext): void {
    if (ctx.settings.cjkProseEnabled) {
      this.enableProse(ctx);
    } else {
      this.disableProse();
    }
  }

  teardown(_ctx: ModuleContext): void {
    this.disableProse();
  }

  commands(ctx: ModuleContext): Command[] {
    return [
      {
        id: 'toggle-cjk-prose',
        name: 'Toggle CJK Prose Formatting On/Off',
        callback: () => this.toggleProse(ctx),
      },
      {
        id: 'toggle-cjk-indent',
        name: 'Toggle CJK First-line Indent On/Off',
        callback: () => this.toggleIndent(ctx),
      },
      {
        id: 'toggle-cjk-justify',
        name: 'Toggle CJK Justification On/Off',
        callback: () => this.toggleJustify(ctx),
      },
    ];
  }

  statusBarContribution(ctx: ModuleContext): StatusBarPart | null {
    return ctx.settings.cjkProseEnabled
      ? {abbr: 'CJK', fullName: 'CJK Prose'}
      : null;
  }

  settingRows(ctx: ModuleContext): SettingRow[] {
    return [
      {
        section: SECTION,
        name: 'Enable CJK Prose / 中文排版',
        desc: 'CJK typography: half-width punctuation + margin trim',
        key: 'cjkProseEnabled',
        type: 'toggle',
        onChange: (v) => this.toggleProse(ctx, v),
      },
      {
        section: SECTION,
        name: 'Justify Text / 两端对齐',
        desc: 'Justify text ⚠ May cause uneven spacing. Not compatible with long inline math ($...$)',
        key: 'cjkProseJustify',
        type: 'toggle',
        onChange: (v) => this.toggleJustify(ctx, v),
      },
      {
        section: SECTION,
        name: 'First-line Indent / 首行缩进',
        desc: 'Indent first line ⚠ Reading View only',
        key: 'cjkProseIndent',
        type: 'toggle',
        onChange: (v) => this.toggleIndent(ctx, v),
      },
    ];
  }

  private toggleProse(ctx: ModuleContext, newValue: boolean | null = null) {
    if (newValue === null) newValue = !ctx.settings.cjkProseEnabled;
    ctx.settings.cjkProseEnabled = newValue;
    ctx.refreshStatusBar();
    if (newValue) {
      this.enableProse(ctx);
    } else {
      this.disableProse();
    }
    void ctx.save();
  }

  private toggleJustify(ctx: ModuleContext, newValue: boolean | null = null) {
    if (newValue === null) newValue = !ctx.settings.cjkProseJustify;
    ctx.settings.cjkProseJustify = newValue;
    ctx.refreshStatusBar();
    if (newValue && !ctx.settings.cjkProseEnabled) this.toggleProse(ctx, true);
    if (newValue) {
      document.body.classList.add('plugin-tf-cjk-justify');
    } else {
      document.body.classList.remove('plugin-tf-cjk-justify');
    }
    void ctx.save();
  }

  private toggleIndent(ctx: ModuleContext, newValue: boolean | null = null) {
    if (newValue === null) newValue = !ctx.settings.cjkProseIndent;
    ctx.settings.cjkProseIndent = newValue;
    ctx.refreshStatusBar();
    if (newValue && !ctx.settings.cjkProseEnabled) this.toggleProse(ctx, true);
    if (newValue) {
      document.body.classList.add('plugin-tf-cjk-indent');
    } else {
      document.body.classList.remove('plugin-tf-cjk-indent');
    }
    void ctx.save();
  }

  private enableProse(ctx: ModuleContext): void {
    document.body.classList.add('plugin-tf-cjk-prose');
    if (ctx.settings.cjkProseJustify)
      document.body.classList.add('plugin-tf-cjk-justify');
    if (ctx.settings.cjkProseIndent)
      document.body.classList.add('plugin-tf-cjk-indent');
  }

  private disableProse(): void {
    document.body.classList.remove(
      'plugin-tf-cjk-prose',
      'plugin-tf-cjk-justify',
      'plugin-tf-cjk-indent',
    );
  }
}
