/**
 * Typewriter Scroll — keep cursor at a fixed vertical position.
 *
 * Two CM6 ViewPlugins:
 *  1. TypewriterScrollPaddingPlugin — sets content padding so the first
 *     line can be scrolled to the center offset.
 *  2. TypewriterScrollPlugin — re-centers on cursor after edits/moves.
 *
 * Five Facets expose runtime configuration to the plugins.
 */

import { Facet, Transaction } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

// ── Recovery timeout for scroll suspension (ms) ──
const SUSPEND_RECOVERY_MS = 3000;

// ── Facets ──

export const typewriterOffset = Facet.define<number, number>({
  combine: (values) => (values.length ? values.reduce((a, b) => Math.min(a, b), Infinity) : 0.5),
});

export const deadZoneFacet = Facet.define<number, number>({
  combine: (values) => (values.length ? values[values.length - 1] : 2),
});

export const suspensionEnabled = Facet.define<boolean, boolean>({
  combine: (values) => (values.length ? values[values.length - 1] : true),
});

export const smoothScrollEnabled = Facet.define<boolean, boolean>({
  combine: (values) => (values.length ? values[values.length - 1] : true),
});

export const smartOffsetEnabled = Facet.define<boolean, boolean>({
  combine: (values) => (values.length ? values[values.length - 1] : true),
});

// ── Typography constants (read from CSS custom properties) ──
// Cached per scrollDOM — values only change when grid module toggles,
// which re-creates the ViewPlugin anyway.

interface TypographyConstants {
  lhNormal: number;
  lhHeading: number;
  gridUnit: number;
}

const _typoCache = new WeakMap<Element, { styles: TypographyConstants; cssText: string }>();

function getTypographyConstants(view: EditorView): TypographyConstants {
  const dom = view.scrollDOM;
  // Fast path: check if CSS variables changed by comparing a fingerprint
  const computed = window.getComputedStyle(dom);
  const fp = computed.getPropertyValue('--tf-lh-normal') + '|' +
             computed.getPropertyValue('--tf-lh-heading') + '|' +
             computed.getPropertyValue('--tf-grid-unit');
  const cached = _typoCache.get(dom);
  if (cached && cached.cssText === fp) return cached.styles;

  const styles: TypographyConstants = {
    lhNormal: ((n: number) => (Number.isNaN(n) ? 24 : n))(
      parseInt(computed.getPropertyValue('--tf-lh-normal')),
    ),
    lhHeading: ((n: number) => (Number.isNaN(n) ? 32 : n))(
      parseInt(computed.getPropertyValue('--tf-lh-heading')),
    ),
    gridUnit: ((n: number) => (Number.isNaN(n) ? 16 : n))(
      parseInt(computed.getPropertyValue('--tf-grid-unit')),
    ),
  };
  _typoCache.set(dom, { styles, cssText: fp });
  return styles;
}

// ── Offset computation ──

function computeEffectiveOffset(
  doc: import('@codemirror/state').Text,
  pos: number | null | undefined,
  domHeight: number,
  baseOffset: number,
  smartEnabled: boolean,
  typo: TypographyConstants,
): number {
  const offset = domHeight * baseOffset - typo.lhNormal / 2;

  if (!smartEnabled || pos == null) return offset;

  try {
    const line = doc.lineAt(pos);
    const text = line.text;

    // Headings: shift up slightly
    if (/^#{1,6}\s/.test(text)) {
      return domHeight * baseOffset * 0.6 - typo.lhHeading / 2;
    }

    // Empty lines: shift down slightly
    if (text.trim() === '') {
      return domHeight * baseOffset * 0.9 - typo.lhNormal / 2;
    }
  } catch (_e) {
    // pos out of range — fall through
  }

  return offset;
}

// ── Padding Plugin ──

class TypewriterScrollPaddingPlugin {
  constructor(private view: EditorView) {}

