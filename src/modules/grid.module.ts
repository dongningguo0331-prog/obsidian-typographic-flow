/**
 * Baseline Grid module — align text to a vertical grid.
 *
 * Owns the grid body classes, CSS variables, and the auto-calibration
 * engine (font metric probe + debounced css-change listener). Calibration
 * notifies the typewriter module through ctx.rebuildTypewriter() instead of
 * reaching into main.ts internals.
 *
 * Event registration is idempotent: the css-change listener is registered
 * at most once and removed when auto-calibrate or the grid is turned off
 * (previously, listeners accumulated across reset-to-defaults).
 */

import type {Command, EventRef, MarkdownView} from 'obsidian';
import {getCmView, removeBodyCSS, setBodyCSS} from '../ui/helpers';
import {applyCssSetting} from './apply-setting';
import type {
  FeatureModule,
  ModuleContext,
  SettingRow,
  StatusBarPart,
} from './types';

const SECTION = 'Typography / 排版';
const GRID_VARS = [
  '--grid-unit',
  '--grid-offset-y',
  '--grid-line-opacity-light',
  '--grid-line-opacity-dark',
  '--grid-radius-coef',
] as const;

export class GridModule implements FeatureModule {
  readonly id = 'grid';
  readonly settingOrder = 60;

  private calibrateTimer = 0;
  private cssChangeRef: EventRef | null = null;

  syncFromSettings(ctx: ModuleContext): void {
    if (ctx.settings.gridEnabled) {
      this.enableGrid(ctx);
    } else {
      this.disableGrid();
    }
    this.updateCssChangeRegistration(ctx);
    if (ctx.settings.gridAutoCalibrate && ctx.settings.gridEnabled) {
      // Runs once on load (onLayoutReady fires immediately when the
      // layout is already ready, e.g. after reset-to-defaults).
      ctx.app.workspace.onLayoutReady(() => this.autoCalibrateGrid(ctx));
    }
  }

  teardown(ctx: ModuleContext): void {
    this.disableGrid();
    this.unregisterCssChange(ctx);
    window.clearTimeout(this.calibrateTimer);
  }

  commands(ctx: ModuleContext): Command[] {
    return [
      {
        id: 'toggle-grid',
        name: 'Toggle Baseline Grid On/Off',
        callback: () => this.toggleGrid(ctx),
      },
      {
        id: 'toggle-grid-lines',
        name: 'Toggle Baseline Grid Lines On/Off',
        callback: () => this.toggleGridLines(ctx),
      },
    ];
  }

  statusBarContribution(ctx: ModuleContext): StatusBarPart | null {
    return ctx.settings.gridEnabled
      ? {abbr: 'G', fullName: 'Baseline Grid'}
      : null;
  }

