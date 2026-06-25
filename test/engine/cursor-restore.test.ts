// @vitest-environment jsdom

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {CursorRestoreManager} from '../../src/engine/cursor-restore';
import {createMockApp} from '../helpers/mock-app';

describe('CursorRestoreManager', () => {
  let manager: CursorRestoreManager;
  let mockApp: ReturnType<typeof createMockApp>;

  beforeEach(() => {
    mockApp = createMockApp();
    manager = new CursorRestoreManager(mockApp);
  });

  it('creates with empty positions and disabled state', () => {
    expect(manager.positions).toEqual({});
  });

  it('onRename transfers position key from oldPath to file.path', () => {
    const positions = {
      '/old/path.md': {from: 10, to: 20, scroll: 50},
    };
    manager.enable(positions, vi.fn());
    const file = {path: '/new/path.md'};
    manager.onRename(file, '/old/path.md');
    expect(manager.positions['/new/path.md']).toEqual({from: 10, to: 20, scroll: 50});
    expect(manager.positions['/old/path.md']).toBeUndefined();
  });

  it('onRename does nothing if oldPath not found', () => {
    manager.enable({}, vi.fn());
    const file = {path: '/new.md'};
    manager.onRename(file, '/nonexistent.md');
    expect(manager.positions['/new.md']).toBeUndefined();
  });

  it('onDelete removes position entry', () => {
    const positions = {
      '/file.md': {from: 10, to: 20, scroll: 50},
      '/other.md': {from: 5, to: 10, scroll: 0},
    };
    manager.enable(positions, vi.fn());
    const file = {path: '/file.md'};
    manager.onDelete(file);
    expect(manager.positions['/file.md']).toBeUndefined();
    expect(manager.positions['/other.md']).toBeDefined();
  });

  it('onDelete does nothing if path not found', () => {
    manager.enable({}, vi.fn());
    const file = {path: '/nonexistent.md'};
    manager.onDelete(file);
    expect(manager.positions).toEqual({});
  });

  it('enable stores positions and registers workspace events', () => {
    const positions = {'/a.md': {from: 1, to: 2, scroll: 3}};
    manager.enable(positions, vi.fn());
    expect(manager.positions).toBe(positions);
    expect(mockApp.workspace.on).toHaveBeenCalled();
  });

  it('disable clears state and unregisters events', () => {
    manager.enable({'/a.md': {from: 1, to: 2, scroll: 3}}, vi.fn());
    manager.disable();
    expect(mockApp.workspace.off).toHaveBeenCalled();
  });

  it('onQuit calls saveData callback', () => {
    const saveData = vi.fn();
    manager.enable({}, saveData);
    manager.onQuit();
    expect(saveData).toHaveBeenCalled();
  });

  it('onQuit does nothing if not enabled', () => {
    const saveData = vi.fn();
    manager.onQuit();
    expect(saveData).not.toHaveBeenCalled();
  });

  it('destroy calls disable', () => {
    manager.enable({}, vi.fn());
    manager.destroy();
    // Should not throw
  });
});
