/**
 * Typewriter Scroll module — keep the cursor at a fixed vertical position.
 *
 * Owns the typewriter CM6 compartment and the layout-change listener that
 * rebuilds extensions when the workspace layout changes (sidebar toggle,
 * split pane, ...). The listener is registered only while the feature is
 * enabled — previously it stayed registered after toggling off and would
 * resurrect the extensions on the next layout change.
 */

import {Compartment} from '@codemirror/state';
import type {Extension} from '@codemirror/state';
import type {Command, EventRef, MarkdownView} from 'obsidian';
import {buildTypewriterExtensions} from '../engine/typewriter';
import {getCmView} from '../ui/helpers';
import type {
  FeatureModule,
  ModuleContext,
  SettingRow,
  StatusBarPart,
} from './types';

const SECTION = 'Typewriter Scroll / 打字机滚动';

export class TypewriterModule implements FeatureModule {
  readonly id = 'typewriter';
  readonly settingOrder = 10;
  private readonly compartment = new Compartment();
  private layoutEventRef: EventRef | null = null;
  private layoutRaf = 0;

  initialEditorExtensions(): Extension[] {
    return [this.compartment.of([])];
  }

  syncFromSettings(ctx: ModuleContext): void {
    if (ctx.settings.enabled) {
      document.body.classList.add('plugin-cm-typewriter-scroll');
      this.dispatch(ctx, buildTypewriterExtensions(ctx.settings));
      this.registerLayoutChange(ctx);
    } else {
      this.doDisable(ctx);
    }
  }

  teardown(ctx: ModuleContext): void {
    this.doDisable(ctx);
    cancelAnimationFrame(this.layoutRaf);
  }

  commands(ctx: ModuleContext): Command[] {
    return [
      {
        id: 'toggle-typewriter-scroll',
        name: 'Toggle Typewriter Scrolling On/Off',
        callback: () => this.toggle(ctx),
      },
    ];
  }

  statusBarContribution(ctx: ModuleContext): StatusBarPart | null {
    return ctx.settings.enabled
      ? {abbr: 'TW', fullName: 'Typewriter Scrolling'}
      : null;
  }

  settingRows(ctx: ModuleContext): SettingRow[] {
    return [
      {
        section: SECTION,
        name: 'Toggle Typewriter Scrolling',
        desc: 'Enable or disable typewriter scrolling',
        key: 'enabled',
        type: 'toggle',
        onChange: (v) => this.toggle(ctx, v),
      },
      {
        section: SECTION,
        name: 'Center offset / 居中偏移',
        desc: 'Cursor position as % of screen height (50 = center)',
        key: 'typewriterOffset',
        type: 'slider',
        min: 0,
        max: 100,
        step: 5,
        toSlider: (v) => v * 100,
        fromSlider: (v) => v / 100,
        onChange: (v) => {
          ctx.settings.typewriterOffset = v;
          this.reconfigure(ctx);
        },
      },
      {
        section: SECTION,
        name: 'Dead Zone / 死区',
        desc: 'Lines to move before re-centering (prevents jitter)',
        key: 'deadZone',
        type: 'slider',
        min: 0,
        max: 10,
        step: 1,
        onChange: (v) => {
          ctx.settings.deadZone = v;
          this.reconfigure(ctx);
        },
      },
      {
        section: SECTION,
        name: 'Scroll Suspension / 滚动暂停',
        desc: 'Pause auto-center on manual scroll, resume on typing',
        key: 'suspensionEnabled',
        type: 'toggle',
        onChange: (v) => {
          ctx.settings.suspensionEnabled = v;
          this.reconfigure(ctx);
        },
      },
      {
        section: SECTION,
        name: 'Smooth Scroll / 平滑滚动',
        desc: 'Animate scroll to cursor position',
        key: 'smoothScrollEnabled',
        type: 'toggle',
        onChange: (v) => {
          ctx.settings.smoothScrollEnabled = v;
          this.reconfigure(ctx);
        },
      },
      {
        section: SECTION,
        name: 'Smart Offset / 智能偏移',
        desc: 'Adjust position for headings and empty lines',
        key: 'smartOffsetEnabled',
        type: 'toggle',
        onChange: (v) => {
          ctx.settings.smartOffsetEnabled = v;
          this.reconfigure(ctx);
        },
      },
    ];
  }

  /**
   * Rebuild extensions and dispatch to all open editors.
   * Called by other modules through ctx.rebuildTypewriter()
   * (e.g. after grid auto-calibration changed line-height constants).
   */
  rebuild(ctx: ModuleContext): void {
    if (!ctx.settings.enabled) return;
    this.dispatch(ctx, buildTypewriterExtensions(ctx.settings));
  }

  private toggle(ctx: ModuleContext, newValue: boolean | null = null): void {
    if (newValue === null) newValue = !ctx.settings.enabled;
    ctx.settings.enabled = newValue;
    ctx.refreshStatusBar();
    if (newValue) {
      document.body.classList.add('plugin-cm-typewriter-scroll');
      this.dispatch(ctx, buildTypewriterExtensions(ctx.settings));
      this.registerLayoutChange(ctx);
    } else {
      this.doDisable(ctx);
    }
    void ctx.save();
  }

  private doDisable(ctx: ModuleContext): void {
    document.body.classList.remove('plugin-cm-typewriter-scroll');
    this.unregisterLayoutChange(ctx);
    this.dispatch(ctx, []);

    // Clean up padding styles
    const leaves = ctx.app.workspace.getLeavesOfType('markdown');
    for (const leaf of leaves) {
      const view = leaf.view as MarkdownView;
      const cm = getCmView(view);
      if (cm) {
        cm.contentDOM.style.paddingTop = '';
        cm.contentDOM.style.paddingBottom = '';
      }
    }
  }

  private reconfigure(ctx: ModuleContext): void {
    if (!ctx.settings.enabled) {
      void ctx.save();
      return;
    }
    this.dispatch(ctx, buildTypewriterExtensions(ctx.settings));
    void ctx.save();
  }

  private dispatch(ctx: ModuleContext, extensions: Extension[]): void {
    const leaves = ctx.app.workspace.getLeavesOfType('markdown');
    for (const leaf of leaves) {
      const view = leaf.view as MarkdownView;
      const cm = getCmView(view);
      if (cm) {
        cm.dispatch({effects: this.compartment.reconfigure(extensions)});
      }
    }
  }

  private registerLayoutChange(ctx: ModuleContext): void {
    if (this.layoutEventRef) return;
    this.layoutEventRef = ctx.app.workspace.on('layout-change', () => {
      cancelAnimationFrame(this.layoutRaf);
      this.layoutRaf = requestAnimationFrame(() => {
        this.dispatch(ctx, buildTypewriterExtensions(ctx.settings));
      });
    });
    ctx.plugin.registerEvent(this.layoutEventRef);
  }

  private unregisterLayoutChange(ctx: ModuleContext): void {
    if (this.layoutEventRef) {
      ctx.app.workspace.offref(this.layoutEventRef);
      this.layoutEventRef = null;
    }
  }
}