  update(update: import('@codemirror/view').ViewUpdate): void {
    // Ignore pure pointer selections (click-to-place-cursor)
    const userEvents = update.transactions
      .map((tr) => tr.annotation(Transaction.userEvent))
      .filter(Boolean);

    if (
      update.selectionSet &&
      !update.docChanged &&
      userEvents.length === 1 &&
      userEvents[0] === 'select.pointer'
    ) {
      return;
    }

    const baseOffset = update.view.state.facet(typewriterOffset);
    const smartEnabled = update.view.state.facet(smartOffsetEnabled);
    const pos = update.view.state.selection.main.head;
    const typo = getTypographyConstants(update.view);

    const offset = computeEffectiveOffset(
      update.view.state.doc,
      pos,
      update.view.dom.clientHeight,
      baseOffset,
      smartEnabled,
      typo,
    );

    const topPadding = `${offset}px`;
    if (topPadding !== this.view.contentDOM.style.paddingTop) {
      this.view.contentDOM.style.paddingTop = topPadding;
      this.view.contentDOM.style.paddingBottom =
        update.view.dom.clientHeight - offset + 'px';
    }
  }
}

// ── Scroll Plugin ──

class TypewriterScrollPlugin {
  private myUpdate = false;
  private lastCenteredLine = -1;
  private suspended = false;
  private _activeScrollGen = 0;
  private _suspendedTimer: ReturnType<typeof setTimeout> | null = null;
  private isScrolling = false;
  private expectingScroll = false;
  private _abortController: AbortController;

  constructor(private view: EditorView) {
    this._abortController = new AbortController();
    const self = this;
    const scrollHandler = () => {
      if (!self.isScrolling && !self.expectingScroll) {
        self.suspended = true;
        self._armSuspendedRecovery();
      }
    };
    this.view.scrollDOM.addEventListener('wheel', scrollHandler, {
      passive: true,
      signal: this._abortController.signal,
    });
    this.view.scrollDOM.addEventListener('touchmove', scrollHandler, {
      passive: true,
      signal: this._abortController.signal,
    });
  }

  private _armSuspendedRecovery(): void {
    if (this._suspendedTimer) clearTimeout(this._suspendedTimer);
    const self = this;
    this._suspendedTimer = setTimeout(() => {
      if (self.suspended) {
        self.suspended = false;
        self._suspendedTimer = null;
      }
    }, SUSPEND_RECOVERY_MS);
  }

  private _clearSuspendedRecovery(): void {
    if (this._suspendedTimer) {
      clearTimeout(this._suspendedTimer);
      this._suspendedTimer = null;
    }
  }

  update(update: import('@codemirror/view').ViewUpdate): void {
    // Suppress transitions during viewport changes (e.g. file open)
    if (update.viewportChanged) {
      update.view.contentDOM.classList.add('tf-no-transition');
      const self = this;
      this.view.requestMeasure({
        read() {},
        write() {
          self.view.contentDOM.classList.remove('tf-no-transition');
        },
      });
    }

    if (this.myUpdate) {
      this.myUpdate = false;
      return;
    }

    const userEvents = update.transactions
      .map((tr) => tr.annotation(Transaction.userEvent))
      .filter(Boolean);

    const hasPointerEvent = userEvents.some((e) => e === 'select.pointer');
    const isValidCursorMove = update.selectionSet && !hasPointerEvent;
    const isTextEdit =
      update.docChanged &&
      userEvents.some(
        (e) =>
          e &&
          (e.startsWith('input') ||
            e.startsWith('delete') ||
            e.startsWith('undo') ||
            e.startsWith('redo') ||
            e === 'paste'),
      );
    const isResumeClick =
      this.suspended &&
      update.view.state.facet(suspensionEnabled) &&
      hasPointerEvent;

    if (isValidCursorMove || isTextEdit || isResumeClick) {
      const hasExplicitUserAction = userEvents.length > 0;

      // If suspension is on and we're suspended with no explicit action, skip
      if (
        update.view.state.facet(suspensionEnabled) &&
        this.suspended &&
        !hasExplicitUserAction
      ) {
        return;
      }

      this.suspended = false;
      this._clearSuspendedRecovery();
      this.expectingScroll = true;
      this.centerOnHead(update);
    }
  }

