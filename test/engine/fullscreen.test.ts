// @vitest-environment jsdom

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {FullscreenManager} from '../../src/engine/fullscreen';
import {createMockApp} from '../helpers/mock-app';

describe('FullscreenManager', () => {
  let manager: FullscreenManager;
  let mockApp: ReturnType<typeof createMockApp>;

  beforeEach(() => {
    mockApp = createMockApp();
    document.body.innerHTML = '';
    manager = new FullscreenManager(mockApp);
  });

  it('creates with _active=false', () => {
    expect(manager._active).toBe(false);
  });

  it('enable sets _active and adds body class', () => {
    manager.enable();
    expect(manager._active).toBe(true);
    expect(document.body.classList.contains('plugin-tf-fullscreen')).toBe(true);
  });

  it('disable removes body class and resets state', () => {
    manager.enable();
    manager.disable();
    expect(manager._active).toBe(false);
    expect(document.body.classList.contains('plugin-tf-fullscreen')).toBe(false);
  });

  it('setShowHeader toggles class', () => {
    manager.setShowHeader(true);
    expect(document.body.classList.contains('tf-fullscreen-show-header')).toBe(true);
    manager.setShowHeader(false);
    expect(document.body.classList.contains('tf-fullscreen-show-header')).toBe(false);
  });

  it('setShowStatusBar toggles class', () => {
    manager.setShowStatusBar(true);
    expect(document.body.classList.contains('tf-fullscreen-show-status-bar')).toBe(true);
    manager.setShowStatusBar(false);
    expect(document.body.classList.contains('tf-fullscreen-show-status-bar')).toBe(false);
  });

  it('captureLayoutState returns sidebar states', () => {
    const state = manager.captureLayoutState();
    expect(state).toHaveProperty('leftSidebarOpen');
    expect(state).toHaveProperty('rightSidebarOpen');
  });

  it('setVignetteStyle creates vignette element', () => {
    manager.enable();
    manager.setVignetteStyle('radial');
    expect(document.querySelector('.tf-fullscreen-vignette')).toBeTruthy();
  });

  it('setVignetteStyle none removes vignette element', () => {
    manager.enable();
    manager.setVignetteStyle('radial');
    manager.setVignetteStyle('none');
    expect(document.querySelector('.tf-fullscreen-vignette')).toBeNull();
  });

  it('destroy calls disable', () => {
    manager.enable();
    manager.destroy();
    expect(manager._active).toBe(false);
  });
});
