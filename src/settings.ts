import {App, PluginSettingTab, Setting} from "obsidian";
import InfoboxPlugin from "./main";

export interface InfoboxSettings {
	escapeString: boolean;
}

export const DEFAULT_SETTINGS: InfoboxSettings = {
	escapeString: true,
}

export class InfoboxSettingTab extends PluginSettingTab {
	plugin: InfoboxPlugin;

	constructor(app: App, plugin: InfoboxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Escape strings')
			.setDesc('Escape strings when adding to frontmatter (only disable if you know what you\'re doing)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.escapeString)
				.onChange(async (value) => {
					this.plugin.settings.escapeString = value;
					await this.plugin.saveSettings();
				}));
	}
}
