import { describe, it, expect } from 'vitest';
import {
  typewriterOffset,
  deadZoneFacet,
  suspensionEnabled,
  smoothScrollEnabled,
  smartOffsetEnabled,
  buildTypewriterExtensions,
  type TypewriterSettings,
} from '../../src/engine/typewriter';

describe('Typewriter faceted extensions', () => {
  const defaults: TypewriterSettings = {
    typewriterOffset: 0.5,
    deadZone: 2,
    suspensionEnabled: true,
    smoothScrollEnabled: true,
    smartOffsetEnabled: true,
  };

  it('typewriterOffset combine returns first value', () => {
    const result = typewriterOffset.combine?.([0.5] as readonly number[]);
    expect(result).toBe(0.5);
  });

  it('typewriterOffset combine returns default for empty', () => {
    const result = typewriterOffset.combine?.([] as readonly number[]);
    expect(result).toBe(0.5);
  });

  it('deadZoneFacet combine returns first value', () => {
    const result = deadZoneFacet.combine?.([3] as readonly number[]);
    expect(result).toBe(3);
  });

  it('deadZoneFacet combine returns default for empty', () => {
    const result = deadZoneFacet.combine?.([] as readonly number[]);
    expect(result).toBe(2);
  });

  it('suspensionEnabled combine returns first value', () => {
    const result = suspensionEnabled.combine?.([false] as readonly boolean[]);
    expect(result).toBe(false);
  });

  it('suspensionEnabled combine returns default for empty', () => {
    const result = suspensionEnabled.combine?.([] as readonly boolean[]);
    expect(result).toBe(true);
  });

  it('smoothScrollEnabled combine returns default for empty', () => {
    const result = smoothScrollEnabled.combine?.([] as readonly boolean[]);
    expect(result).toBe(true);
  });

  it('smartOffsetEnabled combine returns default for empty', () => {
    const result = smartOffsetEnabled.combine?.([] as readonly boolean[]);
    expect(result).toBe(true);
  });

  it('buildTypewriterExtensions returns array with default settings', () => {
    const exts = buildTypewriterExtensions(defaults);
    expect(Array.isArray(exts)).toBe(true);
    expect(exts.length).toBeGreaterThan(0);
  });

  it('buildTypewriterExtensions returns array with disabled features', () => {
    const settings: TypewriterSettings = {
      typewriterOffset: 0.5,
      deadZone: 0,
      suspensionEnabled: false,
      smoothScrollEnabled: false,
      smartOffsetEnabled: false,
    };
    const exts = buildTypewriterExtensions(settings);
    expect(Array.isArray(exts)).toBe(true);
  });
});
