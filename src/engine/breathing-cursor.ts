/**
 * Breathing Cursor — smooth fade cycle instead of binary blink.
 *
 * Toggles a body class that activates CSS animation on .cm-cursor.
 * Listens for keystrokes to pause animation during active typing.
 */

const BREATHE_CLASS = 'plugin-tf-breathe';
const TYPING_CLASS = 'tf-breathe-typing';

export class BreathingCursorManager {
  private typingTimer: number | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private inputHandler: ((e: Event) => void) | null = null;

  enable(): void {
    document.body.classList.add(BREATHE_CLASS);
    this.attachKeyListener();
  }

  disable(): void {
    document.body.classList.remove(BREATHE_CLASS, TYPING_CLASS);
    this.detachKeyListener();
  }

  setDuration(d: number): void {
    document.body.style.setProperty('--tf-breathe-duration', d + 's');
  }

  setMinOpacity(o: number): void {
    document.body.style.setProperty('--tf-breathe-min-opacity', String(o));
  }

  notifyActivity(): void {
    document.body.classList.add(TYPING_CLASS);
    if (this.typingTimer !== null) clearTimeout(this.typingTimer);
    this.typingTimer = window.setTimeout(() => {
      document.body.classList.remove(TYPING_CLASS);
      this.typingTimer = null;
    }, 600);
  }

  destroy(): void {
    this.disable();
    document.body.style.removeProperty('--tf-breathe-duration');
    document.body.style.removeProperty('--tf-breathe-min-opacity');
    if (this.typingTimer !== null) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }

  private attachKeyListener(): void {
    if (this.keyHandler) return;

    // Desktop: keydown catches physical keyboard input
    this.keyHandler = (e: KeyboardEvent) => {
      // Skip during IME composition (CJK input)
      if (e.isComposing) return;
      if (
        e.key.length === 1 ||
        ['Backspace', 'Delete', 'Enter'].includes(e.key)
      ) {
        this.notifyActivity();
      }
    };
    document.addEventListener('keydown', this.keyHandler, true);

    // Mobile: `input` events catch soft keyboard input
    this.inputHandler = () => this.notifyActivity();
    document.addEventListener('input', this.inputHandler, true);
  }

  private detachKeyListener(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    if (this.inputHandler) {
      document.removeEventListener('input', this.inputHandler, true);
      this.inputHandler = null;
    }
  }
}
