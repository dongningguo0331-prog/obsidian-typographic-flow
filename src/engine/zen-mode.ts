/**
 * Zen Mode — dim all non-active lines while typing.
 *
 * Pure CSS approach: toggles a body class and injects a CSS variable
 * for the dimmed-line opacity. No CM6 decorations needed.
 */

const ZEN_BODY_CLASS = 'plugin-tf-zen';
const ZEN_ENTERING_CLASS = 'tf-zen-entering';

export class ZenModeManager {
  private cssNode: HTMLStyleElement | null = null;

  /** Inject or update the --zen-opacity CSS variable into <head>. */
  setOpacity(opacity: number): void {
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
    setTimeout(() => {
      document.body.classList.remove(ZEN_ENTERING_CLASS);
    }, 350);
  }

  /** Disable Zen Mode: remove body class. */
  disable(): void {
    document.body.classList.remove(ZEN_BODY_CLASS);
    document.body.classList.remove(ZEN_ENTERING_CLASS);
  }

  /** Clean up injected style node. */
  destroy(): void {
    if (this.cssNode) {
      this.cssNode.remove();
      this.cssNode = null;
    }
    document.body.classList.remove(ZEN_BODY_CLASS);
    document.body.classList.remove(ZEN_ENTERING_CLASS);
  }
}
