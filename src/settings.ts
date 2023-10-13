import {App, PluginSettingTab, Setting} from "obsidian";
import InfoboxPlugin from "./main";

export interface InfoboxSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: InfoboxSettings = {
	mySetting: 'default'
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
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
