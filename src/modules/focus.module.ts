/**
 * Focus Mode module — dim lines outside the current semantic range.
 *
 * Owns the focus-mode CM6 compartment: mode changes are dispatched to every
 * open markdown editor as compartment reconfigurations.
 */

import {Compartment} from '@codemirror/state';
import type {Extension} from '@codemirror/state';
import type {Command, MarkdownView} from 'obsidian';
import {buildFocusExtensions, type FocusMode} from '../engine/focus-mode';
import {getCmView, setBodyCSS} from '../ui/helpers';
import {applyCssSetting} from './apply-setting';
import type {
  FeatureModule,
  ModuleContext,
  SettingRow,
  StatusBarPart,
} from './types';

const SECTION = 'Focus & Zen / 专注模式';
const FOCUS_MODES: readonly FocusMode[] = [
  'off',
  'line',
  'paragraph',
  'heading',
  'sentence',
];
const FOCUS_STATUS: Record<string, StatusBarPart> = {
  line: {abbr: 'FL', fullName: 'Focus: Line'},
  paragraph: {abbr: 'FP', fullName: 'Focus: Paragraph'},
  heading: {abbr: 'FH', fullName: 'Focus: Heading'},
  sentence: {abbr: 'FS', fullName: 'Focus: Sentence'},
};

export class FocusModule implements FeatureModule {
  readonly id = 'focus';
  readonly settingOrder = 30;
  private readonly compartment = new Compartment();

  initialEditorExtensions(): Extension[] {
    return [this.compartment.of([])];
  }

  syncFromSettings(ctx: ModuleContext): void {
    const mode = ctx.settings.focusMode;
    if (mode !== 'off') {
      document.body.classList.add('plugin-tf-focus');
    } else {
      document.body.classList.remove('plugin-tf-focus');
    }
    this.dispatch(ctx, mode);
    // Always set focus opacity CSS variable (even when mode is off, for consistency)
    setBodyCSS('--focus-opacity', String(ctx.settings.focusOpacity));
  }

  teardown(ctx: ModuleContext): void {
    document.body.classList.remove('plugin-tf-focus');
    this.dispatch(ctx, 'off');
  }

  commands(ctx: ModuleContext): Command[] {
    return [
      {
        id: 'cycle-focus-mode',
        name: 'Cycle Focus Mode (off → line → paragraph → heading → sentence)',
        callback: () => {
          const idx = FOCUS_MODES.indexOf(ctx.settings.focusMode);
          const next = FOCUS_MODES[(idx + 1) % FOCUS_MODES.length];
          this.changeMode(ctx, next);
        },
      },
      {
        id: 'focus-mode-off',
        name: 'Turn Off Focus Mode',
        callback: () => this.changeMode(ctx, 'off'),
      },
    ];
  }

  statusBarContribution(ctx: ModuleContext): StatusBarPart | null {
    const mode = ctx.settings.focusMode;
    if (mode === 'off') return null;
    return FOCUS_STATUS[mode] ?? {abbr: 'F', fullName: 'Focus'};
  }

  settingRows(ctx: ModuleContext): SettingRow[] {
    return [
      {
        section: SECTION,
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
        onChange: (v) => this.changeMode(ctx, v as FocusMode),
      },
      {
        section: SECTION,
        name: 'Focus Dimming / 聚焦虚化',
        desc: 'Opacity of dimmed lines outside focus range (lower = darker)',
        key: 'focusOpacity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 5,
        toSlider: (v) => v * 100,
        fromSlider: (v) => v / 100,
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'focusOpacity',
            v,
            '--focus-opacity',
            'focusMode',
          ),
      },
    ];
  }

  private changeMode(ctx: ModuleContext, mode: FocusMode): void {
    ctx.settings.focusMode = mode;
    ctx.refreshStatusBar();
    if (mode === 'off') {
      document.body.classList.remove('plugin-tf-focus');
    } else {
      document.body.classList.add('plugin-tf-focus');
    }
    this.dispatch(ctx, mode);
    void ctx.save();
  }

  private dispatch(ctx: ModuleContext, mode: FocusMode): void {
    const exts = buildFocusExtensions(mode);
    const leaves = ctx.app.workspace.getLeavesOfType('markdown');
    for (const leaf of leaves) {
      const view = leaf.view as MarkdownView;
      const cm = getCmView(view);
      if (cm) {
        cm.dispatch({effects: this.compartment.reconfigure(exts)});
      }
    }
  }
}
