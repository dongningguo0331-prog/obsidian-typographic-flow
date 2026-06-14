/**
 * Strikethrough Animation — animate ~~strikethrough~~ from left to right.
 *
 * Toggles a body class that activates CSS animation on <s>/<del> elements
 * and .cm-strikethrough spans. Pure CSS, no CM6 decorations.
 */

const STRIKE_CLASS = 'plugin-tf-strike-anim';

export class StrikethroughAnimManager {
  enable(): void {
    document.body.classList.add(STRIKE_CLASS);
  }

  disable(): void {
    document.body.classList.remove(STRIKE_CLASS);
  }

  setDuration(d: number): void {
    document.body.style.setProperty('--tf-strike-duration', d + 's');
  }

  destroy(): void {
    this.disable();
    document.body.style.removeProperty('--tf-strike-duration');
  }
}
