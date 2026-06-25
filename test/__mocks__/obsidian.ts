import { vi } from 'vitest';

export class Plugin {
  app: Record<string, unknown> = {};
  loadData = vi.fn(async () => ({}));
  saveData = vi.fn(async () => {});
  addCommand = vi.fn();
  addSettingTab = vi.fn();
  registerEditorExtension = vi.fn();
}

export class Notice {
  constructor(public message: string) {}
}

export class Setting {
  setName = vi.fn().mockReturnThis();
  setDesc = vi.fn().mockReturnThis();
  addToggle = vi.fn().mockReturnThis();
  addSlider = vi.fn().mockReturnThis();
  addDropdown = vi.fn().mockReturnThis();
  addButton = vi.fn().mockReturnThis();
}

export class PluginSettingTab {
  constructor(public app: Record<string, unknown>, public plugin: Plugin) {}
}

export interface App {}
export interface MarkdownView {}
export interface Editor {}
export interface Workspace {
  on: (event: string, callback: unknown) => void;
  off: (event: string, callback: unknown) => void;
  getActiveFile: () => { path: string } | null;
}
export interface TFile {
  path: string;
}
