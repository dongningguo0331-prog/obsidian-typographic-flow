import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  type PluginSettings,
} from './schema';

const SETTING_MIGRATIONS: Record<
  number,
  (s: PluginSettings) => PluginSettings
> = {
  1: (s) => s,
};

export function migrateSettings(settings: PluginSettings): PluginSettings {
  let v = settings.settingsVersion || 0;
  while (v < SETTINGS_VERSION) {
    const fn = SETTING_MIGRATIONS[v + 1];
    if (fn) {
      settings = fn(settings);
      v = settings.settingsVersion || v + 1;
    } else {
      settings.settingsVersion = SETTINGS_VERSION;
      break;
    }
  }
  return settings;
}

const _booleanKeys: readonly (keyof PluginSettings)[] = [
  'enabled',
  'suspensionEnabled',
  'smoothScrollEnabled',
  'smartOffsetEnabled',
  'colorsEnabled',
  'gridEnabled',
  'gridShowLines',
  'cjkProseEnabled',
  'cjkProseJustify',
  'cjkProseIndent',
  'breatheEnabled',
  'strikeAnimEnabled',
  'fullscreenEnabled',
  'fullscreenShowHeader',
  'fullscreenShowStatusBar',
  'fullscreenShowVignette',
  'cursorRestoreEnabled',
  'flowEnabled',
  'gridAutoCalibrate',
];

const _numberKeys: readonly (keyof PluginSettings)[] = [
  'typewriterOffset',
  'deadZone',
  'zenOpacity',
  'focusOpacity',
  'fontWeight',
  'flowSensitivity',
  'flowWeightRange',
  'colorsAccentHue',
  'colorsAccentSat',
  'colorsBgWarmth',
  'colorsTextContrast',
  'gridUnit',
  'gridOffsetY',
  'gridLineOpacityLight',
  'gridLineOpacityDark',
  'gridRadiusCoef',
  'breatheDuration',
  'breatheMinOpacity',
  'strikeAnimDuration',
];

export function validateSettings(settings: PluginSettings): PluginSettings {
  const defaults = DEFAULT_SETTINGS;
  const rec = settings as unknown as Record<string, unknown>;
  let hasInvalid = false;

  for (const key of _booleanKeys) {
    if (typeof rec[key] !== 'boolean') {
      rec[key] = defaults[key];
      hasInvalid = true;
    }
  }
  for (const key of _numberKeys) {
    const val = rec[key];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      rec[key] = defaults[key];
      hasInvalid = true;
    }
  }
  if (
    typeof settings.focusMode !== 'string' ||
    !['off', 'line', 'paragraph', 'heading', 'sentence'].includes(
      settings.focusMode,
    )
  ) {
    settings.focusMode = 'off';
    hasInvalid = true;
  }
  if (
    typeof settings.zenMode !== 'string' ||
    !['off', 'static', 'dynamic'].includes(settings.zenMode)
  ) {
    settings.zenMode = 'off';
    hasInvalid = true;
  }

  if (rec['zenEnabled'] !== undefined && rec['zenMode'] === undefined) {
    rec['zenMode'] = rec['zenEnabled'] ? 'static' : 'off';
    delete rec['zenEnabled'];
    hasInvalid = true;
  }

  if (hasInvalid) {
    console.warn(
      '[TypographicFlow] Invalid settings detected, falling back to defaults for affected fields',
    );
  }
  return settings;
}