  settingRows(ctx: ModuleContext): SettingRow[] {
    return [
      {
        section: SECTION,
        name: 'Enable Baseline Grid / 基线网格',
        desc: 'Align text to a vertical grid for consistent spacing',
        key: 'gridEnabled',
        type: 'toggle',
        onChange: (v) => this.toggleGrid(ctx, v),
      },
      {
        section: SECTION,
        name: 'Show Grid Lines / 显示网格线',
        desc: 'Show grid lines (layout stays active when off)',
        key: 'gridShowLines',
        type: 'toggle',
        onChange: (v) => this.toggleGridLines(ctx, v),
      },
      {
        section: SECTION,
        name: 'Grid Unit / 网格模数',
        desc: 'Base unit for grid spacing (px)',
        key: 'gridUnit',
        type: 'slider',
        min: 10,
        max: 20,
        step: 1,
        disabledWhen: (s) => s.gridAutoCalibrate,
        dynamicName: (s) =>
          s.gridAutoCalibrate
            ? `Grid Unit / 网格模数 (Auto: ${s.gridUnit}px)`
            : 'Grid Unit / 网格模数',
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'gridUnit',
            v,
            '--grid-unit',
            'gridEnabled',
            'px',
          ),
      },
      {
        section: SECTION,
        name: 'Y-axis Offset / Y轴偏移',
        desc: 'Vertical offset of grid lines (px)',
        key: 'gridOffsetY',
        type: 'slider',
        min: 20,
        max: 40,
        step: 1,
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'gridOffsetY',
            v,
            '--grid-offset-y',
            'gridEnabled',
            'px',
          ),
      },
      {
        section: SECTION,
        name: 'Grid Line Opacity (Light) / 浅色模式透明度',
        desc: 'Grid line brightness in light mode',
        key: 'gridLineOpacityLight',
        type: 'slider',
        min: 0,
        max: 0.15,
        step: 0.005,
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'gridLineOpacityLight',
            v,
            '--grid-line-opacity-light',
            'gridEnabled',
          ),
      },
      {
        section: SECTION,
        name: 'Grid Line Opacity (Dark) / 深色模式透明度',
        desc: 'Grid line brightness in dark mode',
        key: 'gridLineOpacityDark',
        type: 'slider',
        min: 0,
        max: 0.15,
        step: 0.005,
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'gridLineOpacityDark',
            v,
            '--grid-line-opacity-dark',
            'gridEnabled',
          ),
      },
      {
        section: SECTION,
        name: 'Corner Radius Coefficient / 圆角系数',
        desc: 'Roundness of corners (0 = sharp)',
        key: 'gridRadiusCoef',
        type: 'slider',
        min: 0,
        max: 1,
        step: 0.05,
        onChange: (v) =>
          applyCssSetting(
            ctx,
            'gridRadiusCoef',
            v,
            '--grid-radius-coef',
            'gridEnabled',
          ),
      },
      {
        section: SECTION,
        name: 'Auto Calibrate / 自动校准',
        desc: 'Measure theme font metrics and auto-compute optimal grid unit. Slider becomes read-only when enabled.',
        key: 'gridAutoCalibrate',
        type: 'toggle',
        onChange: (v) => this.changeAutoCalibrate(ctx, v),
      },
    ];
  }

  // ── Toggles ──

  private toggleGrid(ctx: ModuleContext, newValue: boolean | null = null) {
    if (newValue === null) newValue = !ctx.settings.gridEnabled;
    ctx.settings.gridEnabled = newValue;
    ctx.refreshStatusBar();
    if (newValue) {
      this.enableGrid(ctx);
    } else {
      this.disableGrid();
    }
    this.updateCssChangeRegistration(ctx);
    void ctx.save();
  }

  private toggleGridLines(ctx: ModuleContext, newValue: boolean | null = null) {
    if (newValue === null) newValue = !ctx.settings.gridShowLines;
    ctx.settings.gridShowLines = newValue;
    if (newValue) {
      document.body.classList.add('plugin-tf-grid-visible');
    } else {
      document.body.classList.remove('plugin-tf-grid-visible');
    }
    void ctx.save();
  }

  private enableGrid(ctx: ModuleContext): void {
    document.body.classList.add('plugin-tf-grid');
    if (ctx.settings.gridShowLines) {
      document.body.classList.add('plugin-tf-grid-visible');
    }
    this.applyGridSettings(ctx);
    if (ctx.settings.gridAutoCalibrate) {
      this.debouncedCalibrate(ctx);
    }
  }

  private disableGrid(): void {
    document.body.classList.remove('plugin-tf-grid', 'plugin-tf-grid-visible');
    for (const key of GRID_VARS) {
      removeBodyCSS(key);
    }
  }

  private applyGridSettings(ctx: ModuleContext): void {
    setBodyCSS('--grid-unit', String(ctx.settings.gridUnit) + 'px');
    setBodyCSS('--grid-offset-y', String(ctx.settings.gridOffsetY) + 'px');
    setBodyCSS(
      '--grid-line-opacity-light',
      String(ctx.settings.gridLineOpacityLight),
    );
    setBodyCSS(
      '--grid-line-opacity-dark',
      String(ctx.settings.gridLineOpacityDark),
    );
    setBodyCSS('--grid-radius-coef', String(ctx.settings.gridRadiusCoef));
  }

  // ── Auto-calibration ──

  private changeAutoCalibrate(ctx: ModuleContext, v: boolean): void {
    ctx.settings.gridAutoCalibrate = v;
    this.updateCssChangeRegistration(ctx);
    if (v && ctx.settings.gridEnabled) {
      this.autoCalibrateGrid(ctx);
    }
    void ctx.save();
  }

  /** Register/unregister the css-change listener to match current settings. */
  private updateCssChangeRegistration(ctx: ModuleContext): void {
    const wanted = ctx.settings.gridAutoCalibrate && ctx.settings.gridEnabled;
    if (wanted && !this.cssChangeRef) {
      this.cssChangeRef = ctx.app.workspace.on('css-change', () => {
        this.debouncedCalibrate(ctx);
      });
      ctx.plugin.registerEvent(this.cssChangeRef);
    } else if (!wanted) {
      this.unregisterCssChange(ctx);
    }
  }

  private unregisterCssChange(ctx: ModuleContext): void {
    if (this.cssChangeRef) {
      ctx.app.workspace.offref(this.cssChangeRef);
      this.cssChangeRef = null;
    }
  }

  private debouncedCalibrate(ctx: ModuleContext): void {
    window.clearTimeout(this.calibrateTimer);
    this.calibrateTimer = window.setTimeout(() => {
      this.autoCalibrateGrid(ctx);
    }, 500);
  }

  private measureNaturalLineHeight(ctx: ModuleContext): number | null {
    const leaf = ctx.app.workspace.activeLeaf;
    if (!leaf?.view || leaf.view.getViewType() !== 'markdown') return null;
    const view = leaf.view as MarkdownView;
    const cm = getCmView(view);
    if (!cm) return null;

    const computed = window.getComputedStyle(cm.dom);

    // Create a hidden probe that inherits the editor's font but lives outside
    // the .plugin-tf-grid scope, so it is NOT affected by the grid's
    // line-height: !important override.
    const probe = document.createElement('span');
    probe.textContent = 'AaAg中文字体';
    probe.style.fontFamily = computed.fontFamily;
    probe.style.fontSize = computed.fontSize;
    probe.style.fontWeight = computed.fontWeight;
    probe.style.letterSpacing = computed.letterSpacing;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.whiteSpace = 'nowrap';
    probe.style.lineHeight = 'normal';
    document.body.appendChild(probe);

    const height = probe.offsetHeight;
    probe.remove();
    return height > 0 ? height : null;
  }

  private autoCalibrateGrid(ctx: ModuleContext): void {
    if (!ctx.settings.gridAutoCalibrate || !ctx.settings.gridEnabled) return;

    const naturalLH = this.measureNaturalLineHeight(ctx);
    if (!naturalLH || naturalLH <= 0) return;

    // gridUnit = naturalLH / 3 (because lh-normal = gridUnit * 3)
    let gridUnit = Math.round(naturalLH / 3);

    // Snap to even values for clean pixel alignment
    gridUnit = Math.round(gridUnit / 2) * 2;

    // Clamp to valid range
    gridUnit = Math.max(10, Math.min(20, gridUnit));

    // Apply via existing CSS variable path
    ctx.settings.gridUnit = gridUnit;
    setBodyCSS('--grid-unit', gridUnit + 'px');
    void ctx.save();

    // Force typewriter engine to re-read typography constants
    ctx.rebuildTypewriter();
  }
}
