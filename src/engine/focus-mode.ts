/**
 * Focus Mode — dim lines outside the current semantic range.
 *
 * Modes: off | line | paragraph | heading | sentence
 *
 * For line mode: uses two DOM overlay divs (top/bottom) for performance.
 * For semantic modes (paragraph/heading/sentence): uses CM6 line decorations.
 */

import {Facet, RangeSet, RangeSetBuilder} from '@codemirror/state';
import {Decoration, ViewPlugin} from '@codemirror/view';
import {syntaxTree} from '@codemirror/language';
import type {EditorView, ViewUpdate} from '@codemirror/view';
import type {Extension, Text} from '@codemirror/state';
import type {SyntaxNode} from '@lezer/common';

// ── Intl.Segmenter types (not yet in lib.dom.d.ts) ──

interface IntlSegmenter {
  segment(input: string): IterableIterator<{segment: string; index: number}>;
}
interface IntlWithSegmenter {
  Segmenter?: new (
    locales?: string[],
    options?: {granularity: string},
  ) => IntlSegmenter;
}

// ── Cached Segmenter instance ──
const _sentenceSegmenter: IntlSegmenter | null = (() => {
  const intlWithSeg =
    typeof Intl !== 'undefined'
      ? (Intl as unknown as IntlWithSegmenter)
      : undefined;
  if (intlWithSeg?.Segmenter) {
    try {
      return new intlWithSeg.Segmenter([], {granularity: 'sentence'});
    } catch (_e) {
      // Intl.Segmenter may not be available in all environments
      return null;
    }
  }
  return null;
})();

// ── Syntax-aware sentence filtering ──

const SYNTAX_PAIRS: [RegExp, RegExp][] = [
  [/\$[^$]/, /\$[^$]\$/],
  [/\[\[/, /\]\]/],
  [/!\[\[/, /\]\]/],
  [/\*\*/, /\*\*/],
  [/__/, /__/],
  [/~~/, /~~/],
  [/\[<?\^/, /\]/],
  [/\b`{1,2}/, /`{1,2}/],
];

function hasUnclosedSyntax(text: string): boolean {
  for (const [open, close] of SYNTAX_PAIRS) {
    const openCount = (text.match(new RegExp(open.source, 'g')) || []).length;
    const closeCount = (text.match(new RegExp(close.source, 'g')) || []).length;
    if (openCount !== closeCount) return true;
  }
  return false;
}

// ── Facet ──

export type FocusMode = 'off' | 'line' | 'paragraph' | 'heading' | 'sentence';

export const focusModeFacet = Facet.define<FocusMode, FocusMode>({
  combine: (values) => (values.length ? values[values.length - 1] : 'off'),
});

// ── Viewport buffer for decoration range (lines beyond visible area) ──
const FOCUS_VIEWPORT_BUFFER = 100;

// ── Helpers ──

function isInsideCodeBlock(
  tree: ReturnType<typeof syntaxTree>,
  pos: number,
): boolean {
  let node: SyntaxNode | null = tree.resolve(pos, -1);
  while (node) {
    const name = node.type.name;
    if (name === 'FencedCode' || name === 'HTMLBlock' || name === 'Comment') {
      return true;
    }
    node = node.parent;
  }
  return false;
}

function isInsideFrontmatter(doc: Text, lineNum: number): boolean {
  // YAML frontmatter: first line must be '---', closed by next '---'
  if (lineNum <= 1) return false;
  if (doc.line(1).text.trim() !== '---') return false;
  // Cache the closing line per document to avoid O(n) scan on every call
  const cached = _fmEndCache.get(doc);
  if (cached !== undefined) return lineNum <= cached;
  for (let i = 2; i <= doc.lines; i++) {
    if (doc.line(i).text.trim() === '---') {
      _fmEndCache.set(doc, i);
      return lineNum <= i;
    }
  }
  // No closing --- found, cache as 0 (no frontmatter region)
  _fmEndCache.set(doc, 0);
  return false;
}
const _fmEndCache = new WeakMap<Text, number>();

