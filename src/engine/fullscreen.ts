/**
 * Fullscreen Writing Mode — hide all UI elements for distraction-free writing.
 *
 * Uses Obsidian's native maximized mode (on workspace.containerEl) to hide
 * the ribbon, plus a body class for additional UI hiding (sidebars, tabs,
 * titlebar, status bar). Saves and restores layout state on enable/disable.
 */

import type { App } from 'obsidian';

const FULLSCREEN_CLASS = 'plugin-tf-fullscreen';
const MAXIMIZED_CLASS = 'tf-maximized';
const SHOW_HEADER_CLASS = 'tf-fullscreen-show-header';
const SHOW_STATUS_BAR_CLASS = 'tf-fullscreen-show-status-bar';
const VIGNETTE_CLASS = 'tf-fullscreen-vignette';
const EXIT_BTN_CLASS = 'tf-fullscreen-exit-btn';

export type VignetteStyle = 'radial' | 'box' | 'none';

interface WorkspaceSplit {
  collapsed: boolean;
  collapse(): void;
  expand(): void;
}

interface WorkspaceWithSplits {
  leftSplit?: WorkspaceSplit;
  rightSplit?: WorkspaceSplit;
  containerEl: HTMLElement;
}

interface SavedLayoutState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
}

export class FullscreenManager {
  private _active = false;
  private vignetteEl: HTMLDivElement | null = null;
  private exitBtnEl: HTMLButtonElement | null = null;
  private savedState: SavedLayoutState | null = null;
  private _onExit: (() => void) | null = null;
  private _onToggle: (() => void) | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(private app: App) {}

  /** Set a callback to invoke when the exit button is clicked or Esc is pressed. */
  set onExit(fn: (() => void) | null) {
    this._onExit = fn;
  }

  /** Set a callback to invoke when F11 is pressed. */
  set onToggle(fn: (() => void) | null) {
    this._onToggle = fn;
  }

  get isActive(): boolean {
    return this._active;
  }

  enable(): void {
    if (this._active) return;
    this._active = true;

    // Save current layout state
    this.savedState = this.captureLayoutState();

    // Collapse sidebars
    const ws = this.app.workspace as unknown as WorkspaceWithSplits;
    try {
      ws.leftSplit?.collapse();
      ws.rightSplit?.collapse();
    } catch (_e) {
      // Ignore if splits don't exist
    }

    // Add body class for CSS-based hiding
    document.body.classList.add(FULLSCREEN_CLASS);

    // Add maximized class on workspace container (hides ribbon)
    ws.containerEl?.addClass(MAXIMIZED_CLASS);

    // Create floating exit button
    this.createExitButton();

    // Register keyboard shortcuts
    this.registerKeyHandler();
  }

  disable(): void {
    if (!this._active) return;
    this._active = false;

    // Remove body class
    document.body.classList.remove(FULLSCREEN_CLASS);

    // Remove maximized class from workspace container
    const ws = this.app.workspace as unknown as WorkspaceWithSplits;
    ws.containerEl?.removeClass(MAXIMIZED_CLASS);

    // Remove vignette
    this.removeVignette();

    // Remove exit button
    this.removeExitButton();

    // Unregister keyboard shortcuts
    this.unregisterKeyHandler();

    // Restore layout state
    if (this.savedState) {
      this.restoreLayoutState(this.savedState);
      this.savedState = null;
    }
  }

  toggle(): void {
    this._active ? this.disable() : this.enable();
  }

  /** Show or hide the titlebar in fullscreen mode. */
  setShowHeader(show: boolean): void {
    if (show) {
      document.body.classList.add(SHOW_HEADER_CLASS);
    } else {
      document.body.classList.remove(SHOW_HEADER_CLASS);
    }
  }

  /** Show or hide the status bar in fullscreen mode. */
  setShowStatusBar(show: boolean): void {
    if (show) {
      document.body.classList.add(SHOW_STATUS_BAR_CLASS);
    } else {
      document.body.classList.remove(SHOW_STATUS_BAR_CLASS);
    }
  }

  /** Set the vignette overlay style. */
  setVignetteStyle(style: VignetteStyle): void {
    this.removeVignette();
    if (style !== 'none' && this._active) {
      this.createVignette(style);
    }
  }

  // ── Private ──

  private captureLayoutState(): SavedLayoutState {
    const ws = this.app.workspace as unknown as WorkspaceWithSplits;
    return {
      leftSidebarOpen: ws.leftSplit ? !ws.leftSplit.collapsed : false,
      rightSidebarOpen: ws.rightSplit ? !ws.rightSplit.collapsed : false,
    };
  }

  private restoreLayoutState(state: SavedLayoutState): void {
    try {
      const ws = this.app.workspace as unknown as WorkspaceWithSplits;
      if (state.leftSidebarOpen && ws.leftSplit) ws.leftSplit.expand();
      if (state.rightSidebarOpen && ws.rightSplit) ws.rightSplit.expand();
    } catch (_e) {
      // Ignore if splits don't exist
    }
  }

  private createVignette(style: VignetteStyle): void {
    if (this.vignetteEl) return;
    this.vignetteEl = document.createElement('div');
    this.vignetteEl.className = `${VIGNETTE_CLASS} style-${style}`;
    document.body.appendChild(this.vignetteEl);
  }

  private removeVignette(): void {
    if (this.vignetteEl) {
      this.vignetteEl.remove();
      this.vignetteEl = null;
    }
  }

  private createExitButton(): void {
    if (this.exitBtnEl) return;
    this.exitBtnEl = document.createElement('button');
    this.exitBtnEl.className = EXIT_BTN_CLASS;
    this.exitBtnEl.textContent = '←';
    this.exitBtnEl.title = 'Exit Fullscreen (Esc or F11)';
    this.exitBtnEl.addEventListener('click', () => {
      if (this._onExit) this._onExit();
      else this.disable();
    });
    document.body.appendChild(this.exitBtnEl);
  }

  private removeExitButton(): void {
    if (this.exitBtnEl) {
      this.exitBtnEl.remove();
      this.exitBtnEl = null;
    }
  }

  private registerKeyHandler(): void {
    if (this._keyHandler) return;
    this._keyHandler = (e: KeyboardEvent) => {
      // Esc: exit fullscreen (only when no Obsidian modal is open)
      if (e.key === 'Escape') {
        if (document.querySelector('.modal-bg')) return;
        if (this._active) {
          e.preventDefault();
          e.stopPropagation();
          this._onExit?.();
        }
        return;
      }
      // F11: toggle fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        this._onToggle?.();
      }
    };
    document.addEventListener('keydown', this._keyHandler, true);
  }

  private unregisterKeyHandler(): void {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler, true);
      this._keyHandler = null;
    }
  }

  destroy(): void {
    this.disable();
  }
}
