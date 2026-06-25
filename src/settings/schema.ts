/**
 * Settings schema — type definitions, default values, and version constant.
 * Pure data, no runtime dependencies on plugin class.
 */

import type {FocusMode} from '../engine/focus-mode';
import type {VignetteStyle} from '../engine/fullscreen';

export const SETTINGS_VERSION = 1;

export interface PluginSettings {
  // Typewriter
  enabled: boolean;
  typewriterOffset: number;
  deadZone: number;
  suspensionEnabled: boolean;
  smoothScrollEnabled: boolean;
  smartOffsetEnabled: boolean;

  // Zen
  zenMode: 'off' | 'static' | 'dynamic';
  zenOpacity: number;

  // Focus
  focusMode: FocusMode;
  focusOpacity: number;

  // Colors
  colorsEnabled: boolean;
  colorsAccentHue: number;
  colorsAccentSat: number;
  colorsBgWarmth: number;
  colorsTextContrast: number;

  // Grid
  gridEnabled: boolean;
  gridShowLines: boolean;
  gridUnit: number;
  gridOffsetY: number;
  gridLineOpacityLight: number;
  gridLineOpacityDark: number;
  gridRadiusCoef: number;
  gridAutoCalibrate: boolean;

  // Variable Font
  fontWeight: number;

  // Mindful Font Weight
  flowEnabled: boolean;
  flowSensitivity: number;
  flowWeightRange: number;

  // CJK Prose
  cjkProseEnabled: boolean;
  cjkProseJustify: boolean;
  cjkProseIndent: boolean;

  // Breathing Cursor
  breatheEnabled: boolean;
  breatheDuration: number;
  breatheMinOpacity: number;

  // Strikethrough Animation
  strikeAnimEnabled: boolean;
  strikeAnimDuration: number;

  // Fullscreen
  fullscreenEnabled: boolean;
  fullscreenShowHeader: boolean;
  fullscreenShowStatusBar: boolean;
  fullscreenShowVignette: boolean;
  fullscreenVignetteStyle: VignetteStyle;

  // Cursor Restore
  cursorRestoreEnabled: boolean;
  cursorPositions: Record<string, {from: number; to: number; scroll: number}>;

  // Schema
  settingsVersion: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  // Typewriter
  enabled: true,
  typewriterOffset: 0.5,
  deadZone: 2,
  suspensionEnabled: true,
  smoothScrollEnabled: true,
  smartOffsetEnabled: true,

  // Zen
  zenMode: 'off',
  zenOpacity: 0.25,

  // Focus
  focusMode: 'off' as FocusMode,
  focusOpacity: 0.25,

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
  gridAutoCalibrate: false,

  // Variable Font
  fontWeight: 400,

  // Mindful Font Weight
  flowEnabled: false,
  flowSensitivity: 50,
  flowWeightRange: 30,

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

  // Fullscreen
  fullscreenEnabled: false,
  fullscreenShowHeader: false,
  fullscreenShowStatusBar: false,
  fullscreenShowVignette: true,
  fullscreenVignetteStyle: 'radial',

  // Cursor Restore
  cursorRestoreEnabled: true,
  cursorPositions: {},

  // Schema
  settingsVersion: SETTINGS_VERSION,
};
