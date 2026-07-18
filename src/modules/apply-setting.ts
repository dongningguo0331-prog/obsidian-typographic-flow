/**
 * Shared helper for the common "store a numeric setting + push it to a CSS
 * custom property + persist" pattern used by most slider handlers.
 */

import {setBodyCSS} from '../ui/helpers';
import type {PluginSettings} from '../settings';
import type {ModuleContext} from './types';

export function applyCssSetting(
  ctx: ModuleContext,
  key: keyof PluginSettings,
  value: number,
  cssVar: string,
  enabledKey: keyof PluginSettings,
  format?: 'px' | 's',
): void {
  const settingsRecord = ctx.settings as unknown as Record<string, unknown>;
  settingsRecord[key] = value;
  if (settingsRecord[enabledKey] && cssVar) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      console.warn(
        `[TypographicFlow] Invalid CSS value for ${String(key)}: ${value}`,
      );
      void ctx.save();
      return;
    }
    const formatted =
      format === 'px'
        ? value + 'px'
        : format === 's'
          ? value + 's'
          : String(value);
    setBodyCSS(cssVar, formatted);
  }
  void ctx.save();
}
