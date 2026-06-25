import { describe, it, expect } from 'vitest';
import { focusModeFacet, buildFocusExtensions, type FocusMode } from '../../src/engine/focus-mode';

describe('focusModeFacet', () => {
  it('combine returns first value with default', () => {
    const result = focusModeFacet.combine?.(['paragraph'] as readonly FocusMode[]);
    expect(result).toBe('paragraph');
  });

  it('combine returns default for empty array', () => {
    const result = focusModeFacet.combine?.([] as readonly FocusMode[]);
    expect(result).toBe('off');
  });
});

describe('buildFocusExtensions', () => {
  it('returns an array of elements for off mode', () => {
    const exts = buildFocusExtensions('off');
    expect(Array.isArray(exts)).toBe(true);
    // off mode may return empty or minimal array
  });

  it('returns extensions for paragraph mode', () => {
    const exts = buildFocusExtensions('paragraph');
    expect(Array.isArray(exts)).toBe(true);
    expect(exts.length).toBeGreaterThan(0);
  });

  it('returns extensions for all focus modes', () => {
    const modes: FocusMode[] = ['off', 'line', 'paragraph', 'heading', 'sentence'];
    for (const mode of modes) {
      const exts = buildFocusExtensions(mode);
      expect(Array.isArray(exts), `mode ${mode} should return array`).toBe(true);
    }
  });
});
