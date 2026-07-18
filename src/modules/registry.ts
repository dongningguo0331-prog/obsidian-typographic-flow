/**
 * Module registry — pure aggregation over the ordered module list.
 *
 * Kept free of Obsidian runtime dependencies so it can be unit-tested.
 * The ORDER of modules matters: it defines both initialization order
 * (dependency constraints) and status bar abbreviation order.
 */

import type {Command} from 'obsidian';
import type {Extension} from '@codemirror/state';
import type {
  FeatureModule,
  ModuleContext,
  SettingRow,
  StatusBarPart,
} from './types';

export interface ModuleRegistry {
  readonly modules: readonly FeatureModule[];
  initialEditorExtensions(): Extension[];
  allCommands(ctx: ModuleContext): Command[];
  allSettingRows(ctx: ModuleContext): SettingRow[];
  /** Active status bar parts, in module order. */
  statusBarParts(ctx: ModuleContext): StatusBarPart[];
  syncAll(ctx: ModuleContext): void;
  teardownAll(ctx: ModuleContext): void;
}

export function createModuleRegistry(
  modules: readonly FeatureModule[],
): ModuleRegistry {
  return {
    modules,

    initialEditorExtensions(): Extension[] {
      return modules.flatMap((m) => m.initialEditorExtensions?.() ?? []);
    },

    allCommands(ctx: ModuleContext): Command[] {
      return modules.flatMap((m) => m.commands?.(ctx) ?? []);
    },

    allSettingRows(ctx: ModuleContext): SettingRow[] {
      // Settings UI order is decoupled from initialization order:
      // sort by each module's settingOrder hint (falling back to array order).
      const ordered = modules
        .map((m, index) => ({m, index}))
        .sort(
          (a, b) =>
            (a.m.settingOrder ?? 1000 + a.index) -
            (b.m.settingOrder ?? 1000 + b.index),
        );
      return ordered.flatMap(({m}) => m.settingRows?.(ctx) ?? []);
    },

    statusBarParts(ctx: ModuleContext): StatusBarPart[] {
      const parts: StatusBarPart[] = [];
      for (const m of modules) {
        const part = m.statusBarContribution?.(ctx);
        if (part) parts.push(part);
      }
      return parts;
    },

    syncAll(ctx: ModuleContext): void {
      for (const m of modules) m.syncFromSettings(ctx);
    },

    teardownAll(ctx: ModuleContext): void {
      for (const m of modules) m.teardown(ctx);
    },
  };
}