  private centerOnHead(_update: import('@codemirror/view').ViewUpdate): void {
    const self = this;
    window.requestAnimationFrame(() => {
      // Use current state, not the captured update state — may have changed since the update
      const view = self.view;
      const state = view.state;

      if (state.selection.ranges.length !== 1) {
        self.expectingScroll = false;
        return;
      }

      const head = state.selection.main.head;
      const headLine = state.doc.lineAt(head).number;
      const dz = state.facet(deadZoneFacet);

      // Dead zone: skip if cursor hasn't moved enough lines
      if (
        self.lastCenteredLine !== -1 &&
        Math.abs(headLine - self.lastCenteredLine) < dz
      ) {
        self.expectingScroll = false;
        return;
      }

      const domHeight = view.dom.clientHeight;
      const baseOffset = state.facet(typewriterOffset);
      const smartEnabled = state.facet(smartOffsetEnabled);
      const typo = getTypographyConstants(view);

      const offset = computeEffectiveOffset(
        state.doc,
        head,
        domHeight,
        baseOffset,
        smartEnabled,
        typo,
      );

      const useSmooth = state.facet(smoothScrollEnabled);
      if (useSmooth) {
        view.scrollDOM.style.scrollBehavior = 'smooth';
      }

      self._activeScrollGen++;
      const scrollGen = self._activeScrollGen;
      self.isScrolling = true;
      self.expectingScroll = false;
      self.myUpdate = true;

      try {
        const effect = EditorView.scrollIntoView(head, { y: 'start', yMargin: offset });
        view.dispatch({ effects: [effect] });
      } finally {
        // Always ensure scrollBehavior is restored, even if dispatch throws
      }

      if (useSmooth) {
        const onScrollEnd = () => {
          if (self._activeScrollGen !== scrollGen) return;
          clearTimeout(fallbackTimer);
          view.scrollDOM.style.scrollBehavior = 'auto';
          view.scrollDOM.removeEventListener('scrollend', onScrollEnd);
          self.isScrolling = false;
        };
        view.scrollDOM.addEventListener('scrollend', onScrollEnd, {
          once: false,
        });

        const fallbackTimer = setTimeout(() => {
          if (self._activeScrollGen !== scrollGen) return;
          view.scrollDOM.removeEventListener('scrollend', onScrollEnd);
          if (view.scrollDOM.style.scrollBehavior === 'smooth') {
            view.scrollDOM.style.scrollBehavior = 'auto';
          }
          self.isScrolling = false;
        }, 600);
      } else {
        setTimeout(() => {
          if (self._activeScrollGen !== scrollGen) return;
          self.isScrolling = false;
        }, 50);
      }

      self.lastCenteredLine = headLine;
    });
  }

  destroy(): void {
    this._abortController.abort();
    this._clearSuspendedRecovery();
  }
}

// ── ViewPlugin instances ──

export const typewriterScrollPaddingPlugin =
  ViewPlugin.fromClass(TypewriterScrollPaddingPlugin);

export const typewriterScrollPlugin =
  ViewPlugin.fromClass(TypewriterScrollPlugin);

// ── Extension builder ──

export interface TypewriterSettings {
  typewriterOffset: number;
  deadZone: number;
  suspensionEnabled: boolean;
  smoothScrollEnabled: boolean;
  smartOffsetEnabled: boolean;
}

export function buildTypewriterExtensions(
  settings: TypewriterSettings,
): import('@codemirror/state').Extension[] {
  return [
    typewriterOffset.of(settings.typewriterOffset),
    deadZoneFacet.of(settings.deadZone),
    suspensionEnabled.of(settings.suspensionEnabled),
    smoothScrollEnabled.of(settings.smoothScrollEnabled),
    smartOffsetEnabled.of(settings.smartOffsetEnabled),
    typewriterScrollPaddingPlugin,
    typewriterScrollPlugin,
  ];
}
