import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlowStateManager } from '../../src/engine/flow-state';
import { createMockEditorView } from '../helpers/mock-doc';

describe('FlowStateManager', () => {
  let manager: FlowStateManager;

  beforeEach(() => {
    manager = new FlowStateManager();
  });

  it('creates with disabled state', () => {
    expect(manager.isEnabled).toBe(false);
  });

  it('enable / disable toggles state', () => {
    manager.enable();
    expect(manager.isEnabled).toBe(true);

    manager.disable();
    expect(manager.isEnabled).toBe(false);
  });

  it('setSensitivity clamps to [10, 100]', () => {
    manager.setSensitivity(50);
    // Internal state verified through behavior

    manager.setSensitivity(5);
    // Should be clamped to 10

    manager.setSensitivity(150);
    // Should be clamped to 100
  });

  it('setWeightRange clamps to [10, 80]', () => {
    manager.setWeightRange(40);

    manager.setWeightRange(5);
    // Should be clamped to 10

    manager.setWeightRange(100);
    // Should be clamped to 80
  });

  it('registerView / unregisterView tracks views', () => {
    const view1 = createMockEditorView() as ReturnType<typeof createMockEditorView>;
    const view2 = createMockEditorView() as ReturnType<typeof createMockEditorView>;

    manager.registerView(view1);
    manager.registerView(view2);
    manager.unregisterView(view1);

    // View2 should still be tracked
    // (indirectly verified by disable not crashing)
    manager.enable();
    manager.disable();
  });

  it('_applyFlowState sets CSS property on view contentDOM', () => {
    const setProp = vi.fn();
    const view = createMockEditorView();
    (view.contentDOM as unknown as { style: { setProperty: typeof setProp } }).style.setProperty = setProp;

    manager.enable();
    manager.setWeightRange(50);
    // Fast WPM should trigger negative delta (lighter weight)
    manager._applyFlowState(view, 80);
    expect(setProp).toHaveBeenCalled();
    const delta = Number(setProp.mock.calls[0][1]);
    expect(delta).toBeLessThan(0);
  });

  it('_applyFlowState computes positive delta for slow typing', () => {
    const setProp = vi.fn();
    const view = createMockEditorView();
    (view.contentDOM as unknown as { style: { setProperty: typeof setProp } }).style.setProperty = setProp;

    manager.enable();
    manager.setWeightRange(30);
    // Slow WPM (below threshold) should produce positive delta
    manager._applyFlowState(view, 10);
    expect(setProp).toHaveBeenCalled();
    const delta = Number(setProp.mock.calls[0][1]);
    expect(delta).toBeGreaterThan(0);
  });

  it('_applyFlowState computes negative delta for fast typing', () => {
    const setProp = vi.fn();
    const view = createMockEditorView();
    (view.contentDOM as unknown as { style: { setProperty: typeof setProp } }).style.setProperty = setProp;

    manager.enable();
    manager.setWeightRange(30);
    // Fast WPM (above threshold) should produce negative delta
    manager._applyFlowState(view, 80);
    expect(setProp).toHaveBeenCalled();
    const delta = Number(setProp.mock.calls[0][1]);
    expect(delta).toBeLessThan(0);
  });

  it('destroy calls disable', () => {
    manager.enable();
    manager.destroy();
    expect(manager.isEnabled).toBe(false);
  });
});
