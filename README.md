# Typographic Flow for Obsidian

[![GitHub](https://img.shields.io/badge/GitHub-%2330363E.svg?style=for-the-badge&logo=github&logoColor=white)](https://github.com/YOUR_USERNAME/obsidian-typographic-flow)
[![Obsidian](https://img.shields.io/badge/Obsidian-%23483699.svg?style=for-the-badge&logo=obsidian&logoColor=white)](https://obsidian.md/)
[![Release](https://img.shields.io/github/v/release/YOUR_USERNAME/obsidian-typographic-flow?style=for-the-badge)](https://github.com/YOUR_USERNAME/obsidian-typographic-flow/releases)

A unified typographic editing experience for [Obsidian](https://obsidian.md). Combines typewriter scrolling, focus modes, reading colors, baseline grid, and CJK typography into one plugin.

## Features

### Typewriter Scrolling
Keep your cursor at a fixed position on the screen as you type — like a typewriter.

- **Center offset** — Position the cursor at any height (default: 50% = center)
- **Dead zone** — Prevent jitter when editing adjacent lines
- **Scroll suspension** — Pause auto-centering when you scroll manually, resume on typing
- **Smooth scroll** — Animated scrolling to cursor position
- **Smart offset** — Adjust position for headings and empty lines

### Focus & Zen Modes
Reduce visual noise while writing.

- **Zen Mode** — Dim non-active lines to focus on what you're typing
- **Focus Mode** — Dim lines outside the current semantic range:
  - **Single Line** — Only the current line is bright
  - **Current Paragraph** — Only the current paragraph is bright
  - **Current Heading** — Only the current section is bright
  - **Sentence** — Only the current sentence is bright (experimental)

### Cursor & Animation
Subtle visual enhancements.

- **Breathing cursor** — Smooth fade cycle instead of binary blink
- **Strikethrough animation** — Animate ~~strikethrough~~ text from left to right

### Typography
Professional-grade layout control.

- **Baseline grid** — Align text to a vertical grid for consistent spacing
- **CJK Prose** — Chinese/Japanese/Korean typography:
  - Half-width punctuation via OpenType
  - Leading punctuation margin trim
  - Justify text (with CJK algorithm)
  - First-line indent (Reading View)

### Reading Colors
A zen-inspired color palette for comfortable reading.

- **Accent hue** — Shift accent color (warm ↔ cool)
- **Accent saturation** — Control color intensity
- **Background warmth** — Adjust background tone (cream ↔ ash)
- **Text contrast** — Fine-tune text darkness/brightness

## Installation

### From Obsidian (Recommended)

1. Open Obsidian Settings → Community Plugins
2. Click **Browse** and search for "Typographic Flow"
3. Click **Install**, then **Enable**

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/YOUR_USERNAME/obsidian-typographic-flow/releases)
2. Extract the plugin folder to your vault's plugins directory:
   ```
   <your-vault>/.obsidian/plugins/obsidian-typographic-flow/
   ```
3. Reload Obsidian (Ctrl/Cmd+P → "Reload app without saving")
4. Enable the plugin in Settings → Community Plugins

## Commands

All features can be toggled via the Command Palette (Ctrl/Cmd+P):

| Command | Description |
|---------|-------------|
| Toggle Typewriter Scrolling | Enable/disable typewriter scroll |
| Toggle Zen Mode | Enable/disable zen mode |
| Cycle Focus Mode | Cycle through focus modes (off → line → paragraph → heading → sentence) |
| Turn Off Focus Mode | Disable focus mode |
| Toggle Reading Colors | Enable/disable reading color palette |
| Toggle Baseline Grid | Enable/disable baseline grid |
| Toggle CJK Prose | Enable/disable CJK typography |
| Toggle CJK First-line Indent | Enable/disable first-line indent |
| Toggle CJK Justification | Enable/disable text justification |
| Toggle Breathing Cursor | Enable/disable breathing cursor |
| Toggle Strikethrough Animation | Enable/disable strikethrough animation |

## Settings

The plugin settings are organized into 5 sections:

1. **Typewriter Scroll** — Core scrolling behavior
2. **Focus & Zen** — Focus modes and zen opacity
3. **Cursor & Animation** — Breathing cursor and strikethrough
4. **Typography** — Baseline grid and CJK prose
5. **Colors** — Reading color palette

Access settings via: Settings → Community Plugins → Typographic Flow → ⚙️

## Architecture

```
obsidian-typographic-flow/
├── main.js          # Plugin code (esbuild output)
├── styles.css       # All CSS modules
├── manifest.json    # Plugin metadata
└── README.md        # This file
```

The plugin uses:
- **CodeMirror 6** ViewPlugins for typewriter scroll and focus mode
- **Facets** for runtime configuration
- **Compartments** for dynamic extension reconfiguration
- **CSS custom properties** for typography constants (JS ↔ CSS bridge)

## Acknowledgements

This plugin was inspired by and builds upon the work of several excellent plugins:

- [Typewriter Mode](https://github.com/davisriedel/obsidian-typewriter-mode) by Davis Riedel — The original typewriter scrolling plugin
- [Typewriter Scroll](https://github.com/deathau/cm-typewriter-scroll-obsidian) by deathau — The foundation for typewriter scrolling in Obsidian
- [Focus Active Sentence](https://github.com/artisticat1/focus-active-sentence) by artisticat1 — Sentence-level focus mode
- [Obsidian Focus Mode](https://github.com/ryanpcmcquen/obsidian-focus-mode) by ryanpcmcquen — Writing focus mode

Many thanks to the developers of these fantastic plugins.

## License

This plugin is licensed under the [MIT License](LICENSE).

## Support

If you find this plugin useful, consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs via [GitHub Issues](https://github.com/YOUR_USERNAME/obsidian-typographic-flow/issues)
- 💡 Suggesting features via [GitHub Discussions](https://github.com/YOUR_USERNAME/obsidian-typographic-flow/discussions)

---

**Enjoy your writing!** ✍️
