import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      obsidian: path.resolve(__dirname, 'test/__mocks__/obsidian.ts'),
      '@codemirror/state': path.resolve(__dirname, 'test/__mocks__/codemirror-state.ts'),
      '@codemirror/view': path.resolve(__dirname, 'test/__mocks__/codemirror-view.ts'),
      '@codemirror/language': path.resolve(__dirname, 'test/__mocks__/codemirror-language.ts'),
      '@lezer/common': path.resolve(__dirname, 'test/__mocks__/lezer-common.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts', 'src/settings/**/*.ts'],
      thresholds: { statements: 55, branches: 40 },
    },
  },
});
