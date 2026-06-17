/**
 * Cursor Position Restore — remember cursor and scroll position per file.
 *
 * Design follows typewriter-mode's proven pattern:
 * - Positions stored in plugin settings (shared reference with settings.cursorPositions)
 * - Persisted via Obsidian's saveData() API
 * - Cursor save: triggered from CodeMirror ViewPlugin (NOT from workspace events)
 * - Cursor restore: triggered from file-open event AND ViewPlugin on-load
 */

import type { App, MarkdownView, TFile } from 'obsidian';
import type { EditorView } from '@codemirror/view';

export interface CursorState {
  from: number;
  to: number;
  scroll: number;
}

export class CursorRestoreManager {
  private _enabled = false;
  private _positions: Record<string, CursorState> = {};
  private _saveData: (() => Promise<void>) | null = null;
  private _activeFile: (() => string | undefined) | null = null;
  private _cleanupFns: (() => void)[] = [];

  constructor(private app: App) {}

  enable(
    positions: Record<string, CursorState>,
    saveData: () => Promise<void>,
  ): void {
    if (this._enabled) return;
    this._enabled = true;
    this._positions = positions;
    this._saveData = saveData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = this.app.workspace as any;

    // Get active file path helper
    this._activeFile = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (this.app.workspace as any).getActiveFile()?.path as string | undefined;
    };

    // file-open: restore cursor position
    const onFileOpen = (file: TFile | null) => {
      if (file) this.onFileOpen(file);
    };
    ws.on('file-open', onFileOpen);
    this._cleanupFns.push(() => ws.off('file-open', onFileOpen));

    // rename: update path key
    const onRename = (file: TFile, oldPath: string) => this.onRename(file, oldPath);
    ws.on('rename', onRename);
    this._cleanupFns.push(() => ws.off('rename', onRename));

    // delete: remove entry
    const onDelete = (file: TFile) => this.onDelete(file);
    ws.on('delete', onDelete);
    this._cleanupFns.push(() => ws.off('delete', onDelete));

    // quit: persist to disk
    const onQuit = () => this.onQuit();
    ws.on('quit', onQuit);
    this._cleanupFns.push(() => ws.off('quit', onQuit));
  }

  disable(): void {
    if (!this._enabled) return;
    this._enabled = false;
    this._saveData = null;
    this._activeFile = null;
    for (const fn of this._cleanupFns) fn();
    this._cleanupFns = [];
  }

  // ── Public API (called from CodeMirror ViewPlugin) ──

  /** Called from ViewPlugin.update() — saves cursor position in-memory. */
  saveCursor(selection: { from: number; to: number }, scrollTop: number): void {
    if (!this._enabled || !this._activeFile) return;
    const path = this._activeFile();
    if (!path) return;
    this._positions[path] = { from: selection.from, to: selection.to, scroll: scrollTop };
  }

  /** Called from ViewPlugin constructor — restores cursor position on editor load. */
  restoreOnLoad(view: EditorView): void {
    if (!this._enabled || !this._activeFile) return;
    const path = this._activeFile();
    if (!path) return;
    const state = this._positions[path];
    if (!state) return;

    // Skip if Obsidian is navigating (e.g. wikilink click)
    if (document.querySelector('span.is-flashing')) return;

    window.requestAnimationFrame(() => {
      const docLen = view.state.doc.length;
      const from = Math.min(state.from, docLen);
      const to = Math.min(state.to, docLen);
      view.dispatch({ selection: { anchor: from, head: to } });
      requestAnimationFrame(() => {
        view.scrollDOM.scrollTop = state.scroll;
      });
    });
  }

  // ── Event handlers ──

  onFileOpen(file: TFile): void {
    if (!this._enabled) return;
    const state = this._positions[file.path];
    if (!state) return;

    // Skip if Obsidian is navigating (e.g. wikilink click)
    if (document.querySelector('span.is-flashing')) return;

    window.requestAnimationFrame(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leaves = (this.app.workspace as any).getLeavesOfType('markdown') as { view: MarkdownView }[];
      for (const leaf of leaves) {
        const view = leaf.view;
        if (!view?.file || view.file.path !== file.path) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cm = (view.editor as any)?.cm as EditorView | undefined;
        if (!cm) continue;

        const docLen = cm.state.doc.length;
        const from = Math.min(state.from, docLen);
        const to = Math.min(state.to, docLen);
        cm.dispatch({ selection: { anchor: from, head: to } });

        requestAnimationFrame(() => {
          cm.scrollDOM.scrollTop = state.scroll;
        });
      }
    });
  }

  onRename(file: TFile, oldPath: string): void {
    if (this._positions[oldPath]) {
      this._positions[file.path] = this._positions[oldPath];
      delete this._positions[oldPath];
    }
  }

  onDelete(file: TFile): void {
    delete this._positions[file.path];
  }

  onQuit(): void {
    this._saveData?.();
  }

  get positions(): Record<string, CursorState> {
    return this._positions;
  }

  destroy(): void {
    this.disable();
  }
}

// ── Module-level singleton for ViewPlugin access ──
// The ViewPlugin (in typewriter.ts) needs access to CursorRestoreManager
// without a direct import dependency. We set this before the plugin loads.

let _cursorRestoreInstance: CursorRestoreManager | null = null;

export function setCursorRestoreForViewPlugin(instance: CursorRestoreManager | null): void {
  _cursorRestoreInstance = instance;
}

export function getCursorRestoreForViewPlugin(): CursorRestoreManager | null {
  return _cursorRestoreInstance;
}