function getParagraphBounds(
  doc: Text,
  cursorLine: number,
): {start: number; end: number} {
  let start = cursorLine;
  while (start > 1 && doc.line(start - 1).text.trim() !== '') {
    start--;
  }

  let end = cursorLine;
  const totalLines = doc.lines;
  while (end < totalLines && doc.line(end + 1).text.trim() !== '') {
    end++;
  }

  return {start, end};
}

function getSectionBounds(
  doc: Text,
  cursorLine: number,
  tree: ReturnType<typeof syntaxTree>,
): {start: number; end: number; level: number} {
  let headingLine = 0;
  let headingLevel = 1;

  // Find the nearest heading above cursor
  for (let i = cursorLine; i >= 1; i--) {
    const line = doc.line(i);
    const match = line.text.match(/^(#{1,6})\s/);
    if (
      match &&
      !isInsideCodeBlock(tree, line.from) &&
      !isInsideFrontmatter(doc, i)
    ) {
      headingLine = i;
      headingLevel = match[1].length;
      break;
    }
  }

  const start = headingLine > 0 ? headingLine : 1;
  let end = doc.lines;

  // Find the next heading at same or higher level
  for (let i = cursorLine + 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const match = line.text.match(/^(#{1,6})\s/);
    if (
      match &&
      match[1].length <= headingLevel &&
      !isInsideCodeBlock(tree, line.from) &&
      !isInsideFrontmatter(doc, i)
    ) {
      end = i - 1;
      break;
    }
  }

  return {start, end, level: headingLevel};
}

function getSentenceBounds(
  doc: Text,
  cursorPos: number,
): {start: number; end: number} {
  const cursorLine = doc.lineAt(cursorPos);

  // Gather the current paragraph (contiguous non-empty lines)
  let paraStart = cursorLine.from;
  let paraEnd = cursorLine.to;
  let ln = cursorLine.number;
  while (ln > 1 && doc.line(ln - 1).text.trim() !== '') {
    ln--;
    paraStart = doc.line(ln).from;
  }
  ln = cursorLine.number;
  while (ln < doc.lines && doc.line(ln + 1).text.trim() !== '') {
    ln++;
    paraEnd = doc.line(ln).to;
  }

  const paraText = doc.sliceString(paraStart, paraEnd);
  const col = cursorPos - paraStart;

  // Try cached Intl.Segmenter
  if (_sentenceSegmenter) {
    try {
      const segments = _sentenceSegmenter.segment(paraText);
      let result = {from: 0, to: paraText.length};
      let segResult = segments.next();

      while (!segResult.done) {
        const seg = segResult.value.segment;
        const segStart = segResult.value.index;
        const segEnd = segStart + seg.length;
        if (segStart <= col && col < segEnd) {
          result = {from: segStart, to: segEnd};
          break;
        }
        segResult = segments.next();
      }

      return {
        start: paraStart + result.from,
        end: paraStart + result.to,
      };
    } catch (_e) {
      console.warn(
        '[TypographicFlow] Focus mode sentence segmentation failed',
        _e,
      );
      // Fall through to regex fallback
    }
  }

  // Fallback: regex-based sentence detection across paragraph
  let start = 0;
  let end = paraText.length;
  const regex = /[.!?…]{1,3}(\s|$)|[。！？…]+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(paraText)) !== null) {
    const delimEnd = match.index + match[0].length;
    if (delimEnd <= col) {
      start = delimEnd;
    } else {
      end = delimEnd;
      break;
    }
  }

  // Trim leading whitespace
  while (start < end && (paraText[start] === ' ' || paraText[start] === '\t')) {
    start++;
  }

  const result = {
    start: paraStart + start,
    end: paraStart + end,
  };

  // ── NLP Filter: merge sentence if syntax is broken ──
  const sentenceText = doc.sliceString(result.start, result.end);
  try {
    if (hasUnclosedSyntax(sentenceText)) {
      if (result.start > paraStart) result.start = paraStart;
      if (result.end < paraEnd) result.end = paraEnd;
    }
  } catch (_e) {
    // hasUnclosedSyntax regex failed — keep wider sentence bounds
  }

  return result;
}

// ── Plugin ──

class FocusModePlugin {
  /** Public — read by ViewPlugin.decorations accessor. */
  decorations: RangeSet<Decoration>;
  private overlayTop: HTMLDivElement | null = null;
  private overlayBottom: HTMLDivElement | null = null;
  private _scrollHandler: (() => void) | null = null;
  private _lastFocusMode: FocusMode | null = null;
  private _lastBounds: {
    vrFrom: number;
    vrTo: number;
    start: number;
    end: number;
  } | null = null;

  constructor(private view: EditorView) {
    this.decorations = RangeSet.empty;
  }

  private computeBounds(
    state: import('@codemirror/state').EditorState,
    tree: ReturnType<typeof syntaxTree>,
  ): {start: number; end: number} | null {
    const doc = state.doc;
    const pos = state.selection.main.head;
    const ln = doc.lineAt(pos).number;
    const mode = state.facet(focusModeFacet);

    switch (mode) {
      case 'paragraph':
        return getParagraphBounds(doc, ln);
      case 'heading':
        return getSectionBounds(doc, ln, tree);
      case 'sentence': {
        const rb = getSentenceBounds(doc, pos);
        return {
          start: doc.lineAt(rb.start).number,
          end: doc.lineAt(rb.end).number,
        };
      }
      default:
        return null;
    }
  }

  private createOverlays(): void {
    // Guard against duplicate overlay creation
    if (this.overlayTop || this.overlayBottom) {
      this.destroyOverlays();
    }

    const scroller = this.view.scrollDOM;

    this.overlayTop = document.createElement('div');
    this.overlayTop.className =
      'tf-focus-line-overlay tf-focus-line-overlay-top';

    this.overlayBottom = document.createElement('div');
    this.overlayBottom.className =
      'tf-focus-line-overlay tf-focus-line-overlay-bottom';

    scroller.appendChild(this.overlayTop);
    scroller.appendChild(this.overlayBottom);

    const self = this;
    this._scrollHandler = () => self.positionOverlays();
    scroller.addEventListener('scroll', this._scrollHandler, {passive: true});
  }

  private positionOverlays(): void {
    if (!this.overlayTop) return;

    const self = this;
    const v = this.view;
    const pos = Math.min(v.state.selection.main.head, v.state.doc.length);

    v.requestMeasure({
      read(view) {
        const coords = view.coordsAtPos(pos);
        if (!coords) return {lineTop: -1, lineBottom: -1, contentH: 0};

        const scrollerRect = view.scrollDOM.getBoundingClientRect();
        return {
          lineTop: coords.top - scrollerRect.top + view.scrollDOM.scrollTop,
          lineBottom:
            coords.bottom - scrollerRect.top + view.scrollDOM.scrollTop,
          contentH: view.contentDOM.scrollHeight,
        };
      },
      write(data) {
        if (
          data.lineTop < 0 ||
          data.lineBottom < 0 ||
          !self.overlayTop ||
          !self.overlayBottom
        )
          return;
        self.overlayTop.style.top = '0px';
        self.overlayTop.style.height = Math.max(0, data.lineTop) + 'px';
        self.overlayBottom.style.top = data.lineBottom + 'px';
        self.overlayBottom.style.height =
          Math.max(0, data.contentH - data.lineBottom) + 'px';
      },
    });
  }

  private destroyOverlays(): void {
    if (this.overlayTop) {
      this.overlayTop.remove();
      this.overlayTop = null;
    }
    if (this.overlayBottom) {
      this.overlayBottom.remove();
      this.overlayBottom = null;
    }
    if (this._scrollHandler && this.view) {
      this.view.scrollDOM.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }
  }

  update(update: ViewUpdate): void {
    this.view = update.view;
    const mode = update.state.facet(focusModeFacet);

    if (mode === 'off') {
      this.decorations = RangeSet.empty;
      this.destroyOverlays();
      this._lastFocusMode = null;
      this._lastBounds = null;
      return;
    }

    // Mode changed — reset state
    if (mode !== this._lastFocusMode) {
      this._lastFocusMode = mode;
      this._lastBounds = null;
      if (mode === 'line') {
        this.decorations = RangeSet.empty;
      } else {
        this.destroyOverlays();
      }
    }

    // Line mode: overlay-based
    if (mode === 'line') {
      this._updateLineOverlays(update);
      return;
    }

    // Semantic modes: decoration-based
    if (
      !update.docChanged &&
      !update.selectionSet &&
      !update.viewportChanged &&
      !update.geometryChanged
    ) {
      return;
    }
    this._updateSemanticDecorations(update);
  }

  private _updateLineOverlays(update: ViewUpdate): void {
    if (!this.overlayTop) {
      this.createOverlays();
      const self = this;
      requestAnimationFrame(() => self.positionOverlays());
    }

    if (
      update.docChanged ||
      update.selectionSet ||
      update.geometryChanged ||
      update.viewportChanged
    ) {
      this.positionOverlays();
    }
  }

  private _updateSemanticDecorations(update: ViewUpdate): void {
    const doc = update.state.doc;
    const tree = syntaxTree(update.state);
    const bounds = this.computeBounds(update.state, tree);

    // Compute visible range
    const vr = update.view.visibleRanges;
    let vrFrom = doc.length;
    let vrTo = 0;
    for (let vi = 0; vi < vr.length; vi++) {
      if (vr[vi].from < vrFrom) vrFrom = vr[vi].from;
      if (vr[vi].to > vrTo) vrTo = vr[vi].to;
    }

    // Skip if nothing changed
    if (
      this._lastBounds &&
      bounds &&
      this._lastBounds.start === bounds.start &&
      this._lastBounds.end === bounds.end &&
      this._lastBounds.vrFrom === vrFrom &&
      this._lastBounds.vrTo === vrTo
    ) {
      return;
    }

    this._lastBounds = {
      vrFrom,
      vrTo,
      start: bounds ? bounds.start : 0,
      end: bounds ? bounds.end : 0,
    };

    if (!bounds) {
      this.decorations = RangeSet.empty;
      return;
    }

    // Build decorations for lines outside the focus range
    let visibleStart = doc.lineAt(vrFrom).number;
    let visibleEnd = doc.lineAt(vrTo).number;
    visibleStart = Math.max(1, visibleStart - FOCUS_VIEWPORT_BUFFER);
    visibleEnd = Math.min(doc.lines, visibleEnd + FOCUS_VIEWPORT_BUFFER);

    const builder = new RangeSetBuilder<Decoration>();
    for (let i = visibleStart; i <= visibleEnd; i++) {
      if (i >= bounds.start && i <= bounds.end) continue;
      const line = doc.line(i);
      builder.add(
        line.from,
        line.from,
        Decoration.line({class: 'tf-focus-dim'}),
      );
    }
    this.decorations = builder.finish();
  }

  destroy(): void {
    this.destroyOverlays();
  }
}

// ── ViewPlugin ──

export const focusModePlugin = ViewPlugin.fromClass(FocusModePlugin, {
  decorations: (v) => v.decorations,
});

// ── Extension builder ──

export function buildFocusExtensions(mode: FocusMode): Extension[] {
  if (mode === 'off') return [];
  return [focusModePlugin, focusModeFacet.of(mode)];
}
