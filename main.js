"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TypographicFlowPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_state3 = require("@codemirror/state");

// engine/typewriter.ts
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");
var SUSPEND_RECOVERY_MS = 3e3;
var typewriterOffset = import_state.Facet.define({
  combine: (values) => values.length ? Math.min(...values) : 0.5
});
var deadZoneFacet = import_state.Facet.define({
  combine: (values) => values.length ? values[values.length - 1] : 2
});
var suspensionEnabled = import_state.Facet.define({
  combine: (values) => values.length ? values[values.length - 1] : true
});
var smoothScrollEnabled = import_state.Facet.define({
  combine: (values) => values.length ? values[values.length - 1] : true
});
var smartOffsetEnabled = import_state.Facet.define({
  combine: (values) => values.length ? values[values.length - 1] : true
});
function getTypographyConstants(view) {
  const styles = window.getComputedStyle(view.scrollDOM);
  return {
    lhNormal: (n => Number.isNaN(n) ? 24 : n)(parseInt(styles.getPropertyValue("--tf-lh-normal"))),
    lhHeading: (n => Number.isNaN(n) ? 32 : n)(parseInt(styles.getPropertyValue("--tf-lh-heading"))),
    gridUnit: (n => Number.isNaN(n) ? 16 : n)(parseInt(styles.getPropertyValue("--tf-grid-unit")))
  };
}
function computeEffectiveOffset(doc, pos, domHeight, baseOffset, smartEnabled, typo) {
  const offset = domHeight * baseOffset - typo.lhNormal / 2;
  if (!smartEnabled || pos == null) return offset;
  try {
    const line = doc.lineAt(pos);
    const text = line.text;
    if (/^#{1,6}\s/.test(text)) {
      return domHeight * baseOffset * 0.6 - typo.lhHeading / 2;
    }
    if (text.trim() === "") {
      return domHeight * baseOffset * 0.9 - typo.lhNormal / 2;
    }
  } catch (_e) {
  }
  return offset;
}
var TypewriterScrollPaddingPlugin = class {
  constructor(view) {
    this.view = view;
  }
  update(update) {
    const userEvents = update.transactions.map((tr) => tr.annotation(import_state.Transaction.userEvent)).filter(Boolean);
    if (update.selectionSet && !update.docChanged && userEvents.length === 1 && userEvents[0] === "select.pointer") {
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
      typo
    );
    const topPadding = `${offset}px`;
    if (topPadding !== this.view.contentDOM.style.paddingTop) {
      this.view.contentDOM.style.paddingTop = topPadding;
      this.view.contentDOM.style.paddingBottom = update.view.dom.clientHeight - offset + "px";
    }
  }
};
var TypewriterScrollPlugin = class {
  constructor(view) {
    this.view = view;
    this.myUpdate = false;
    this.lastCenteredLine = -1;
    this.suspended = false;
    this._activeScrollGen = 0;
    this._suspendedTimer = null;
    this.isScrolling = false;
    this.expectingScroll = false;
    const self = this;
    this._scrollHandler = () => {
      if (!self.isScrolling && !self.expectingScroll) {
        self.suspended = true;
        self._armSuspendedRecovery();
      }
    };
    this.view.scrollDOM.addEventListener("wheel", this._scrollHandler, { passive: true });
    this.view.scrollDOM.addEventListener("touchmove", this._scrollHandler, { passive: true });
  }
  _armSuspendedRecovery() {
    if (this._suspendedTimer) clearTimeout(this._suspendedTimer);
    const self = this;
    this._suspendedTimer = setTimeout(() => {
      if (self.suspended) {
        self.suspended = false;
        self._suspendedTimer = null;
      }
    }, SUSPEND_RECOVERY_MS);
  }
  _clearSuspendedRecovery() {
    if (this._suspendedTimer) {
      clearTimeout(this._suspendedTimer);
      this._suspendedTimer = null;
    }
  }
  update(update) {
    if (update.viewportChanged) {
      update.view.contentDOM.classList.add("tf-no-transition");
      const self = this;
      this.view.requestMeasure({
        read() {
        },
        write() {
          self.view.contentDOM.classList.remove("tf-no-transition");
        }
      });
    }
    if (this.myUpdate) {
      this.myUpdate = false;
      return;
    }
    const userEvents = update.transactions.map((tr) => tr.annotation(import_state.Transaction.userEvent)).filter(Boolean);
    const hasPointerEvent = userEvents.some((e) => e === "select.pointer");
    const isValidCursorMove = update.selectionSet && !hasPointerEvent;
    const isTextEdit = update.docChanged && userEvents.some(
      (e) => e && (e.startsWith("input") || e.startsWith("delete") || e.startsWith("undo") || e.startsWith("redo") || e === "paste")
    );
    const isResumeClick = this.suspended && update.view.state.facet(suspensionEnabled) && hasPointerEvent;
    if (isValidCursorMove || isTextEdit || isResumeClick) {
      const hasExplicitUserAction = userEvents.length > 0;
      if (update.view.state.facet(suspensionEnabled) && this.suspended && !hasExplicitUserAction) {
        return;
      }
      this.suspended = false;
      this._clearSuspendedRecovery();
      this.expectingScroll = true;
      this.centerOnHead(update);
    }
  }
  centerOnHead(update) {
    const self = this;
    window.requestAnimationFrame(() => {
      if (update.view.state.selection.ranges.length !== 1) {
        self.expectingScroll = false;
        return;
      }
      const head = update.view.state.selection.main.head;
      const headLine = update.view.state.doc.lineAt(head).number;
      const dz = update.view.state.facet(deadZoneFacet);
      if (self.lastCenteredLine !== -1 && Math.abs(headLine - self.lastCenteredLine) < dz) {
        self.expectingScroll = false;
        return;
      }
      const domHeight = update.view.dom.clientHeight;
      const baseOffset = update.view.state.facet(typewriterOffset);
      const smartEnabled = update.view.state.facet(smartOffsetEnabled);
      const typo = getTypographyConstants(update.view);
      const offset = computeEffectiveOffset(
        update.view.state.doc,
        head,
        domHeight,
        baseOffset,
        smartEnabled,
        typo
      );
      const useSmooth = update.view.state.facet(smoothScrollEnabled);
      if (useSmooth) {
        update.view.scrollDOM.style.scrollBehavior = "smooth";
      }
      self._activeScrollGen++;
      const scrollGen = self._activeScrollGen;
      self.isScrolling = true;
      self.expectingScroll = false;
      self.myUpdate = true;
      const effect = import_view.EditorView.scrollIntoView(head, { y: "start", yMargin: offset });
      update.view.dispatch({ effects: [effect] });
      if (useSmooth) {
        const onScrollEnd = () => {
          if (self._activeScrollGen !== scrollGen) return;
          clearTimeout(fallbackTimer);
          update.view.scrollDOM.style.scrollBehavior = "auto";
          update.view.scrollDOM.removeEventListener("scrollend", onScrollEnd);
          self.isScrolling = false;
        };
        update.view.scrollDOM.addEventListener("scrollend", onScrollEnd, { once: false });
        const fallbackTimer = setTimeout(() => {
          if (self._activeScrollGen !== scrollGen) return;
          update.view.scrollDOM.removeEventListener("scrollend", onScrollEnd);
          if (update.view.scrollDOM.style.scrollBehavior === "smooth") {
            update.view.scrollDOM.style.scrollBehavior = "auto";
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
  destroy() {
    this.view.scrollDOM.removeEventListener("wheel", this._scrollHandler);
    this.view.scrollDOM.removeEventListener("touchmove", this._scrollHandler);
    this._clearSuspendedRecovery();
  }
};
var typewriterScrollPaddingPlugin = import_view.ViewPlugin.fromClass(TypewriterScrollPaddingPlugin);
var typewriterScrollPlugin = import_view.ViewPlugin.fromClass(TypewriterScrollPlugin);
function buildTypewriterExtensions(settings) {
  return [
    typewriterOffset.of(settings.typewriterOffset),
    deadZoneFacet.of(settings.deadZone),
    suspensionEnabled.of(settings.suspensionEnabled),
    smoothScrollEnabled.of(settings.smoothScrollEnabled),
    smartOffsetEnabled.of(settings.smartOffsetEnabled),
    typewriterScrollPaddingPlugin,
    typewriterScrollPlugin
  ];
}

// engine/focus-mode.ts
var import_state2 = require("@codemirror/state");
var import_view2 = require("@codemirror/view");
var import_language = require("@codemirror/language");
var focusModeFacet = import_state2.Facet.define({
  combine: (values) => values.length ? values[values.length - 1] : "off"
});
var FOCUS_VIEWPORT_BUFFER = 100;
function isInsideCodeBlock(tree, pos) {
  let node = tree.resolve(pos, -1);
  while (node) {
    const name = node.type.name;
    if (name === "FencedCode" || name === "HTMLBlock" || name === "Comment") {
      return true;
    }
    node = node.parent;
  }
  return false;
}
function getParagraphBounds(doc, cursorLine) {
  let start = cursorLine;
  while (start > 1 && doc.line(start - 1).text.trim() !== "") {
    start--;
  }
  let end = cursorLine;
  const totalLines = doc.lines;
  while (end < totalLines && doc.line(end + 1).text.trim() !== "") {
    end++;
  }
  return { start, end };
}
function getSectionBounds(doc, cursorLine, tree) {
  let headingLine = 0;
  let headingLevel = 1;
  for (let i = cursorLine; i >= 1; i--) {
    const line = doc.line(i);
    const match = line.text.match(/^(#{1,6})\s/);
    if (match && !isInsideCodeBlock(tree, line.from)) {
      headingLine = i;
      headingLevel = match[1].length;
      break;
    }
  }
  const start = headingLine > 0 ? headingLine : 1;
  let end = doc.lines;
  for (let i = cursorLine + 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const match = line.text.match(/^(#{1,6})\s/);
    if (match && match[1].length <= headingLevel && !isInsideCodeBlock(tree, line.from)) {
      end = i - 1;
      break;
    }
  }
  return { start, end, level: headingLevel };
}
function getSentenceBounds(doc, cursorPos) {
  const line = doc.lineAt(cursorPos);
  const text = line.text;
  const col = cursorPos - line.from;
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter([], { granularity: "sentence" });
      const segments = segmenter.segment(text);
      let result = { from: 0, to: text.length };
      let segResult = segments.next();
      while (!segResult.done) {
        const seg = segResult.value.segment;
        const segStart = segResult.value.index;
        const segEnd = segStart + seg.length;
        if (segStart <= col && col < segEnd) {
          result = { from: segStart, to: segEnd };
          break;
        }
        segResult = segments.next();
      }
      return {
        start: line.from + result.from,
        end: line.from + result.to
      };
    } catch (_e) {
    }
  }
  let start = 0;
  let end = text.length;
  const regex = /[.!?…]{1,3}(\s|$)|[。！？…]+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const delimEnd = match.index + match[0].length;
    if (delimEnd <= col) {
      start = delimEnd;
    } else {
      end = delimEnd;
      break;
    }
  }
  while (start < end && (text[start] === " " || text[start] === "	")) {
    start++;
  }
  return {
    start: line.from + start,
    end: line.from + end
  };
}
var FocusModePlugin = class {
  constructor(view) {
    this.view = view;
    this.decorations = import_state2.RangeSet.empty;
    this.overlayTop = null;
    this.overlayBottom = null;
    this._scrollHandler = null;
    this._lastFocusMode = null;
    this._lastBounds = null;
  }
  computeBounds(state, tree) {
    const doc = state.doc;
    const pos = state.selection.main.head;
    const ln = doc.lineAt(pos).number;
    const mode = state.facet(focusModeFacet);
    switch (mode) {
      case "paragraph":
        return getParagraphBounds(doc, ln);
      case "heading":
        return getSectionBounds(doc, ln, tree);
      case "sentence": {
        const rb = getSentenceBounds(doc, pos);
        return { start: doc.lineAt(rb.start).number, end: doc.lineAt(rb.end).number };
      }
      default:
        return null;
    }
  }
  createOverlays() {
    const scroller = this.view.scrollDOM;
    this.overlayTop = document.createElement("div");
    this.overlayTop.className = "tf-focus-line-overlay tf-focus-line-overlay-top";
    this.overlayBottom = document.createElement("div");
    this.overlayBottom.className = "tf-focus-line-overlay tf-focus-line-overlay-bottom";
    scroller.appendChild(this.overlayTop);
    scroller.appendChild(this.overlayBottom);
    const self = this;
    this._scrollHandler = () => self.positionOverlays();
    scroller.addEventListener("scroll", this._scrollHandler, { passive: true });
  }
  positionOverlays() {
    if (!this.overlayTop) return;
    const self = this;
    const v = this.view;
    const pos = Math.min(v.state.selection.main.head, v.state.doc.length);
    v.requestMeasure({
      read(view) {
        const coords = view.coordsAtPos(pos);
        if (!coords) return { lineTop: -1, lineBottom: -1, contentH: 0 };
        const scrollerRect = view.scrollDOM.getBoundingClientRect();
        return {
          lineTop: coords.top - scrollerRect.top + view.scrollDOM.scrollTop,
          lineBottom: coords.bottom - scrollerRect.top + view.scrollDOM.scrollTop,
          contentH: view.contentDOM.scrollHeight
        };
      },
      write(data) {
        if (data.lineTop < 0 || data.lineBottom < 0 || !self.overlayTop) return;
        self.overlayTop.style.top = "0px";
        self.overlayTop.style.height = Math.max(0, data.lineTop) + "px";
        self.overlayBottom.style.top = data.lineBottom + "px";
        self.overlayBottom.style.height = Math.max(0, data.contentH - data.lineBottom) + "px";
      }
    });
  }
  destroyOverlays() {
    if (this.overlayTop) {
      this.overlayTop.remove();
      this.overlayBottom.remove();
      this.overlayTop = null;
      this.overlayBottom = null;
    }
    if (this._scrollHandler && this.view) {
      this.view.scrollDOM.removeEventListener("scroll", this._scrollHandler);
      this._scrollHandler = null;
    }
  }
  update(update) {
    this.view = update.view;
    const mode = update.state.facet(focusModeFacet);
    if (mode === "off") {
      this.decorations = import_state2.RangeSet.empty;
      this.destroyOverlays();
      this._lastFocusMode = null;
      this._lastBounds = null;
      return;
    }
    if (mode !== this._lastFocusMode) {
      this._lastFocusMode = mode;
      this._lastBounds = null;
      if (mode === "line") {
        this.decorations = import_state2.RangeSet.empty;
      } else {
        this.destroyOverlays();
      }
    }
    if (mode === "line") {
      this._updateLineOverlays(update);
      return;
    }
    if (!update.docChanged && !update.selectionSet && !update.viewportChanged && !update.geometryChanged) {
      return;
    }
    this._updateSemanticDecorations(update);
  }
  _updateLineOverlays(update) {
    if (!this.overlayTop) {
      this.createOverlays();
      const self = this;
      requestAnimationFrame(() => self.positionOverlays());
    }
    if (update.docChanged || update.selectionSet || update.geometryChanged || update.viewportChanged) {
      this.positionOverlays();
    }
  }
  _updateSemanticDecorations(update) {
    const doc = update.state.doc;
    const tree = (0, import_language.syntaxTree)(update.state);
    const bounds = this.computeBounds(update.state, tree);
    const vr = update.view.visibleRanges;
    let vrFrom = doc.length, vrTo = 0;
    for (let vi = 0; vi < vr.length; vi++) {
      if (vr[vi].from < vrFrom) vrFrom = vr[vi].from;
      if (vr[vi].to > vrTo) vrTo = vr[vi].to;
    }
    if (this._lastBounds && bounds && this._lastBounds.start === bounds.start && this._lastBounds.end === bounds.end && this._lastBounds.vrFrom === vrFrom && this._lastBounds.vrTo === vrTo) {
      return;
    }
    this._lastBounds = { vrFrom, vrTo, start: bounds ? bounds.start : 0, end: bounds ? bounds.end : 0 };
    if (!bounds) {
      this.decorations = import_state2.RangeSet.empty;
      return;
    }
    let visibleStart = doc.lineAt(vrFrom).number;
    let visibleEnd = doc.lineAt(vrTo).number;
    visibleStart = Math.max(1, visibleStart - FOCUS_VIEWPORT_BUFFER);
    visibleEnd = Math.min(doc.lines, visibleEnd + FOCUS_VIEWPORT_BUFFER);
    const builder = new import_state2.RangeSetBuilder();
    for (let i = visibleStart; i <= visibleEnd; i++) {
      if (i >= bounds.start && i <= bounds.end) continue;
      const line = doc.line(i);
      builder.add(line.from, line.from, import_view2.Decoration.line({ class: "tf-focus-dim" }));
    }
    this.decorations = builder.finish();
  }
  destroy() {
    this.destroyOverlays();
  }
};
var focusModePlugin = import_view2.ViewPlugin.fromClass(FocusModePlugin, {
  decorations: (v) => v.decorations
});
function buildFocusExtensions(mode) {
  if (mode === "off") return [];
  return [focusModePlugin, focusModeFacet.of(mode)];
}

// engine/zen-mode.ts
var ZEN_BODY_CLASS = "plugin-tf-zen";
var ZEN_ENTERING_CLASS = "tf-zen-entering";
var ZenModeManager = class {
  constructor() {
    this.cssNode = null;
  }
  /** Inject or update the --zen-opacity CSS variable into <head>. */
  setOpacity(opacity) {
    if (!this.cssNode) {
      this.cssNode = document.createElement("style");
      this.cssNode.id = "plugin-tf-zen-opacity";
      document.head.appendChild(this.cssNode);
    }
    this.cssNode.textContent = `body { --zen-opacity: ${opacity}; }`;
  }
  /** Enable Zen Mode: add body class + entry animation. */
  enable() {
    document.body.classList.add(ZEN_BODY_CLASS);
    document.body.classList.add(ZEN_ENTERING_CLASS);
    setTimeout(() => {
      document.body.classList.remove(ZEN_ENTERING_CLASS);
    }, 350);
  }
  /** Disable Zen Mode: remove body class. */
  disable() {
    document.body.classList.remove(ZEN_BODY_CLASS);
    document.body.classList.remove(ZEN_ENTERING_CLASS);
  }
  /** Clean up injected style node. */
  destroy() {
    if (this.cssNode) {
      this.cssNode.remove();
      this.cssNode = null;
    }
    document.body.classList.remove(ZEN_BODY_CLASS);
    document.body.classList.remove(ZEN_ENTERING_CLASS);
  }
};

// engine/breathing-cursor.ts
var BREATHE_CLASS = "plugin-tf-breathe";
var TYPING_CLASS = "tf-breathe-typing";
var BreathingCursorManager = class {
  constructor() {
    this.typingTimer = null;
    this.keyHandler = null;
  }
  enable() {
    document.body.classList.add(BREATHE_CLASS);
    this.attachKeyListener();
  }
  disable() {
    document.body.classList.remove(BREATHE_CLASS, TYPING_CLASS);
    this.detachKeyListener();
  }
  setDuration(d) {
    document.body.style.setProperty("--tf-breathe-duration", d + "s");
  }
  setMinOpacity(o) {
    document.body.style.setProperty("--tf-breathe-min-opacity", String(o));
  }
  notifyActivity() {
    document.body.classList.add(TYPING_CLASS);
    if (this.typingTimer !== null) clearTimeout(this.typingTimer);
    this.typingTimer = window.setTimeout(() => {
      document.body.classList.remove(TYPING_CLASS);
      this.typingTimer = null;
    }, 600);
  }
  destroy() {
    this.disable();
    document.body.style.removeProperty("--tf-breathe-duration");
    document.body.style.removeProperty("--tf-breathe-min-opacity");
    if (this.typingTimer !== null) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }
  attachKeyListener() {
    if (this.keyHandler) return;
    this.keyHandler = (e) => {
      if (e.key.length === 1 || ["Backspace", "Delete", "Enter", "Tab"].includes(e.key)) {
        this.notifyActivity();
      }
    };
    document.addEventListener("keydown", this.keyHandler, true);
  }
  detachKeyListener() {
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler, true);
      this.keyHandler = null;
    }
  }
};

// engine/strikethrough-anim.ts
var STRIKE_CLASS = "plugin-tf-strike-anim";
var StrikethroughAnimManager = class {
  enable() {
    document.body.classList.add(STRIKE_CLASS);
  }
  disable() {
    document.body.classList.remove(STRIKE_CLASS);
  }
  setDuration(d) {
    document.body.style.setProperty("--tf-strike-duration", d + "s");
  }
  destroy() {
    this.disable();
    document.body.style.removeProperty("--tf-strike-duration");
  }
};

// main.ts
function setBodyCSS(key, value) {
  document.body.style.setProperty(key, value);
}
function removeBodyCSS(key) {
  document.body.style.removeProperty(key);
}
function _deepMerge(target, source) {
  const result = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
      result[key] = _deepMerge(target[key], source[key]);
    } else if (!(key in target)) {
      result[key] = source[key];
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
var SETTING_MIGRATIONS = {
  1: (s) => s
};
function migrateSettings(settings) {
  let v = settings.settingsVersion || 0;
  while (v < SETTINGS_VERSION) {
    const fn = SETTING_MIGRATIONS[v + 1];
    if (fn) { settings = fn(settings); v = settings.settingsVersion || v + 1; }
    else { settings.settingsVersion = SETTINGS_VERSION; break; }
  }
  return settings;
}
var SETTINGS_VERSION = 1;
var DEFAULT_SETTINGS = {
  // Typewriter
  enabled: true,
  typewriterOffset: 0.5,
  deadZone: 2,
  suspensionEnabled: true,
  smoothScrollEnabled: true,
  smartOffsetEnabled: true,
  // Zen
  zenEnabled: false,
  zenOpacity: 0.25,
  // Focus
  focusMode: "off",
  // Colors
  colorsEnabled: false,
  colorsAccentHue: 0,
  colorsAccentSat: 0,
  colorsBgWarmth: 0,
  colorsTextContrast: 0,
  // Grid
  gridEnabled: true,
  gridShowLines: true,
  gridUnit: 16,
  gridOffsetY: 35,
  gridLineOpacityLight: 0.045,
  gridLineOpacityDark: 0.04,
  gridRadiusCoef: 0.285,
  // CJK Prose
  cjkProseEnabled: false,
  cjkProseJustify: false,
  cjkProseIndent: false,
  // Breathing Cursor
  breatheEnabled: false,
  breatheDuration: 4,
  breatheMinOpacity: 0.4,
  // Strikethrough Animation
  strikeAnimEnabled: false,
  strikeAnimDuration: 0.35,
  // Schema
  settingsVersion: SETTINGS_VERSION
};
var TypographicFlowPlugin = class extends import_obsidian.Plugin {
  // ---- Lifecycle ----
  async onload() {
    const loaded = await this.loadData();
    const migrated = migrateSettings(loaded || {});
    this.settings = _deepMerge(DEFAULT_SETTINGS, migrated);
    this._compartments = {
      typewriter: new import_state3.Compartment(),
      focusMode: new import_state3.Compartment()
    };
    this._compartmentValues = {
      typewriter: this._compartments.typewriter.of(
        this.settings.enabled ? buildTypewriterExtensions(this.settings) : []
      ),
      focusMode: this._compartments.focusMode.of(
        this.settings.focusMode !== "off" ? buildFocusExtensions(this.settings.focusMode) : []
      )
    };
    this.registerEditorExtension(Object.values(this._compartmentValues));
    this.zenMode = new ZenModeManager();
    if (this.settings.enabled) {
      document.body.classList.add("plugin-cm-typewriter-scroll");
      this.dispatchToEditors(buildTypewriterExtensions(this.settings));
    }
    if (this.settings.zenEnabled) {
      this.zenMode.setOpacity(this.settings.zenOpacity);
      this.zenMode.enable();
    }
    this.breathe = new BreathingCursorManager();
    if (this.settings.breatheEnabled) {
      this.breathe.setDuration(this.settings.breatheDuration);
      this.breathe.setMinOpacity(this.settings.breatheMinOpacity);
      this.breathe.enable();
    }
    this.strike = new StrikethroughAnimManager();
    if (this.settings.strikeAnimEnabled) {
      this.strike.setDuration(this.settings.strikeAnimDuration);
      this.strike.enable();
    }
    if (this.settings.focusMode !== "off") {
      document.body.classList.add("plugin-tf-focus");
      this.dispatchFocusExtensions(this.settings.focusMode);
    }
    if (this.settings.colorsEnabled) this.enableColors();
    if (this.settings.gridEnabled) this.enableGrid();
    if (this.settings.cjkProseEnabled) this.enableCjkProse();
    if (this.settings.cjkProseJustify) this.enableCjkJustify();
    if (this.settings.cjkProseIndent) this.enableCjkIndent();
    this.addSettingTab(new TypographicFlowSettingTab(this.app, this));
    this.addCommands();
  }
  onunload() {
    this.disableTypewriterScroll();
    this.zenMode.disable();
    this.zenMode.destroy();
    this.breathe.destroy();
    this.strike.destroy();
    document.body.classList.remove("plugin-tf-focus");
    this.disableColors();
    this.disableGrid();
    this.disableCjkProse();
    this.disableCjkJustify();
    this.disableCjkIndent();
  }
  // ---- Commands ----
  addCommands() {
    this.addCommand({
      id: "toggle-typewriter-scroll",
      name: "Toggle Typewriter Scrolling On/Off",
      callback: () => this.toggleTypewriterScroll()
    });
    this.addCommand({
      id: "toggle-zen-mode",
      name: "Toggle Zen Mode On/Off",
      callback: () => this.toggleZen()
    });
    this.addCommand({
      id: "cycle-focus-mode",
      name: "Cycle Focus Mode (off \u2192 line \u2192 paragraph \u2192 heading \u2192 sentence)",
      callback: () => {
        const modes = ["off", "line", "paragraph", "heading", "sentence"];
        const idx = modes.indexOf(this.settings.focusMode);
        const next = modes[(idx + 1) % modes.length];
        this.changeFocusMode(next);
      }
    });
    this.addCommand({
      id: "focus-mode-off",
      name: "Turn Off Focus Mode",
      callback: () => this.changeFocusMode("off")
    });
    this.addCommand({
      id: "toggle-colors",
      name: "Toggle Reading Colors On/Off",
      callback: () => this.toggleColors()
    });
    this.addCommand({
      id: "toggle-grid",
      name: "Toggle Baseline Grid On/Off",
      callback: () => this.toggleGrid()
    });
    this.addCommand({
      id: "toggle-cjk-prose",
      name: "Toggle CJK Prose Formatting On/Off",
      callback: () => this.toggleCjkProse()
    });
    this.addCommand({
      id: "toggle-cjk-indent",
      name: "Toggle CJK First-line Indent On/Off",
      callback: () => this.toggleCjkIndent()
    });
    this.addCommand({
      id: "toggle-cjk-justify",
      name: "Toggle CJK Justification On/Off",
      callback: () => this.toggleCjkJustify()
    });
    this.addCommand({
      id: "toggle-breathing-cursor",
      name: "Toggle Breathing Cursor On/Off",
      callback: () => this.toggleBreathe()
    });
    this.addCommand({
      id: "toggle-strikethrough-anim",
      name: "Toggle Strikethrough Animation On/Off",
      callback: () => this.toggleStrikeAnim()
    });
  }
  // ---- Dispatch Helpers ----
  dispatchToEditors(extensions) {
    var _a;
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
      const view = leaf.view;
      const cm = (_a = view.editor) == null ? void 0 : _a.cm;
      if (cm == null ? void 0 : cm.dispatch) {
        cm.dispatch({
          effects: this._compartments.typewriter.reconfigure(extensions)
        });
      }
    }
  }
  dispatchFocusExtensions(mode) {
    var _a;
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    const exts = buildFocusExtensions(mode);
    this._compartmentValues.focusMode = this._compartments.focusMode.of(exts);
    for (const leaf of leaves) {
      const view = leaf.view;
      const cm = (_a = view.editor) == null ? void 0 : _a.cm;
      if (cm == null ? void 0 : cm.dispatch) {
        cm.dispatch({
          effects: this._compartments.focusMode.reconfigure(exts)
        });
      }
    }
  }
  // ---- Typewriter Toggle & Settings ----
  toggleTypewriterScroll(newValue = null) {
    if (newValue === null) newValue = !this.settings.enabled;
    this.settings.enabled = newValue;
    newValue ? this.enableTypewriterScroll() : this.disableTypewriterScroll();
    this.saveData(this.settings);
  }
  enableTypewriterScroll() {
    document.body.classList.add("plugin-cm-typewriter-scroll");
    const exts = buildTypewriterExtensions(this.settings);
    this._compartmentValues.typewriter = this._compartments.typewriter.of(exts);
    this.dispatchToEditors(exts);
  }
  disableTypewriterScroll() {
    var _a;
    document.body.classList.remove("plugin-cm-typewriter-scroll");
    this._compartmentValues.typewriter = this._compartments.typewriter.of([]);
    this.dispatchToEditors([]);
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
      const view = leaf.view;
      const cm = (_a = view.editor) == null ? void 0 : _a.cm;
      if (cm == null ? void 0 : cm.contentDOM) {
        cm.contentDOM.style.paddingTop = "";
        cm.contentDOM.style.paddingBottom = "";
      }
    }
  }
  reconfigureTypewriter() {
    if (!this.settings.enabled) { this.saveData(this.settings); return; }
    const exts = buildTypewriterExtensions(this.settings);
    this._compartmentValues.typewriter = this._compartments.typewriter.of(exts);
    this.dispatchToEditors(exts);
    this.saveData(this.settings);
  }
  changeTypewriterOffset(newValue) {
    this.settings.typewriterOffset = newValue;
    this.reconfigureTypewriter();
  }
  changeDeadZone(newValue) {
    this.settings.deadZone = newValue;
    this.reconfigureTypewriter();
  }
  toggleSuspension(newValue) {
    this.settings.suspensionEnabled = newValue;
    this.reconfigureTypewriter();
  }
  toggleSmoothScroll(newValue) {
    this.settings.smoothScrollEnabled = newValue;
    this.reconfigureTypewriter();
  }
  toggleSmartOffset(newValue) {
    this.settings.smartOffsetEnabled = newValue;
    this.reconfigureTypewriter();
  }
  // ---- Zen Mode ----
  toggleZen(newValue = null) {
    if (newValue === null) newValue = !this.settings.zenEnabled;
    this.settings.zenEnabled = newValue;
    newValue ? this.zenMode.enable() : this.zenMode.disable();
    this.zenMode.setOpacity(this.settings.zenOpacity);
    this.saveData(this.settings);
  }
  changeZenOpacity(newValue) {
    this.settings.zenOpacity = newValue;
    this.zenMode.setOpacity(newValue);
    this.saveData(this.settings);
  }
  // ---- Focus Mode ----
  changeFocusMode(mode = "off") {
    this.settings.focusMode = mode;
    if (mode === "off") {
      document.body.classList.remove("plugin-tf-focus");
    } else {
      document.body.classList.add("plugin-tf-focus");
    }
    this.dispatchFocusExtensions(mode);
    this.saveData(this.settings);
  }
  // ---- Breathing Cursor ----
  toggleBreathe(newValue = null) {
    if (newValue === null) newValue = !this.settings.breatheEnabled;
    this.settings.breatheEnabled = newValue;
    newValue ? this.breathe.enable() : this.breathe.disable();
    this.saveData(this.settings);
  }
  changeBreatheDuration(v) { this._applySetting("breatheDuration", v, "--tf-breathe-duration", "breatheEnabled", "s"); }
  changeBreatheMinOpacity(v) { this._applySetting("breatheMinOpacity", v, "--tf-breathe-min-opacity", "breatheEnabled"); }
  // ---- Strikethrough Animation ----
  toggleStrikeAnim(newValue = null) {
    if (newValue === null) newValue = !this.settings.strikeAnimEnabled;
    this.settings.strikeAnimEnabled = newValue;
    newValue ? this.strike.enable() : this.strike.disable();
    this.strike.setDuration(this.settings.strikeAnimDuration);
    this.saveData(this.settings);
  }
  changeStrikeAnimDuration(v) {
    this.settings.strikeAnimDuration = v;
    if (this.settings.strikeAnimEnabled) this.strike.setDuration(v);
    this.saveData(this.settings);
  }
  // ---- Generic Setting Setter ----
  _applySetting(key, value, cssVar, enabledKey, format) {
    this.settings[key] = value;
    if (this.settings[enabledKey] && cssVar) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        console.warn(`[TypographicFlow] Invalid CSS value for ${key}: ${value}`);
        return this.saveData(this.settings);
      }
      const formatted = format === "px" ? value + "px" : format === "s" ? value + "s" : String(value);
      setBodyCSS(cssVar, formatted);
    }
    this.saveData(this.settings);
  }
  // ============================================================
  //  Phase B: Colors Module
  // ============================================================
  toggleColors(newValue = null) {
    if (newValue === null) newValue = !this.settings.colorsEnabled;
    this.settings.colorsEnabled = newValue;
    newValue ? this.enableColors() : this.disableColors();
    this.saveData(this.settings);
  }
  enableColors() {
    document.body.classList.add("plugin-tf-colors");
    this.applyColorsSettings();
  }
  disableColors() {
    document.body.classList.remove("plugin-tf-colors");
    for (const key of ["--accent-hue", "--accent-sat-adjust", "--bg-warmth", "--text-contrast"]) {
      removeBodyCSS(key);
    }
  }
  applyColorsSettings() {
    setBodyCSS("--accent-hue", String(this.settings.colorsAccentHue));
    setBodyCSS("--accent-sat-adjust", String(this.settings.colorsAccentSat));
    setBodyCSS("--bg-warmth", String(this.settings.colorsBgWarmth));
    setBodyCSS("--text-contrast", String(this.settings.colorsTextContrast));
  }
  changeColorsAccentHue(v) { this._applySetting("colorsAccentHue", v, "--accent-hue", "colorsEnabled"); }
  changeColorsAccentSat(v) { this._applySetting("colorsAccentSat", v, "--accent-sat-adjust", "colorsEnabled"); }
  changeColorsBgWarmth(v) { this._applySetting("colorsBgWarmth", v, "--bg-warmth", "colorsEnabled"); }
  changeColorsTextContrast(v) { this._applySetting("colorsTextContrast", v, "--text-contrast", "colorsEnabled"); }
  // ============================================================
  //  Phase B: Grid Module
  // ============================================================
  toggleGrid(newValue = null) {
    if (newValue === null) newValue = !this.settings.gridEnabled;
    this.settings.gridEnabled = newValue;
    newValue ? this.enableGrid() : this.disableGrid();
    this.saveData(this.settings);
  }
  toggleGridLines(newValue = null) {
    if (newValue === null) newValue = !this.settings.gridShowLines;
    this.settings.gridShowLines = newValue;
    if (newValue) {
      document.body.classList.add("plugin-tf-grid-visible");
    } else {
      document.body.classList.remove("plugin-tf-grid-visible");
    }
    this.saveData(this.settings);
  }
  enableGrid(showLines = this.settings.gridShowLines) {
    document.body.classList.add("plugin-tf-grid");
    if (showLines) {
      document.body.classList.add("plugin-tf-grid-visible");
    }
    this.applyGridSettings();
  }
  disableGrid() {
    document.body.classList.remove("plugin-tf-grid", "plugin-tf-grid-visible");
    for (const key of ["--grid-unit", "--grid-offset-y", "--grid-line-opacity-light", "--grid-line-opacity-dark", "--grid-radius-coef"]) {
      removeBodyCSS(key);
    }
  }
  applyGridSettings() {
    setBodyCSS("--grid-unit", String(this.settings.gridUnit) + "px");
    setBodyCSS("--grid-offset-y", String(this.settings.gridOffsetY) + "px");
    setBodyCSS("--grid-line-opacity-light", String(this.settings.gridLineOpacityLight));
    setBodyCSS("--grid-line-opacity-dark", String(this.settings.gridLineOpacityDark));
    setBodyCSS("--grid-radius-coef", String(this.settings.gridRadiusCoef));
  }
  changeGridUnit(v) { this._applySetting("gridUnit", v, "--grid-unit", "gridEnabled", "px"); }
  changeGridOffsetY(v) { this._applySetting("gridOffsetY", v, "--grid-offset-y", "gridEnabled", "px"); }
  changeGridLineOpacityLight(v) { this._applySetting("gridLineOpacityLight", v, "--grid-line-opacity-light", "gridEnabled"); }
  changeGridLineOpacityDark(v) { this._applySetting("gridLineOpacityDark", v, "--grid-line-opacity-dark", "gridEnabled"); }
  changeGridRadiusCoef(v) { this._applySetting("gridRadiusCoef", v, "--grid-radius-coef", "gridEnabled"); }
  // ============================================================
  //  CJK Prose Formatting (中文段落排版)
  // ============================================================
  toggleCjkProse(newValue = null) {
    if (newValue === null) newValue = !this.settings.cjkProseEnabled;
    this.settings.cjkProseEnabled = newValue;
    newValue ? this.enableCjkProse() : this.disableCjkProse();
    this.saveData(this.settings);
  }
  enableCjkProse() {
    document.body.classList.add("plugin-tf-cjk-prose");
    if (this.settings.cjkProseJustify) document.body.classList.add("plugin-tf-cjk-justify");
    if (this.settings.cjkProseIndent) document.body.classList.add("plugin-tf-cjk-indent");
  }
  disableCjkProse() {
    document.body.classList.remove("plugin-tf-cjk-prose", "plugin-tf-cjk-justify", "plugin-tf-cjk-indent");
  }
  toggleCjkJustify(newValue = null) {
    if (newValue === null) newValue = !this.settings.cjkProseJustify;
    this.settings.cjkProseJustify = newValue;
    if (newValue && !this.settings.cjkProseEnabled) this.toggleCjkProse(true);
    newValue ? this.enableCjkJustify() : this.disableCjkJustify();
    this.saveData(this.settings);
  }
  enableCjkJustify() {
    document.body.classList.add("plugin-tf-cjk-justify");
  }
  disableCjkJustify() {
    document.body.classList.remove("plugin-tf-cjk-justify");
  }
  toggleCjkIndent(newValue = null) {
    if (newValue === null) newValue = !this.settings.cjkProseIndent;
    this.settings.cjkProseIndent = newValue;
    if (newValue && !this.settings.cjkProseEnabled) this.toggleCjkProse(true);
    newValue ? this.enableCjkIndent() : this.disableCjkIndent();
    this.saveData(this.settings);
  }
  enableCjkIndent() {
    document.body.classList.add("plugin-tf-cjk-indent");
  }
  disableCjkIndent() {
    document.body.classList.remove("plugin-tf-cjk-indent");
  }
};
var TypographicFlowSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    let lastSection = null;
    for (const s of TypographicFlowSettingTab._table) {
      if (s.section !== lastSection) {
        containerEl.createEl("h2", { text: s.section });
        lastSection = s.section;
      }
      const setting = new import_obsidian.Setting(containerEl).setName(s.name).setDesc(s.desc);
      const val = () => this.plugin.settings[s.key];
      const call = (v) => this.plugin[s.method](v);
      if (s.type === "toggle") {
        setting.addToggle((t) => t.setValue(val()).onChange(call));
      } else if (s.type === "slider") {
        setting.addSlider((sl) => {
          sl.setLimits(s.min, s.max, s.step);
          const display = s.toSlider ? s.toSlider(val()) : val();
          sl.setValue(display);
          sl.onChange((v) => call(s.fromSlider ? s.fromSlider(v) : v));
        });
      } else if (s.type === "dropdown") {
        setting.addDropdown((dd) => {
          for (const [k, v] of Object.entries(s.options)) dd.addOption(k, v);
          dd.setValue(val());
          dd.onChange(call);
        });
      }
    }
  }
};
TypographicFlowSettingTab._table = [
  // ── Typewriter Scroll / 打字机滚动 ──
  { section: "Typewriter Scroll / \u6253\u5B57\u673A\u6EDA\u52A8", name: "Toggle Typewriter Scrolling", desc: "Enable or disable typewriter scrolling", key: "enabled", type: "toggle", method: "toggleTypewriterScroll" },
  { section: "Typewriter Scroll / \u6253\u5B57\u673A\u6EDA\u52A8", name: "Center offset / \u5C45\u4E2D\u504F\u79FB", desc: "Cursor position as % of screen height (50 = center)", key: "typewriterOffset", type: "slider", min: 0, max: 100, step: 5, toSlider: (v) => v * 100, fromSlider: (v) => v / 100, method: "changeTypewriterOffset" },
  { section: "Typewriter Scroll / \u6253\u5B57\u673A\u6EDA\u52A8", name: "Dead Zone / \u6B7B\u533A", desc: "Lines to move before re-centering (prevents jitter)", key: "deadZone", type: "slider", min: 0, max: 10, step: 1, method: "changeDeadZone" },
  { section: "Typewriter Scroll / \u6253\u5B57\u673A\u6EDA\u52A8", name: "Scroll Suspension / \u6EDA\u52A8\u6682\u505C", desc: "Pause auto-center on manual scroll, resume on typing", key: "suspensionEnabled", type: "toggle", method: "toggleSuspension" },
  { section: "Typewriter Scroll / \u6253\u5B57\u673A\u6EDA\u52A8", name: "Smooth Scroll / \u5E73\u6ED1\u6EDA\u52A8", desc: "Animate scroll to cursor position", key: "smoothScrollEnabled", type: "toggle", method: "toggleSmoothScroll" },
  { section: "Typewriter Scroll / \u6253\u5B57\u673A\u6EDA\u52A8", name: "Smart Offset / \u667A\u80FD\u504F\u79FB", desc: "Adjust position for headings and empty lines", key: "smartOffsetEnabled", type: "toggle", method: "toggleSmartOffset" },
  // ── Focus & Zen / 专注模式 ──
  { section: "Focus & Zen / \u4E13\u6CE8\u6A21\u5F0F", name: "Zen Mode / \u7985\u6A21\u5F0F", desc: "Dim non-active lines while typing", key: "zenEnabled", type: "toggle", method: "toggleZen" },
  { section: "Focus & Zen / \u4E13\u6CE8\u6A21\u5F0F", name: "Zen Opacity / \u7985\u6A21\u5F0F\u900F\u660E\u5EA6", desc: "Brightness of dimmed lines (lower = darker)", key: "zenOpacity", type: "slider", min: 0, max: 100, step: 5, toSlider: (v) => v * 100, fromSlider: (v) => v / 100, method: "changeZenOpacity" },
  { section: "Focus & Zen / \u4E13\u6CE8\u6A21\u5F0F", name: "Focus Mode / \u805A\u7126\u6A21\u5F0F", desc: "Dim lines outside current range", key: "focusMode", type: "dropdown", options: { off: "Off", line: "Single Line", paragraph: "Current Paragraph", heading: "Current Heading", sentence: "Sentence (experimental)" }, method: "changeFocusMode" },
  // ── Cursor & Animation / 光标与动画 ──
  { section: "Cursor & Animation / \u5149\u6807\u4E0E\u52A8\u753B", name: "Enable Breathing Cursor / \u547C\u5438\u5149\u6807", desc: "Smooth fade cycle instead of binary blink", key: "breatheEnabled", type: "toggle", method: "toggleBreathe" },
  { section: "Cursor & Animation / \u5149\u6807\u4E0E\u52A8\u753B", name: "Breath Duration / \u547C\u5438\u5468\u671F", desc: "Speed of one breath cycle (seconds)", key: "breatheDuration", type: "slider", min: 2, max: 8, step: 0.5, method: "changeBreatheDuration" },
  { section: "Cursor & Animation / \u5149\u6807\u4E0E\u52A8\u753B", name: "Minimum Opacity / \u6700\u4F4E\u900F\u660E\u5EA6", desc: "Lowest brightness in breath cycle", key: "breatheMinOpacity", type: "slider", min: 0.1, max: 0.8, step: 0.05, method: "changeBreatheMinOpacity" },
  { section: "Cursor & Animation / \u5149\u6807\u4E0E\u52A8\u753B", name: "Enable Strikethrough Animation / \u5220\u9664\u7EBF\u52A8\u753B", desc: "Animate ~~strikethrough~~ from left to right", key: "strikeAnimEnabled", type: "toggle", method: "toggleStrikeAnim" },
  { section: "Cursor & Animation / \u5149\u6807\u4E0E\u52A8\u753B", name: "Reveal Duration / \u52A8\u753B\u65F6\u957F", desc: "Speed of strikethrough animation (seconds)", key: "strikeAnimDuration", type: "slider", min: 0.1, max: 0.8, step: 0.05, method: "changeStrikeAnimDuration" },
  // ── Typography / 排版 ──
  { section: "Typography / \u6392\u7248", name: "Enable Baseline Grid / \u57FA\u7EBF\u7F51\u683C", desc: "Align text to a vertical grid for consistent spacing", key: "gridEnabled", type: "toggle", method: "toggleGrid" },
  { section: "Typography / \u6392\u7248", name: "Show Grid Lines / \u663E\u793A\u7F51\u683C\u7EBF", desc: "Show grid lines (layout stays active when off)", key: "gridShowLines", type: "toggle", method: "toggleGridLines" },
  { section: "Typography / \u6392\u7248", name: "Grid Unit / \u7F51\u683C\u6A21\u6570", desc: "Base unit for grid spacing (px)", key: "gridUnit", type: "slider", min: 10, max: 20, step: 1, method: "changeGridUnit" },
  { section: "Typography / \u6392\u7248", name: "Y-axis Offset / Y\u8F74\u504F\u79FB", desc: "Vertical offset of grid lines (px)", key: "gridOffsetY", type: "slider", min: 20, max: 40, step: 1, method: "changeGridOffsetY" },
  { section: "Typography / \u6392\u7248", name: "Grid Line Opacity (Light) / \u6D45\u8272\u6A21\u5F0F\u900F\u660E\u5EA6", desc: "Grid line brightness in light mode", key: "gridLineOpacityLight", type: "slider", min: 0, max: 0.15, step: 5e-3, method: "changeGridLineOpacityLight" },
  { section: "Typography / \u6392\u7248", name: "Grid Line Opacity (Dark) / \u6DF1\u8272\u6A21\u5F0F\u900F\u660E\u5EA6", desc: "Grid line brightness in dark mode", key: "gridLineOpacityDark", type: "slider", min: 0, max: 0.15, step: 5e-3, method: "changeGridLineOpacityDark" },
  { section: "Typography / \u6392\u7248", name: "Corner Radius Coefficient / \u5706\u89D2\u7CFB\u6570", desc: "Roundness of corners (0 = sharp)", key: "gridRadiusCoef", type: "slider", min: 0, max: 1, step: 0.05, method: "changeGridRadiusCoef" },
  { section: "Typography / \u6392\u7248", name: "Enable CJK Prose / \u4E2D\u6587\u6392\u7248", desc: "CJK typography: half-width punctuation + margin trim", key: "cjkProseEnabled", type: "toggle", method: "toggleCjkProse" },
  { section: "Typography / \u6392\u7248", name: "Justify Text / \u4E24\u7AEF\u5BF9\u9F50", desc: "Justify text \u26A0 May cause uneven spacing in Live Preview", key: "cjkProseJustify", type: "toggle", method: "toggleCjkJustify" },
  { section: "Typography / \u6392\u7248", name: "First-line Indent / \u9996\u884C\u7F29\u8FDB", desc: "Indent first line \u26A0 Reading View only", key: "cjkProseIndent", type: "toggle", method: "toggleCjkIndent" },
  // ── Colors / 配色 ──
  { section: "Colors / \u914D\u8272", name: "Enable Reading Colors / \u9605\u8BFB\u914D\u8272", desc: "Apply zen reading color palette", key: "colorsEnabled", type: "toggle", method: "toggleColors" },
  { section: "Colors / \u914D\u8272", name: "Accent Hue Shift / \u5F3A\u8C03\u8272\u8272\u76F8", desc: "Shift accent color (0 = green, + = warm, \u2212 = cool)", key: "colorsAccentHue", type: "slider", min: -30, max: 30, step: 1, method: "changeColorsAccentHue" },
  { section: "Colors / \u914D\u8272", name: "Accent Saturation / \u5F3A\u8C03\u8272\u9971\u548C\u5EA6", desc: "Accent color intensity", key: "colorsAccentSat", type: "slider", min: -30, max: 30, step: 1, method: "changeColorsAccentSat" },
  { section: "Colors / \u914D\u8272", name: "Background Warmth / \u80CC\u666F\u6696\u5EA6", desc: "Background tone (0 = neutral)", key: "colorsBgWarmth", type: "slider", min: -10, max: 10, step: 1, method: "changeColorsBgWarmth" },
  { section: "Colors / \u914D\u8272", name: "Text Contrast / \u6587\u5B57\u5BF9\u6BD4\u5EA6", desc: "Text darkness/brightness", key: "colorsTextContrast", type: "slider", min: -15, max: 15, step: 1, method: "changeColorsTextContrast" }
];
