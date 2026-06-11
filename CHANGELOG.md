# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
