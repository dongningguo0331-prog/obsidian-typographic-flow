/**
 * Settings tab — pure renderer.
 *
 * Setting rows are declared by the feature modules themselves (with typed
 * onChange closures) and aggregated through the plugin. This file only
 * knows how to render toggles, sliders, and dropdowns.
 */

import {Notice, PluginSettingTab, Setting} from 'obsidian';
import type {App} from 'obsidian';
import type TypographicFlowPlugin from '../main';

export class TypographicFlowSettingTab extends PluginSettingTab {
  plugin: TypographicFlowPlugin;

  constructor(app: App, plugin: TypographicFlowPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Reset to defaults')
      .setDesc('Restore all settings to their original values')
      .addButton((btn) =>
        btn
          .setButtonText('Reset')
          .setWarning()
          .onClick(async () => {
            await this.plugin.resetToDefaults();
            this.display();
            new Notice('Settings reset to defaults');
          }),
      );

    let lastSection: string | null = null;
    for (const row of this.plugin.getSettingRows()) {
      if (row.section !== lastSection) {
        containerEl.createEl('h2', {text: row.section});
        lastSection = row.section;
      }

      const name =
        row.type === 'slider' && row.dynamicName
          ? row.dynamicName(this.plugin.settings)
          : row.name;
      const setting = new Setting(containerEl).setName(name).setDesc(row.desc);
      const currentValue = this.plugin.settings[row.key];

      if (row.type === 'toggle') {
        setting.addToggle((t) =>
          t.setValue(currentValue as boolean).onChange((v) => row.onChange(v)),
        );
      } else if (row.type === 'slider') {
        setting.addSlider((sl) => {
          sl.setLimits(row.min, row.max, row.step);
          const raw = currentValue as number;
          sl.setValue(row.toSlider ? row.toSlider(raw) : raw);
          sl.onChange((v) =>
            row.onChange(row.fromSlider ? row.fromSlider(v) : v),
          );
          if (row.disabledWhen?.(this.plugin.settings)) {
            sl.setDisabled(true);
          }
        });
      } else {
        setting.addDropdown((dd) => {
          for (const [k, v] of Object.entries(row.options)) dd.addOption(k, v);
          dd.setValue(currentValue as string);
          dd.onChange((v) => row.onChange(v));
        });
      }
    }
  }
}
