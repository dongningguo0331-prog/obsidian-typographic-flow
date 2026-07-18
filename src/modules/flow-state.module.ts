/**
 * Flow State module — mindful variable font weight driven by typing speed,
 * plus the static font weight (--user-wght) slider.
 *
 * Owns the FlowStateManager and its ViewPlugin singleton wiring (the
 * typewriter padding ViewPlugin forwards every CM6 update to it).
 */

import {setBodyCSS} from '../ui/helpers';
import {
  FlowStateManager,
  setFlowStateForViewPlugin,
} from '../engine/flow-state';
import type {FeatureModule, ModuleContext, SettingRow} from './types';

const SECTION = 'Typography / 排版';

export class FlowStateModule implements FeatureModule {
  readonly id = 'flow-state';
  readonly settingOrder = 70;
  private readonly flowState = new FlowStateManager();

  syncFromSettings(ctx: ModuleContext): void {
    // Static font weight applies unconditionally (it is a plain CSS var).
    setBodyCSS('--user-wght', String(ctx.settings.fontWeight));

    if (ctx.settings.flowEnabled) {
      this.flowState.enable();
      this.flowState.setSensitivity(ctx.settings.flowSensitivity);
      this.flowState.setWeightRange(ctx.settings.flowWeightRange);
    } else {
      this.flowState.disable();
    }
    // The singleton is registered unconditionally (matches previous
    // behavior); the manager itself is a no-op while disabled.
    setFlowStateForViewPlugin(this.flowState);
  }

  teardown(_ctx: ModuleContext): void {
    this.flowState.destroy();
    setFlowStateForViewPlugin(null);
  }

  settingRows(ctx: ModuleContext): SettingRow[] {
    return [
      {
        section: SECTION,
        name: 'Font Weight / 字重',
        desc: 'Variable font weight axis (requires variable font installed)',
        key: 'fontWeight',
        type: 'slider',
        min: 250,
        max: 900,
        step: 50,
        onChange: (v) => {
          ctx.settings.fontWeight = v;
          setBodyCSS('--user-wght', String(v));
          void ctx.save();
        },
      },
      {
        section: SECTION,
        name: 'Mindful Font Weight / 心流变字重',
        desc: 'Dynamic font weight based on typing speed (fast=light, pause=heavy)',
        key: 'flowEnabled',
        type: 'toggle',
        onChange: (v) => this.toggle(ctx, v),
      },
      {
        section: SECTION,
        name: 'Flow Sensitivity / 心流灵敏度',
        desc: 'WPM threshold for flow state detection',
        key: 'flowSensitivity',
        type: 'slider',
        min: 10,
        max: 100,
        step: 5,
        onChange: (v) => {
          ctx.settings.flowSensitivity = v;
          this.flowState.setSensitivity(v);
          void ctx.save();
        },
      },
      {
        section: SECTION,
        name: 'Weight Range / 字重变化幅度',
        desc: 'Maximum font weight change in flow state',
        key: 'flowWeightRange',
        type: 'slider',
        min: 10,
        max: 80,
        step: 5,
        onChange: (v) => {
          ctx.settings.flowWeightRange = v;
          this.flowState.setWeightRange(v);
          void ctx.save();
        },
      },
    ];
  }

  private toggle(ctx: ModuleContext, newValue: boolean | null = null): void {
    if (newValue === null) newValue = !ctx.settings.flowEnabled;
    ctx.settings.flowEnabled = newValue;
    ctx.refreshStatusBar();
    if (newValue) {
      this.flowState.enable();
      this.flowState.setSensitivity(ctx.settings.flowSensitivity);
      this.flowState.setWeightRange(ctx.settings.flowWeightRange);
      setFlowStateForViewPlugin(this.flowState);
    } else {
      this.flowState.disable();
      setFlowStateForViewPlugin(null);
    }
    void ctx.save();
  }
}
