import type {Editor, MarkdownView} from 'obsidian';
import type {EditorView} from '@codemirror/view';

interface EditorWithCm extends Editor {
  cm: EditorView;
}

export function setBodyCSS(key: string, value: string): void {
  document.body.style.setProperty(key, value);
}

export function removeBodyCSS(key: string): void {
  document.body.style.removeProperty(key);
}

export function getCmView(view: MarkdownView): EditorView | null {
  if (!view?.editor) return null;
  const editor = view.editor as EditorWithCm;
  return editor.cm ?? null;
}
