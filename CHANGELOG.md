# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
