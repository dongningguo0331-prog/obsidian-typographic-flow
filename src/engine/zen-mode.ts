/**
 * Zen Mode — dim all non-active lines while typing.
 *
 * Pure CSS approach: toggles a body class and injects a CSS variable
 * for the dimmed-line opacity. No CM6 decorations needed.
 */

const ZEN_BODY_CLASS = 'plugin-tf-zen';
const ZEN_ENTERING_CLASS = 'tf-zen-entering';
const ZEN_DYNAMIC_CLASS = 'plugin-tf-zen-dynamic';

export class ZenModeManager {
  private cssNode: HTMLStyleElement | null = null;
  private _enterTimer: ReturnType<typeof setTimeout> | null = null;

  /** Inject or update the --zen-opacity CSS variable into <head>. */
  setOpacity(opacity: number): void {
    // Validate: must be a finite number between 0 and 1
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      console.warn(
        `[TypographicFlow] Invalid zen opacity: ${opacity}, clamping to 0-1`,
      );
      opacity = Math.max(0, Math.min(1, opacity || 0.25));
    }
    if (!this.cssNode) {
      this.cssNode = document.createElement('style');
      this.cssNode.id = 'plugin-tf-zen-opacity';
      document.head.appendChild(this.cssNode);
    }
    this.cssNode.textContent = `body { --zen-opacity: ${opacity}; }`;
  }

  /** Enable Zen Mode: add body class + entry animation. */
  enable(): void {
    document.body.classList.add(ZEN_BODY_CLASS);
    document.body.classList.add(ZEN_ENTERING_CLASS);
    if (this._enterTimer) clearTimeout(this._enterTimer);
    this._enterTimer = setTimeout(() => {
      document.body.classList.remove(ZEN_ENTERING_CLASS);
      this._enterTimer = null;
    }, 350);
  }

  /** Disable Zen Mode: remove body class. */
  disable(): void {
    if (this._enterTimer) {
      clearTimeout(this._enterTimer);
      this._enterTimer = null;
    }
    document.body.classList.remove(ZEN_BODY_CLASS);
    document.body.classList.remove(ZEN_ENTERING_CLASS);
    document.body.classList.remove(ZEN_DYNAMIC_CLASS);
  }

  /** Enable / disable velocity-driven dynamic opacity. */
  setDynamic(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add(ZEN_DYNAMIC_CLASS);
    } else {
      document.body.classList.remove(ZEN_DYNAMIC_CLASS);
    }
  }

  /** Clean up injected style node. */
  destroy(): void {
    this.disable();
    if (this.cssNode) {
      this.cssNode.remove();
      this.cssNode = null;
    }
  }
}
