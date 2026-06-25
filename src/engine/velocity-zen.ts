/**
 * Velocity Zen — dynamic opacity driven by typing speed (WPM).
 *
 * Replaces static --zen-opacity with a real-time calculation:
 *   fast typing → deeply dimmed (0.1)   → extreme focus
 *   idle >3s   → gently bright (0.3)    → context review
 *
 * Uses a first-order low-pass filter to smooth the WPM signal
 * and throttles CSS updates to 200ms intervals.
 */

const WPM_SAMPLE_WINDOW = 3000;
const WPM_LOWPASS_ALPHA = 0.3;
const WPM_MAX = 80;
const OPACITY_IDLE = 0.3;
const OPACITY_FLOW = 0.1;
const IDLE_TIMEOUT_MS = 3000;
const UPDATE_INTERVAL_MS = 200;

interface TimestampEntry {
  time: number;
}

export class VelocityZenEngine {
  private keystrokes: TimestampEntry[] = [];
  private smoothedWPM = 0;
  private idleTimer: number | null = null;
  private updateTimer: number | null = null;
  private enabled = false;
  private onOpacityChange: (opacity: number) => void;

  constructor(onOpacityChange: (opacity: number) => void) {
    this.onOpacityChange = onOpacityChange;
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    document.addEventListener('keydown', this._handleKeydown, true);
    document.addEventListener('input', this._handleInput, true);
    this._resetIdle();
    this._startUpdateLoop();
  }

  disable(): void {
    this.enabled = false;
    if (this._clearTimers) this._clearTimers();
    this.keystrokes = [];
    this.smoothedWPM = 0;
    // Remove listeners after state clear — failures here don't prevent cleanup above
    try {
      document.removeEventListener('keydown', this._handleKeydown, true);
    } catch (_e) {
      /* already cleaned up or never attached */
    }
    try {
      document.removeEventListener('input', this._handleInput, true);
    } catch (_e) {
      /* already cleaned up or never attached */
    }
  }

  destroy(): void {
    this.disable();
  }

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.isComposing) return;
    if (
      e.key.length === 1 ||
      ['Backspace', 'Delete', 'Enter'].includes(e.key)
    ) {
      this._recordKeystroke();
    }
  };

  private _handleInput = (): void => {
    this._recordKeystroke();
  };

  private _recordKeystroke(): void {
    const now = performance.now();
    this.keystrokes.push({time: now});
    const cutoff = now - WPM_SAMPLE_WINDOW;
    this.keystrokes = this.keystrokes.filter((k) => k.time > cutoff);
    this._resetIdle();
    this._updateWPM();
  }

  private _resetIdle(): void {
    if (this.idleTimer !== null) clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => {
      this._applyOpacity(OPACITY_IDLE);
    }, IDLE_TIMEOUT_MS);
  }

  private _startUpdateLoop(): void {
    const loop = (): void => {
      if (!this.enabled) return;
      this._updateWPM();
      this.updateTimer = window.setTimeout(loop, UPDATE_INTERVAL_MS);
    };
    loop();
  }

  private _updateWPM(): void {
    if (this.keystrokes.length === 0) return;
    const now = performance.now();
    const cutoff = now - WPM_SAMPLE_WINDOW;
    const recent = this.keystrokes.filter((k) => k.time > cutoff);
    if (recent.length < 2) return;

    const elapsed = (recent[recent.length - 1].time - recent[0].time) / 1000;
    if (elapsed < 0.1) return;

    const rawWPM = recent.length / 5 / (elapsed / 60);
    this.smoothedWPM =
      WPM_LOWPASS_ALPHA * rawWPM + (1 - WPM_LOWPASS_ALPHA) * this.smoothedWPM;

    const factor = Math.min(this.smoothedWPM / WPM_MAX, 1);
    const opacity = OPACITY_FLOW + (OPACITY_IDLE - OPACITY_FLOW) * (1 - factor);
    this._applyOpacity(opacity);
  }

  private _applyOpacity(opacity: number): void {
    this.onOpacityChange(Math.round(opacity * 1000) / 1000);
  }

  private _clearTimers(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.updateTimer !== null) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }
}
