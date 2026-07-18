// @vitest-environment jsdom
/**
 * Module behavior tests — drive each module's sync/toggle/teardown against
 * a jsdom DOM and stubbed Obsidian workspace, verifying that the refactored
 * modules produce the same observable effects as the old main.ts methods:
 * body classes, CSS variables, CM6 dispatches, event registration, and
 * ViewPlugin singleton wiring.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {App} from 'obsidian';
import type TypographicFlowPlugin from '../../src/main';
import {DEFAULT_SETTINGS, type PluginSettings} from '../../src/settings';
import type {ModuleContext} from '../../src/modules/types';
import {TypewriterModule} from '../../src/modules/typewriter.module';
import {ZenModule} from '../../src/modules/zen.module';
import {FocusModule} from '../../src/modules/focus.module';
import {GridModule} from '../../src/modules/grid.module';
import {ColorsModule} from '../../src/modules/colors.module';
import {CjkModule} from '../../src/modules/cjk.module';
import {CursorFxModule} from '../../src/modules/cursor-fx.module';
import {CursorRestoreModule} from '../../src/modules/cursor-restore.module';
import {FlowStateModule} from '../../src/modules/flow-state.module';
import {FullscreenModule} from '../../src/modules/fullscreen.module';
import {getCursorRestoreForViewPlugin} from '../../src/engine/cursor-restore';
import {getFlowStateManager} from '../../src/engine/flow-state';

// ── Stubs ──

function makeWorkspace() {
  const cm = {
    dispatch: vi.fn(),
    contentDOM: document.createElement('div'),
  };
  const leaf = {view: {editor: {cm}}};
  const workspace = {
    getLeavesOfType: vi.fn(() => [leaf]),
    on: vi.fn((event: string, cb: unknown) => ({event, cb})),
    off: vi.fn(),
    offref: vi.fn(),
    onLayoutReady: vi.fn((cb: () => void) => cb()),
    activeLeaf: null,
  };
  return {workspace, cm};
}

function makeCtx(app: App, settings: PluginSettings): ModuleContext {
  const plugin = {registerEvent: vi.fn()} as unknown as TypographicFlowPlugin;
  return {
    app,
    plugin,
    settings,
    save: vi.fn(async () => {}),
    refreshStatusBar: vi.fn(),
    rebuildTypewriter: vi.fn(),
  };
}

function freshSettings(overrides: Partial<PluginSettings> = {}): PluginSettings {
  return {...DEFAULT_SETTINGS, cursorPositions: {}, ...overrides};
}

function bodyCssVar(name: string): string {
  return document.body.style.getPropertyValue(name);
}

beforeEach(() => {
  document.body.className = '';
  document.body.removeAttribute('style');
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  // Obsidian extends HTMLElement with addClass/removeClass; jsdom lacks them.
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.addClass ??= function (this: HTMLElement, cls: string) {
    this.classList.add(cls);
  };
  proto.removeClass ??= function (this: HTMLElement, cls: string) {
    this.classList.remove(cls);
  };
});

// ── Typewriter ──

describe('TypewriterModule', () => {
  it('sync(enabled) adds body class, dispatches extensions, registers layout-change once', () => {
    const {workspace, cm} = makeWorkspace();
    const app = {workspace} as unknown as App;
    const ctx = makeCtx(app, freshSettings());
    const mod = new TypewriterModule();

    mod.syncFromSettings(ctx);
    mod.syncFromSettings(ctx); // idempotency check

    expect(document.body.classList.contains('plugin-cm-typewriter-scroll')).toBe(true);
    expect(cm.dispatch).toHaveBeenCalled();
    const layoutRegistrations = workspace.on.mock.calls.filter(
      ([event]) => event === 'layout-change',
    );
    expect(layoutRegistrations).toHaveLength(1);

    mod.teardown(ctx);
  });

  it('teardown removes class, clears compartment, resets padding, unregisters listener', () => {
    const {workspace, cm} = makeWorkspace();
    const app = {workspace} as unknown as App;
    const ctx = makeCtx(app, freshSettings());
    const mod = new TypewriterModule();

    mod.syncFromSettings(ctx);
    cm.dispatch.mockClear();
    cm.contentDOM.style.paddingTop = '100px';

    mod.teardown(ctx);

    expect(document.body.classList.contains('plugin-cm-typewriter-scroll')).toBe(false);
    expect(cm.dispatch).toHaveBeenCalledTimes(1);
    expect(cm.contentDOM.style.paddingTop).toBe('');
    expect(workspace.offref).toHaveBeenCalled();
  });

  it('rebuild() does nothing while disabled (guards against grid re-activation)', () => {
    const {workspace, cm} = makeWorkspace();
    const app = {workspace} as unknown as App;
    const ctx = makeCtx(app, freshSettings({enabled: false}));
    const mod = new TypewriterModule();

    mod.syncFromSettings(ctx);
    cm.dispatch.mockClear();
    mod.rebuild(ctx);

    expect(cm.dispatch).not.toHaveBeenCalled();
  });
});

// ── Zen ──

describe('ZenModule', () => {
  it('sync(static) adds zen class and opacity style node', () => {
    const {workspace} = makeWorkspace();
    const ctx = makeCtx({workspace} as unknown as App, freshSettings({zenMode: 'static'}));
    const mod = new ZenModule();

    mod.syncFromSettings(ctx);

    expect(document.body.classList.contains('plugin-tf-zen')).toBe(true);
    const styleEl = document.head.querySelector('#plugin-tf-zen-opacity');
    expect(styleEl?.textContent).toContain('--zen-opacity');

    mod.teardown(ctx);
    expect(document.head.querySelector('#plugin-tf-zen-opacity')).toBeNull();
    expect(document.body.classList.contains('plugin-tf-zen')).toBe(false);
  });

  it('mode cycle off → dynamic adds dynamic class; back to off clears all', () => {
    const {workspace} = makeWorkspace();
    const settings = freshSettings({zenMode: 'off'});
    const ctx = makeCtx({workspace} as unknown as App, settings);
    const mod = new ZenModule();
    mod.syncFromSettings(ctx);

    // Simulate the command cycle: off → static → dynamic → off
    settings.zenMode = 'dynamic';
    mod.syncFromSettings(ctx);
    expect(document.body.classList.contains('plugin-tf-zen-dynamic')).toBe(true);

    settings.zenMode = 'off';
    mod.syncFromSettings(ctx);
    expect(document.body.classList.contains('plugin-tf-zen')).toBe(false);
    expect(document.body.classList.contains('plugin-tf-zen-dynamic')).toBe(false);

    mod.teardown(ctx);
  });
});

// ── Focus ──

describe('FocusModule', () => {
  it('sync(paragraph) adds body class and dispatches; off clears both', () => {
    const {workspace, cm} = makeWorkspace();
    const app = {workspace} as unknown as App;
    const ctx = makeCtx(app, freshSettings({focusMode: 'paragraph'}));
    const mod = new FocusModule();

    mod.syncFromSettings(ctx);
    expect(document.body.classList.contains('plugin-tf-focus')).toBe(true);
    expect(cm.dispatch).toHaveBeenCalled();
    expect(bodyCssVar('--focus-opacity')).toBe('0.25');

    mod.teardown(ctx);
    expect(document.body.classList.contains('plugin-tf-focus')).toBe(false);
  });
});

// ── Grid ──

describe('GridModule', () => {
  it('sync(enabled) adds classes and CSS variables; teardown removes them', () => {
    const {workspace} = makeWorkspace();
    const app = {workspace} as unknown as App;
    const ctx = makeCtx(app, freshSettings());
    const mod = new GridModule();

    mod.syncFromSettings(ctx);
    expect(document.body.classList.contains('plugin-tf-grid')).toBe(true);
    expect(document.body.classList.contains('plugin-tf-grid-visible')).toBe(true);
    expect(bodyCssVar('--grid-unit')).toBe('16px');

    mod.teardown(ctx);
    expect(document.body.classList.contains('plugin-tf-grid')).toBe(false);
    expect(document.body.classList.contains('plugin-tf-grid-visible')).toBe(false);
    expect(bodyCssVar('--grid-unit')).toBe('');
  });

  it('auto-calibrate registers css-change; disabling grid unregisters it', () => {
    const {workspace} = makeWorkspace();
    const app = {workspace} as unknown as App;
    const settings = freshSettings({gridAutoCalibrate: true});
    const ctx = makeCtx(app, settings);
    const mod = new GridModule();

    mod.syncFromSettings(ctx);
    const cssChangeCalls = () =>
      workspace.on.mock.calls.filter(([event]) => event === 'css-change');
    expect(cssChangeCalls()).toHaveLength(1);

    // Simulate toggling the grid off via the settings-row handler.
    const rows = mod.settingRows(ctx);
    const gridToggle = rows.find((r) => r.key === 'gridEnabled');
    gridToggle?.type === 'toggle' && gridToggle.onChange(false);

    expect(workspace.offref).toHaveBeenCalled();
    expect(document.body.classList.contains('plugin-tf-grid')).toBe(false);

    mod.teardown(ctx);
  });

  it('grid-unit row is disabled and renamed when auto-calibrate is on', () => {
    const {workspace} = makeWorkspace();
    const ctx = makeCtx(
      {workspace} as unknown as App,
      freshSettings({gridAutoCalibrate: true, gridUnit: 18}),
    );
    const mod = new GridModule();
    const row = mod
      .settingRows(ctx)
      .find((r) => r.key === 'gridUnit');

    expect(row?.type).toBe('slider');
    if (row?.type === 'slider') {
      expect(row.disabledWhen?.(ctx.settings)).toBe(true);
      expect(row.dynamicName?.(ctx.settings)).toContain('Auto: 18px');
    }
  });
});

// ── Colors ──

describe('ColorsModule', () => {
  it('toggle on applies class + vars; toggle off removes them', () => {
    const {workspace} = makeWorkspace();
    const ctx = makeCtx({workspace} as unknown as App, freshSettings({colorsEnabled: false}));
    const mod = new ColorsModule();

    const rows = mod.settingRows(ctx);
    const toggleRow = rows.find((r) => r.key === 'colorsEnabled');
    if (toggleRow?.type !== 'toggle') throw new Error('expected toggle row');

    toggleRow.onChange(true);
    expect(document.body.classList.contains('plugin-tf-colors')).toBe(true);
    expect(bodyCssVar('--accent-hue')).toBe('0');

    toggleRow.onChange(false);
    expect(document.body.classList.contains('plugin-tf-colors')).toBe(false);
    expect(bodyCssVar('--accent-hue')).toBe('');
  });
});

// ── CJK ──

describe('CjkModule', () => {
  it('enabling justify auto-enables the master prose switch', () => {
    const {workspace} = makeWorkspace();
    const settings = freshSettings({cjkProseEnabled: false, cjkProseJustify: false});
    const ctx = makeCtx({workspace} as unknown as App, settings);
    const mod = new CjkModule();

    const rows = mod.settingRows(ctx);
    const justifyRow = rows.find((r) => r.key === 'cjkProseJustify');
    if (justifyRow?.type !== 'toggle') throw new Error('expected toggle row');

    justifyRow.onChange(true);

    expect(settings.cjkProseEnabled).toBe(true);
    expect(document.body.classList.contains('plugin-tf-cjk-prose')).toBe(true);
    expect(document.body.classList.contains('plugin-tf-cjk-justify')).toBe(true);

    mod.teardown(ctx);
    expect(document.body.classList.contains('plugin-tf-cjk-prose')).toBe(false);
    expect(document.body.classList.contains('plugin-tf-cjk-justify')).toBe(false);
  });
});

// ── Cursor FX ──

describe('CursorFxModule', () => {
  it('sync applies breathing cursor class and CSS vars; teardown cleans up', () => {
    const {workspace} = makeWorkspace();
    const ctx = makeCtx(
      {workspace} as unknown as App,
      freshSettings({breatheEnabled: true, breatheDuration: 5, strikeAnimEnabled: true}),
    );
    const mod = new CursorFxModule();

    mod.syncFromSettings(ctx);
    expect(document.body.classList.contains('plugin-tf-breathe')).toBe(true);
    expect(document.body.classList.contains('plugin-tf-strike-anim')).toBe(true);
    expect(bodyCssVar('--tf-breathe-duration')).toBe('5s');

    mod.teardown(ctx);
    expect(document.body.classList.contains('plugin-tf-breathe')).toBe(false);
    expect(document.body.classList.contains('plugin-tf-strike-anim')).toBe(false);
    expect(bodyCssVar('--tf-breathe-duration')).toBe('');
  });
});

// ── Cursor Restore / Flow State singletons ──

describe('ViewPlugin singleton wiring', () => {
  it('cursor-restore registers its manager for the typewriter ViewPlugin', () => {
    const {workspace} = makeWorkspace();
    const app = {workspace} as unknown as App;
    const ctx = makeCtx(app, freshSettings({cursorRestoreEnabled: true}));
    const mod = new CursorRestoreModule(app);

    expect(getCursorRestoreForViewPlugin()).toBeNull();
    mod.syncFromSettings(ctx);
    expect(getCursorRestoreForViewPlugin()).not.toBeNull();
    mod.teardown(ctx);
    expect(getCursorRestoreForViewPlugin()).toBeNull();
  });

  it('flow-state registers its manager and static font weight', () => {
    const {workspace} = makeWorkspace();
    const ctx = makeCtx({workspace} as unknown as App, freshSettings({fontWeight: 500}));
    const mod = new FlowStateModule();

    mod.syncFromSettings(ctx);
    expect(getFlowStateManager()).not.toBeNull();
    expect(bodyCssVar('--user-wght')).toBe('500');

    mod.teardown(ctx);
    expect(getFlowStateManager()).toBeNull();
  });
});

// ── Fullscreen ──

describe('FullscreenModule', () => {
  it('toggle on activates manager + body class + exit button; toggle off restores', () => {
    const {workspace} = makeWorkspace();
    const app = {workspace} as unknown as App;
    const ctx = makeCtx(app, freshSettings({fullscreenEnabled: false}));
    const mod = new FullscreenModule(app);
    mod.syncFromSettings(ctx);

    const rows = mod.settingRows(ctx);
    const toggleRow = rows.find((r) => r.key === 'fullscreenEnabled');
    if (toggleRow?.type !== 'toggle') throw new Error('expected toggle row');

    toggleRow.onChange(true);
    expect(document.body.classList.contains('plugin-tf-fullscreen')).toBe(true);
    expect(document.querySelector('.tf-fullscreen-exit-btn')).not.toBeNull();

    toggleRow.onChange(false);
    expect(document.body.classList.contains('plugin-tf-fullscreen')).toBe(false);
    expect(document.querySelector('.tf-fullscreen-exit-btn')).toBeNull();

    mod.teardown(ctx);
  });
});
