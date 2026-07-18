// @ts-nocheck
import { vi } from 'vitest';

function makeFacetMock<T, V>(options?: {
  combine?: (values: readonly V[]) => T;
  static?: boolean;
}) {
  const combine = options?.combine ?? ((vals: readonly unknown[]) => (vals.length ? vals[0] : undefined));
  const facet: Record<string, unknown> = {
    of: vi.fn((value: V) => ({ facet, value })),
  };
  if (combine) {
    facet.combine = combine;
  }
  return facet;
}

export const Facet = {
  define: vi.fn((...args: unknown[]) => {
    if (typeof args[0] === 'function') {
      return makeFacetMock({ combine: args[0] as never });
    }
    const opts = args[0] as Record<string, unknown> | undefined;
    return makeFacetMock(opts);
  }),
};

export class Compartment {
  of = vi.fn((exts: unknown) => exts);

  reconfigure = vi.fn((exts: unknown) => ({is: 'reconfigure', exts}));
}

export const RangeSet = {
  empty: { size: 0 },
};

export class RangeSetBuilder<T> {
  private items: { from: number; to: number; value: T }[] = [];

  add(from: number, to: number, value: T): void {
    this.items.push({ from, to, value });
  }

  finish(): unknown {
    return { size: this.items.length, items: this.items };
  }
}

export class Transaction {}
export class EditorState {}

export type Extension = unknown;
export interface Text {
  lineAt: (pos: number) => unknown;
  line: (n: number) => unknown;
  lines: number;
  sliceString: (from: number, to: number) => string;
  length: number;
}
