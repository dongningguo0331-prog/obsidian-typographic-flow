# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-15

### Fixed

#### Phase 1: Critical Bug Fixes (Stability)
- Reset-to-defaults no longer creates duplicate Compartments (state corruption)
- Typewriter scroll now reads current state in rAF callback (fixes stale cursor position)
- Layout-change handler debounced via requestAnimationFrame (performance cliff)
- Focus mode overlay guard prevents duplicate DOM nodes
- Zen mode timeout race condition fixed (clearTimeout on disable/destroy)
- Wheel/touchmove event listeners use AbortController (memory leak prevention)
- `onunload()` uses optional chaining for all modules (null pointer prevention)
- New `resetToDefaults()` method for clean settings reset

#### Phase 2: High-Priority Polish (Professional Feel)
- Settings validation: corrupt `data.json` values fall back to defaults with warning
- IME composition guard: breathing cursor skips `isComposing` events (CJK input fix)
- Sentence focus mode now scans across line boundaries (paragraph-level detection)
- Intl.Segmenter instance cached at module level (performance)
- Status bar tooltip shows full feature names on hover
- Notice spam eliminated: status bar is primary feedback channel

#### Phase 3: Medium-Priority Polish (Compatibility & Edge Cases)
- `text-autospace` wrapped in `@supports` guard
- `text-box-trim` wrapped in `@supports` guard with margin fallback
- Focus overlay background has `#fff` fallback for transparent themes
- Container query breakpoints use `em` units (zoom-level adaptive)
- Facet combiner uses `reduce()` instead of spread (stack safety)
- `scrollBehavior` cleanup wrapped in try/finally
- Heading detection excludes YAML frontmatter comments
- Zen opacity validated (finite number 0-1, clamped)
- Settings tab method dispatch has `typeof` guard

### Changed
- Status bar is primary feedback channel (Notice removed from toggles, kept for errors/reset)
- Tab key removed from breathing cursor trigger list

## [1.1.0] - 2026-06-14

### Added

#### Engineering Infrastructure
- TypeScript source code (6 modules) reverse-engineered from compiled output
- Build system: esbuild + TypeScript + ESLint + Prettier
- GitHub Actions CI/CD (typecheck → lint → build → release)
- Settings schema versioning with migration support
- `versions.json` for Obsidian version compatibility

#### UX Enhancements
- Toggle commands now show Notice feedback (ON/OFF toast)
- Status bar indicator showing active modes (TW·Z·FL·C·G·CJK)
- "Reset to defaults" button in settings panel
- `layout-change` event listener for sidebar/split-pane recalculation

#### Mobile Support
- Breathing cursor now listens for `input` events (soft keyboard fallback)

#### Error Handling
- `onload` wrapped in try-catch with user-facing Notice on failure
- `getCmView` type guard prevents crashes on non-Markdown views

#### Performance
- `getTypographyConstants` WeakMap cache with CSS variable fingerprinting

### Fixed
- `_deepMerge` logic: added null guard and undefined skip
- Focus mode overlay memory leak: independent cleanup for each overlay div
- 17 ESLint warnings resolved (Intl.Segmenter types, non-null assertions, any types)

### Changed
- Source code restructured into `src/` directory with `engine/` submodules
- `Intl.Segmenter` interfaces moved to module top level
- Setting row types use discriminated unions (ToggleRow | SliderRow | DropdownRow)

## [1.0.0] - 2026-06-11

### Added

#### Typewriter Scrolling
- Typewriter scrolling with configurable center offset (0-100%)
- Dead zone to prevent jitter when editing adjacent lines
- Scroll suspension (pause on manual scroll, resume on typing)
- Smooth scroll animation
- Smart offset (adjusts for headings and empty lines)

#### Focus & Zen Modes
- Zen Mode with configurable opacity
- Focus Mode with 5 modes:
  - Single Line
  - Current Paragraph
  - Current Heading
  - Sentence (experimental)
  - Off

#### Cursor & Animation
- Breathing cursor with configurable duration and minimum opacity
- Strikethrough animation with configurable reveal duration

#### Typography
- Baseline grid with configurable:
  - Grid unit
  - Y-axis offset
  - Grid line opacity (light/dark)
  - Corner radius coefficient
- CJK Prose formatting:
  - Half-width punctuation
  - Leading punctuation margin trim
  - Text justification (with CJK algorithm)
  - First-line indent (Reading View only)

#### Reading Colors
- Zen-inspired color palette with configurable:
  - Accent hue shift
  - Accent saturation
  - Background warmth
  - Text contrast

### Technical
- CodeMirror 6 ViewPlugins for typewriter scroll and focus mode
- Facets for runtime configuration
- Compartments for dynamic extension reconfiguration
- CSS custom properties for JS ↔ CSS bridge
- Settings schema versioning with migration support
