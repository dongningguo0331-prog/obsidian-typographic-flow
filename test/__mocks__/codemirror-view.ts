import { vi } from 'vitest';

export class EditorView {
  contentDOM = document.createElement('div');
  scrollDOM = document.createElement('div');
  state: unknown = {};
}

export const ViewPlugin = {
  fromClass: vi.fn((_cls: unknown, _spec?: unknown) => ({})),
  define: vi.fn(() => ({})),
};

export class Decoration {
  static mark = vi.fn(() => ({}));
  static widget = vi.fn(() => ({}));
  static line = vi.fn(() => ({}));
  static replace = vi.fn(() => ({}));
}

export class ViewUpdate {
  view = new EditorView();
  docChanged = false;
  selectionSet = false;
  viewportChanged = false;
  state: unknown = {};
}
