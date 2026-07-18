/**
 * Mindful Font Weight — dynamic wght axis modulation based on typing speed.
 *
 * Maps WPM (words per minute) to a CSS variable --flow-wght that shifts
 * the font weight of the active line. Fast typing = lighter (sharper),
 * pausing = heavier (ink bleeding effect).
 *
 * Performance: zero DOM mutations, only CSS variable injection.
 */

import type {EditorView, ViewUpdate} from '@codemirror/view';

// ── Typing Speed Tracker (sliding window) ──

class TypingSpeedTracker {
  private timestamps: number[] = [];
  private readonly windowMs = 500;

  recordKeystroke(): number {
    const now = performance.now();
    this.timestamps.push(now);
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length < 2) return 0;

    const elapsed =
      (this.timestamps[this.timestamps.length - 1] - this.timestamps[0]) / 1000;
    if (elapsed < 0.1) return 0;

    // WPM = (chars / 5) / (time in minutes) = count * 60 / 5 / elapsed
    return (this.timestamps.length / 5) * (60 / elapsed);
  }

  reset(): void {
    this.timestamps = [];
  }
}

// ── Flow State Manager ──

export interface FlowStateSettings {
  enabled: boolean;
  sensitivity: number; // WPM threshold (30-100)
  weightRange: number; // max wght delta (10-80)
}

export const FLOW_DEFAULTS: FlowStateSettings = {
  enabled: false,
  sensitivity: 50,
  weightRange: 30,
};

export class FlowStateManager {
  private _enabled = false;
  private _sensitivity = FLOW_DEFAULTS.sensitivity;
  private _weightRange = FLOW_DEFAULTS.weightRange;
  private _tracker = new TypingSpeedTracker();
  private _decayTimer: ReturnType<typeof setTimeout> | null = null;
  private _currentDelta = 0;
  private _views: Set<EditorView> = new Set();

  get isEnabled(): boolean {
    return this._enabled;
  }

  enable(): void {
    this._enabled = true;
  }

  disable(): void {
    this._enabled = false;
    this._tracker.reset();
    this._clearDecayTimer();
    // Reset all views to default weight
    for (const view of this._views) {
      view.contentDOM.style.setProperty('--flow-wght', '0');
    }
    this._currentDelta = 0;
  }

  setSensitivity(v: number): void {
    this._sensitivity = Math.max(10, Math.min(100, v));
  }

  setWeightRange(v: number): void {
    this._weightRange = Math.max(10, Math.min(80, v));
  }

  /** Register a view for flow state tracking */
  registerView(view: EditorView): void {
    this._views.add(view);
  }

  /** Unregister a view */
  unregisterView(view: EditorView): void {
    this._views.delete(view);
  }

  /** Called on every CM6 update — update flow state */
  onUpdate(update: ViewUpdate): void {
    if (!this._enabled) return;
    if (!update.docChanged) return;

    // Auto-register view for cleanup on disable
    this._views.add(update.view);

    const wpm = this._tracker.recordKeystroke();
    this._applyFlowState(update.view, wpm);
    this._resetDecayTimer(update.view);
  }

  private _applyFlowState(view: EditorView, wpm: number): void {
    let delta = 0;
    if (wpm > this._sensitivity) {
      // Flow state: lighter weight (sharper, faster feel)
      delta = -this._weightRange;
    } else if (wpm < this._sensitivity * 0.5) {
      // Slow/hesitant: slightly heavier
      delta = Math.round(this._weightRange * 0.5);
    }
    // else: normal, delta = 0

    if (delta !== this._currentDelta) {
      this._currentDelta = delta;
      view.contentDOM.style.setProperty('--flow-wght', String(delta));
    }
  }

  private _resetDecayTimer(view: EditorView): void {
    this._clearDecayTimer();
    this._decayTimer = setTimeout(() => {
      // Pause detected: transition to "thinking" state (heavier weight)
      if (!this._enabled) return;
      const thinkingDelta = Math.round(this._weightRange * 1.5);
      this._currentDelta = thinkingDelta;
      view.contentDOM.style.setProperty('--flow-wght', String(thinkingDelta));
    }, 2000);
  }

  private _clearDecayTimer(): void {
    if (this._decayTimer) {
      clearTimeout(this._decayTimer);
      this._decayTimer = null;
    }
  }

  destroy(): void {
    this.disable();
    this._views.clear();
  }
}

// ── Module-level singleton for ViewPlugin access ──

let _flowStateInstance: FlowStateManager | null = null;

export function setFlowStateForViewPlugin(
  instance: FlowStateManager | null,
): void {
  _flowStateInstance = instance;
}

export function getFlowStateManager(): FlowStateManager | null {
  return _flowStateInstance;
}
