# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.1] - 2026-07-18

### Added

#### Dynamic Zen Mode (Velocity-Driven Fading)
- Zen Mode upgraded from boolean toggle to three-state dropdown: Off / Static / Dynamic
- Dynamic mode: non-active line opacity responds to typing speed (WPM) in real time
- Fast typing → deep dim (0.1 opacity), idle >3s → gentle fade back (0.3 opacity)
- First-order low-pass filter smooths the WPM signal for natural transitions
- 0.3s CSS transition for dynamic mode, 0.8s for static mode
- `changeZenMode()` replaces `toggleZen()`; old `zenEnabled` boolean auto-migrated

#### Grid Auto-Calibration
- New "Auto Calibrate" toggle in Typography section
- Measures the theme's natural font line-height via a hidden probe element
- Auto-computes optimal `--grid-unit` value (snap to even, clamp 10-20)
- Triggers on plugin init and theme change (`css-change` event), 500ms debounce
- Grid Unit slider becomes read-only when auto-calibrate is active

#### NLP Sentence Focus Filter
- Sentence mode now detects unclosed markdown syntax in sentence boundaries
- Skips sentence splitting when text contains unclosed `$...$`, `[[...]]`, `**...**`, etc.
- Prevents visual breakage of inline math, wikilinks, bold, and footnotes

#### Missing Command Registration
- Register `Toggle Baseline Grid Lines` command (was documented in README but never registered)

### Changed
- Zen mode command (Ctrl+P) now cycles: Off → Static → Dynamic → Off
- Status bar indicator uses `zenMode !== 'off'` instead of old `zenEnabled`
- **Internal architecture**: split `main.ts` orchestration into 10 self-contained feature modules under `src/modules/`
- Settings tab now consumes typed setting rows from modules instead of stringly-typed method names
- Status bar prefix fixed from garbled character to `⚙`

### Fixed
- `VelocityZenEngine` now properly destroyed on plugin unload (memory leak fix)
- `zenMode` field validated in settings loader
- `versions.json` updated with v1.3.0 compatibility entry
- Module lifecycle is now idempotent, fixing accumulated `layout-change`/`css-change` listeners on reset-to-defaults
- Typewriter scroll extensions no longer resurrect on `layout-change` after being disabled
- Grid auto-calibration no longer re-activates typewriter scroll when it is disabled
- `resetToDefaults()` now fully tears down all modules (velocityZen, focus compartment, cursor positions)
- `changeGridAutoCalibrate` now immediately registers/unregisters the `css-change` listener

## [1.3.0] - 2026-06-17

### Added

#### Fullscreen Writing Mode
- Hide all UI elements (sidebar, titlebar, status bar, tabs) for distraction-free writing
- Exit button (top-left arrow) + F11 toggle + Esc exit + command palette toggle
- Vignette overlay effect (radial / box / none styles)
- Save and restore layout state on enable/disable

#### Cursor Position Restore
- Per-file cursor and scroll position persistence via CM6 ViewPlugin
- Restores on file-open event (typewriter-mode pattern)
- File rename/delete tracking
- Settings: `cursorRestoreEnabled` (default: ON)

#### Focus Opacity Control
- New `focusOpacity` setting (slider, default: 0.25, aligned with Zen opacity)
- Line-mode overlay now uses `--focus-opacity` CSS variable (was hardcoded 0.4)

#### Embed Block Preservation
- Math formulas, callouts, and tables never dimmed in Zen/Focus mode
- Aligns with Typewriter Mode and iA Writer behavior

### Fixed

- `toggleBreathe` now applies `setDuration`/`setMinOpacity` when enabling (CSS variables were stale)
- Empty `finally` block in scroll centering now correctly handles dispatch errors
- 5 boolean settings keys added to validation array (`fullscreenEnabled`, `fullscreenShowHeader`, `fullscreenShowStatusBar`, `fullscreenShowVignette`, `cursorRestoreEnabled`)
- Focus mode frontmatter scan cached via `WeakMap` (O(n²) → O(n))
- `scrollend` listener cleanup via `AbortController.signal` (memory leak prevention)
- `container-type: inline-size` replaced with `@media` queries (fixes table layout in narrow viewports)
- Table narrow-viewport responsive protection (`min-width`, `word-break`, `overflow-x`)
- `<mark>` element line-height inheritance for highlight rendering in tables

### Changed
- Zen + Focus coexistence: embed blocks no longer dimmed (math/callout/tables stay visible)
- Focus opacity default aligned to 0.25 (was hardcoded 0.5)

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
