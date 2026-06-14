# Typographic Flow for Obsidian

[![GitHub release](https://img.shields.io/github/v/release/dongningguo0331-prog/obsidian-typographic-flow?style=for-the-badge&sort=semver)](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/releases/latest)
[![Obsidian](https://img.shields.io/badge/Obsidian-%23483699.svg?style=for-the-badge&logo=obsidian&logoColor=white)](https://obsidian.md/)
[![License](https://img.shields.io/github/license/dongningguo0331-prog/obsidian-typographic-flow?style=for-the-badge)](LICENSE)

English | [中文](README.zh-CN.md)

**Typographic Flow** turns Obsidian into a professional typographic writing environment. It unifies typewriter scrolling, focus modes, reading colors, baseline grid, and CJK typography into a single, cohesive plugin — so your editor looks and feels like a dedicated writing app.

> If you've ever wished Obsidian felt more like iA Writer, Ulysses, or a typewriter — this plugin is for you.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Settings Reference](#settings-reference)
- [CSS Classes for Per-Note Customization](#css-classes-for-per-note-customization)
- [Compatibility](#compatibility)
- [FAQ](#faq)
- [Acknowledgements](#acknowledgements)
- [License](#license)

---

## Features

### Typewriter Scrolling

Keep your cursor at a fixed vertical position on the screen as you type — like a typewriter. No more chasing the cursor to the bottom of the viewport.

- **Center offset** — Position the cursor at any height (0–100%, default: 50% = center)
- **Dead zone** — Prevent jitter when editing adjacent lines (default: 2 lines)
- **Scroll suspension** — Pause auto-centering when you scroll manually; resume on typing
- **Smooth scroll** — Animated scrolling to cursor position
- **Smart offset** — Automatically adjust position for headings (shift up) and empty lines (shift down)

**How it works:** The plugin uses CodeMirror 6 ViewPlugins to detect cursor movement and text edits, then calculates the optimal scroll position using CSS custom properties for typography constants. The dead zone prevents constant re-centering when you're editing nearby lines.

### Focus & Zen Modes

Reduce visual noise while writing. Two complementary approaches:

#### Zen Mode
Dims **all non-active lines** to a configurable opacity. The active line stays bright. Works with code blocks, quotes, and embed blocks.

#### Focus Mode
Dims lines **outside the current semantic range**. Four modes available:

| Mode | What stays bright | Use case |
|------|-------------------|----------|
| **Single Line** | Current line only | Precise editing |
| **Current Paragraph** | Current paragraph | Prose writing |
| **Current Heading** | Current section (until next heading) | Structured documents |
| **Sentence** | Current sentence | Experimental |

**Zen + Focus coexistence:** When both are active, the plugin creates a three-layer visual gradient: active line (brightest) → focus range (medium) → rest (dimmest).

### Cursor & Animation

Subtle visual enhancements that make writing feel more alive.

- **Breathing cursor** — Smooth fade cycle instead of binary blink. Pauses when you're actively typing, resumes when you stop.
- **Strikethrough animation** — Animate ~~strikethrough~~ text from left to right, like a pen crossing out words.

Both animations respect `prefers-reduced-motion` for accessibility.

### Baseline Grid

Align text to a vertical grid for consistent spacing — the same principle used in professional print typography.

- **Grid unit** — Base unit for spacing (default: 16px)
- **Grid lines** — Optional visual grid overlay (can be hidden while layout stays active)
- **Y-axis offset** — Fine-tune vertical alignment
- **Line opacity** — Separate controls for light and dark mode
- **Corner radius** — Adjust rounded corners on code blocks and callouts

**Key benefit:** Even with grid lines hidden, the deterministic layout engine ensures integer-pixel line heights, which eliminates sub-pixel rendering jitter in scroll operations.

### CJK Prose Formatting

Professional Chinese/Japanese/Korean typography support:

- **Half-width punctuation** — Via OpenType `halt` feature
- **Leading punctuation margin trim** — Via `text-spacing-trim`
- **Text justification** — CJK-specific `inter-ideograph` algorithm with `text-align-last: left`
- **First-line indent** — 2em indent (Reading View only)

**Default behavior:** Text is left-aligned (not justified). This is intentional — in CM6 Live Preview, `text-align: justify` on per-line DIVs causes the "river effect" (河流效应). Left alignment produces a clean right edge because CJK characters are naturally monospaced.

### Reading Colors

A zen-inspired color palette for comfortable reading, built with modern CSS (`oklch`, `light-dark()`, `color-mix`).

- **Accent hue** — Shift accent color (warm ↔ cool, ±30°)
- **Accent saturation** — Control color intensity
- **Background warmth** — Adjust background tone (cream ↔ ash)
- **Text contrast** — Fine-tune text darkness/brightness

**Technical note:** Uses `oklch()` color space for perceptually uniform adjustments. The `light-dark()` function automatically adapts to Obsidian's light/dark theme. The GRAD font variation setting compensates for optical weight changes between light and dark backgrounds.

---

## Installation

### From Obsidian (Recommended)

1. Open Obsidian Settings → Community Plugins
2. Click **Browse** and search for "Typographic Flow"
3. Click **Install**, then **Enable**

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/releases)
2. Extract the plugin folder to your vault's plugins directory:
   ```
   <your-vault>/.obsidian/plugins/obsidian-typographic-flow/
   ```
3. Reload Obsidian (Ctrl/Cmd+P → "Reload app without saving")
4. Enable the plugin in Settings → Community Plugins

### Beta Versions with BRAT

1. Install the [BRAT plugin](https://obsidian.md/plugins?id=obsidian42-brat)
2. Open BRAT settings → Add Beta Plugin
3. Enter: `https://github.com/dongningguo0331-prog/obsidian-typographic-flow`
4. Enable the plugin in Community Plugins

---

## Quick Start

After installation, the plugin is active with default settings. Here's a recommended setup:

1. **Enable Typewriter Scrolling** — The core feature. Your cursor stays centered.
2. **Enable Baseline Grid** — Aligns text to a vertical grid for consistent spacing.
3. **Try Focus Mode** — Use the command "Cycle Focus Mode" to see different focus levels.
4. **Adjust Reading Colors** — If you find the default colors too stark, enable Reading Colors and tweak the warmth slider.

All features can be toggled via the Command Palette (Ctrl/Cmd+P). Type "Typographic Flow" to see all available commands.

---

## Commands

All features can be toggled via the Command Palette (Ctrl/Cmd+P):

| Command | Description | Default |
|---------|-------------|---------|
| Toggle Typewriter Scrolling | Enable/disable typewriter scroll | ON |
| Toggle Zen Mode | Enable/disable zen mode | OFF |
| Cycle Focus Mode | Cycle through focus modes (off → line → paragraph → heading → sentence) | — |
| Turn Off Focus Mode | Disable focus mode | — |
| Toggle Reading Colors | Enable/disable reading color palette | OFF |
| Toggle Baseline Grid | Enable/disable baseline grid | ON |
| Toggle Baseline Grid Lines | Show/hide visual grid lines | ON |
| Toggle CJK Prose | Enable/disable CJK typography | OFF |
| Toggle CJK First-line Indent | Enable/disable first-line indent | OFF |
| Toggle CJK Justification | Enable/disable text justification | OFF |
| Toggle Breathing Cursor | Enable/disable breathing cursor | OFF |
| Toggle Strikethrough Animation | Enable/disable strikethrough animation | OFF |

Each toggle shows a Notice (ON/OFF toast) for feedback. The status bar shows active modes as abbreviations (e.g., `⚙ TW·Z·FL·C·G·CJK`).

---

## Settings Reference

Access settings via: Settings → Community Plugins → Typographic Flow → ⚙️

### Typewriter Scroll

| Setting | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| Toggle Typewriter Scrolling | Toggle | — | ON | Master switch for typewriter scroll |
| Center offset | Slider | 0–100% | 50% | Cursor position as % of screen height |
| Dead Zone | Slider | 0–10 | 2 | Lines to move before re-centering |
| Scroll Suspension | Toggle | — | ON | Pause on manual scroll, resume on typing |
| Smooth Scroll | Toggle | — | ON | Animate scroll to cursor |
| Smart Offset | Toggle | — | ON | Adjust for headings and empty lines |

### Focus & Zen

| Setting | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| Zen Mode | Toggle | — | OFF | Dim non-active lines |
| Zen Opacity | Slider | 0–100% | 25% | Brightness of dimmed lines |
| Focus Mode | Dropdown | off/line/paragraph/heading/sentence | off | Semantic focus mode |

### Cursor & Animation

| Setting | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| Breathing Cursor | Toggle | — | OFF | Smooth fade cycle for cursor |
| Breath Duration | Slider | 2–8s | 4s | Speed of one breath cycle |
| Minimum Opacity | Slider | 0.1–0.8 | 0.4 | Lowest brightness in cycle |
| Strikethrough Animation | Toggle | — | OFF | Animate ~~strikethrough~~ text |
| Reveal Duration | Slider | 0.1–0.8s | 0.35s | Speed of strikethrough animation |

### Typography

| Setting | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| Baseline Grid | Toggle | — | ON | Align text to vertical grid |
| Show Grid Lines | Toggle | — | ON | Visual grid overlay |
| Grid Unit | Slider | 10–20px | 16px | Base unit for grid spacing |
| Y-axis Offset | Slider | 20–40px | 35px | Vertical offset of grid lines |
| Grid Line Opacity (Light) | Slider | 0–0.15 | 0.045 | Grid brightness in light mode |
| Grid Line Opacity (Dark) | Slider | 0–0.15 | 0.04 | Grid brightness in dark mode |
| Corner Radius Coefficient | Slider | 0–1 | 0.285 | Roundness of corners |
| CJK Prose | Toggle | — | OFF | CJK typography |
| Justify Text | Toggle | — | OFF | CJK justification |
| First-line Indent | Toggle | — | OFF | 2em indent (Reading View only) |

### Colors

| Setting | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| Reading Colors | Toggle | — | OFF | Enable color palette |
| Accent Hue Shift | Slider | -30 to +30 | 0 | Shift accent color |
| Accent Saturation | Slider | -30 to +30 | 0 | Control color intensity |
| Background Warmth | Slider | -10 to +10 | 0 | Background tone |
| Text Contrast | Slider | -15 to +15 | 0 | Text darkness/brightness |

---

## CSS Classes for Per-Note Customization

Add these classes to a note's `cssclasses` frontmatter to customize its appearance:

```yaml
---
cssclasses:
  - wide-reading
  - compact
  - eye-care
  - no-grid
  - study-note
  - english-reading
---
```

| Class | Effect |
|-------|--------|
| `wide-reading` | Max-width 900px with 2rem padding |
| `compact` | Smaller grid unit (12px) |
| `eye-care` | Warm background, reduced contrast |
| `no-grid` | Hide grid lines for this note |
| `study-note` | Left accent border + slightly larger grid |
| `english-reading` | Sans-serif font, optimized for English text |

### Custom CSS Variables

You can override these CSS variables in a snippet to customize the plugin globally:

```css
/* Example: Make the grid lines more visible */
body.plugin-tf-grid {
  --grid-line-opacity-light: 0.08;
  --grid-line-opacity-dark: 0.06;
}

/* Example: Change the focus dim opacity */
:root {
  --focus-opacity: 0.4;
}
```

Available variables:
- `--tf-lh-normal` — Normal line height (default: 24px)
- `--tf-lh-heading` — Heading line height (default: 32px)
- `--tf-grid-unit` — Grid unit (default: 16px)
- `--zen-opacity` — Zen mode dim opacity (default: 0.25)
- `--focus-opacity` — Focus mode dim opacity (default: 0.5)
- `--tf-breathe-duration` — Breathing cursor cycle (default: 4s)
- `--tf-breathe-min-opacity` — Breathing cursor minimum (default: 0.4)
- `--tf-strike-duration` — Strikethrough animation duration (default: 0.35s)

---

## Compatibility

- **Obsidian**: v1.4.0+
- **Platforms**: Desktop and mobile
- **Themes**: Works with any theme. The Reading Colors module overrides Obsidian's built-in CSS variables, so disable it if you're using a custom theme with specific color settings.
- **Other plugins**: Compatible with most plugins. May conflict with other typewriter scroll or focus mode plugins — disable those before enabling Typographic Flow.

### Known Limitations

- **First-line indent** only works in Reading View (CM6 Live Preview renders paragraphs as per-line DIVs, making `text-indent` impossible)
- **Sentence focus mode** uses `Intl.Segmenter` where available; falls back to regex on older environments
- **Breathing cursor** pauses during typing via keyboard events; on mobile, uses `input` events as fallback

---

## FAQ

**Q: I'm using a custom theme and the colors look wrong.**
A: Disable the Reading Colors module. It overrides Obsidian's built-in CSS variables, which may conflict with your theme's color scheme.

**Q: The grid lines are too visible/invisible.**
A: Adjust "Grid Line Opacity" in settings, or use the `no-grid` cssclass for specific notes.

**Q: Can I use this with the Minimal theme?**
A: Yes. Disable Reading Colors if you want Minimal's color scheme to take precedence. The typewriter scroll, focus modes, and grid work independently of themes.

**Q: Does this work on mobile?**
A: Yes. All features work on mobile. The breathing cursor's "pause during typing" uses `input` events as a fallback for soft keyboards.

**Q: How do I reset all settings to defaults?**
A: Open the plugin settings and click the "Reset to defaults" button at the top.

---

## Acknowledgements

This plugin was inspired by and builds upon the work of several excellent plugins:

- [Typewriter Mode](https://github.com/davisriedel/obsidian-typewriter-mode) by Davis Riedel — The original typewriter scrolling plugin
- [Typewriter Scroll](https://github.com/deathau/cm-typewriter-scroll-obsidian) by deathau — The foundation for typewriter scrolling in Obsidian
- [Focus Active Sentence](https://github.com/artisticat1/focus-active-sentence) by artisticat1 — Sentence-level focus mode
- [Obsidian Focus Mode](https://github.com/ryanpcmcquen/obsidian-focus-mode) by ryanpcmcquen — Writing focus mode

Many thanks to the developers of these fantastic plugins.

---

## License

This plugin is licensed under the [MIT License](LICENSE).

---

## Support

If you find this plugin useful, consider:

- ⭐ Starring the [repository](https://github.com/dongningguo0331-prog/obsidian-typographic-flow)
- 🐛 Reporting bugs via [GitHub Issues](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/issues)
- 💡 Suggesting features via [GitHub Discussions](https://github.com/dongningguo0331-prog/obsidian-typographic-flow/discussions)
