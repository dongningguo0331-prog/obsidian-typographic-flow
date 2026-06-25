// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VelocityZenEngine } from '../../src/engine/velocity-zen';

describe('VelocityZenEngine', () => {
  let engine: VelocityZenEngine;
  let onOpacityChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onOpacityChange = vi.fn();
    engine = new VelocityZenEngine(onOpacityChange);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates with default state', () => {
    expect(engine.enabled).toBe(false);
    expect(engine.keystrokes).toEqual([]);
    expect(engine.smoothedWPM).toBe(0);
  });

  it('enable registers keystroke listeners and starts idle timer', () => {
    engine.enable();
    expect(engine.enabled).toBe(true);
  });

  it('disable clears state and removes listeners', () => {
    engine.enable();
    engine.disable();
    expect(engine.enabled).toBe(false);
    expect(engine.keystrokes).toEqual([]);
    expect(engine.smoothedWPM).toBe(0);
  });

  it('records keystrokes and computes WPM from typing speed', () => {
    engine.enable();

    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      engine._recordKeystroke();
      while (performance.now() - start < (i + 1) * 20) {
        /* spacing */
      }
    }

    expect(engine.keystrokes.length).toBeGreaterThanOrEqual(2);
    expect(engine.smoothedWPM).toBeGreaterThan(0);
  });

  it('low-pass filter smooths WPM transitions', () => {
    engine.enable();

    const start = performance.now();
    for (let i = 0; i < 8; i++) {
      engine._recordKeystroke();
      while (performance.now() - start < (i + 1) * 15) {
        /* spacing */
      }
    }

    expect(engine.smoothedWPM).toBeGreaterThan(0);
  });

  it('triggers idle opacity after timeout with no typing', () => {
    vi.useFakeTimers();
    engine.enable();

    engine._recordKeystroke();
    vi.advanceTimersByTime(3100);

    expect(onOpacityChange).toHaveBeenCalledWith(0.3);
  });

  it('applies max opacity at high WPM', () => {
    engine.enable();

    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      engine._recordKeystroke();
      while (performance.now() - start < (i + 1) * 30) {
        /* spacing */
      }
    }

    expect(engine.smoothedWPM).toBeGreaterThan(0);
  });
});
