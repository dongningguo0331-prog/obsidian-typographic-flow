/**
 * Registry aggregation tests — verify that the module registry correctly
 * merges commands, settings rows, and status bar parts from all modules,
 * and that the aggregated output matches the pre-refactor surface area.
 *
 * Only DOM-free module APIs are exercised (commands/settingRows/statusBar
 * contributions); lifecycle methods that touch the DOM are covered by the
 * existing engine tests and manual smoke testing.
 */

import {describe, expect, it} from 'vitest';
import type {App} from 'obsidian';
import type TypographicFlowPlugin from '../../src/main';
import {DEFAULT_SETTINGS, type PluginSettings} from '../../src/settings';
import {createModuleRegistry} from '../../src/modules/registry';
import type {FeatureModule, ModuleContext} from '../../src/modules/types';
import {CursorRestoreModule} from '../../src/modules/cursor-restore.module';
import {TypewriterModule} from '../../src/modules/typewriter.module';
import {ZenModule} from '../../src/modules/zen.module';
import {FocusModule} from '../../src/modules/focus.module';
import {CursorFxModule} from '../../src/modules/cursor-fx.module';
import {FlowStateModule} from '../../src/modules/flow-state.module';
import {ColorsModule} from '../../src/modules/colors.module';
import {GridModule} from '../../src/modules/grid.module';
import {CjkModule} from '../../src/modules/cjk.module';
import {FullscreenModule} from '../../src/modules/fullscreen.module';

function freshSettings(overrides: Partial<PluginSettings> = {}): PluginSettings {
  return {...DEFAULT_SETTINGS, cursorPositions: {}, ...overrides};
}

function createTestContext(settings: PluginSettings): ModuleContext {
  return {
    app: {} as App,
    plugin: {} as TypographicFlowPlugin,
    settings,
    save: async () => {},
    refreshStatusBar: () => {},
    rebuildTypewriter: () => {},
  };
}

/** Same order as main.ts: dependency order (cursor-restore before typewriter). */
function createModules(): FeatureModule[] {
  const app = {} as App;
  return [
    new CursorRestoreModule(app),
    new TypewriterModule(),
    new ZenModule(),
    new FocusModule(),
    new CursorFxModule(),
    new FlowStateModule(),
    new ColorsModule(),
    new GridModule(),
    new CjkModule(),
    new FullscreenModule(app),
  ];
}

describe('module registry', () => {
  it('aggregates all 15 commands with unique ids', () => {
    const ctx = createTestContext(freshSettings());
    const registry = createModuleRegistry(createModules());
    const commands = registry.allCommands(ctx);
    const ids = commands.map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(15);
    expect(ids).toEqual(
      expect.arrayContaining([
        'toggle-typewriter-scroll',
        'toggle-zen-mode',
        'cycle-focus-mode',
        'focus-mode-off',
        'toggle-colors',
        'toggle-grid',
        'toggle-grid-lines',
        'toggle-cjk-prose',
        'toggle-cjk-indent',
        'toggle-cjk-justify',
        'toggle-breathing-cursor',
        'toggle-strikethrough-anim',
        'toggle-fullscreen-mode',
        'toggle-fullscreen-header',
        'toggle-fullscreen-status-bar',
      ]),
    );
  });

  it('aggregates 41 setting rows with sections in stable UI order', () => {
    const ctx = createTestContext(freshSettings());
    const registry = createModuleRegistry(createModules());
    const rows = registry.allSettingRows(ctx);

    expect(rows).toHaveLength(41);

    const sections = [...new Set(rows.map((r) => r.section))];
    expect(sections).toEqual([
      'Typewriter Scroll / 打字机滚动',
      'Focus & Zen / 专注模式',
      'Cursor & Animation / 光标与动画',
      'Typography / 排版',
      'Colors / 配色',
      'Fullscreen / 全屏模式',
    ]);
  });

  it('keeps every settings row wired to a distinct settings key within its row', () => {
    const ctx = createTestContext(freshSettings());
    const registry = createModuleRegistry(createModules());
    const rows = registry.allSettingRows(ctx);

    // 41 rows but some keys repeat? No — every row maps to a unique key.
    const keys = rows.map((r) => r.key as string);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('modules declare unique settingOrder hints', () => {
    const orders = createModules().map((m) => m.settingOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('provides initial editor extension containers for the two compartment modules', () => {
    const registry = createModuleRegistry(createModules());
    expect(registry.initialEditorExtensions()).toHaveLength(2);
  });

  it('status bar shows TW·G under default settings', () => {
    const registry = createModuleRegistry(createModules());
    const ctx = createTestContext(freshSettings());
    expect(registry.statusBarParts(ctx).map((p) => p.abbr)).toEqual([
      'TW',
      'G',
    ]);
  });

  it('status bar aggregates active modules in fixed order with full names', () => {
    const registry = createModuleRegistry(createModules());
    const ctx = createTestContext(
      freshSettings({
        zenMode: 'static',
        focusMode: 'paragraph',
        colorsEnabled: true,
        cjkProseEnabled: true,
      }),
    );

    const parts = registry.statusBarParts(ctx);
    expect(parts.map((p) => p.abbr)).toEqual([
      'TW',
      'Z',
      'FP',
      'C',
      'G',
      'CJK',
    ]);
    expect(parts.map((p) => p.fullName)).toEqual([
      'Typewriter Scrolling',
      'Zen Mode',
      'Focus: Paragraph',
      'Reading Colors',
      'Baseline Grid',
      'CJK Prose',
    ]);
  });

  it('status bar is empty when all status-contributing features are off', () => {
    const registry = createModuleRegistry(createModules());
    const ctx = createTestContext(
      freshSettings({enabled: false, gridEnabled: false}),
    );
    expect(registry.statusBarParts(ctx)).toEqual([]);
  });
});
