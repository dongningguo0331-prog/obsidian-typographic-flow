import { vi } from 'vitest';

export interface MockLine {
  text: string;
  from: number;
}

export function createMockText(lines: string[]): {
  lines: number;
  lineAt: (pos: number) => MockLine;
  line: (n: number) => MockLine;
  sliceString: (from: number, to: number) => string;
  length: number;
} {
  const lineObjects: MockLine[] = [];
  let currentFrom = 0;

  for (const text of lines) {
    lineObjects.push({ text, from: currentFrom });
    currentFrom += text.length + 1; // +1 for \n
  }

  const fullText = lines.join('\n');

  return {
    lines: lines.length,
    lineAt(pos: number): MockLine {
      for (let i = lineObjects.length - 1; i >= 0; i--) {
        if (pos >= lineObjects[i].from) return lineObjects[i];
      }
      return lineObjects[0];
    },
    line(n: number): MockLine {
      return lineObjects[n] ?? lineObjects[lineObjects.length - 1];
    },
    sliceString(from: number, to: number): string {
      return fullText.slice(from, to);
    },
    length: fullText.length,
  };
}

export function createMockEditorView(contentDOM?: HTMLElement) {
  return {
    contentDOM: contentDOM ?? {
      style: {
        setProperty: vi.fn(),
      },
    },
    scrollDOM: {
      style: {},
    },
    state: {},
  };
}
