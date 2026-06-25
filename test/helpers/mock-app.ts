import {vi} from 'vitest';

export function createMockApp() {
  return {
    workspace: {
      leftSplit: {collapsed: false, collapse: vi.fn(), expand: vi.fn()},
      rightSplit: {collapsed: true, collapse: vi.fn(), expand: vi.fn()},
      containerEl: {addClass: vi.fn(), removeClass: vi.fn()},
      on: vi.fn(),
      off: vi.fn(),
      getActiveFile: vi.fn(() => null),
      getLeavesOfType: vi.fn(() => []),
    },
  };
}
