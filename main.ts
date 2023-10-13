import {
	App,
	Editor, MarkdownEditView, MarkdownPostProcessorContext, MarkdownPreviewView,
	MarkdownSectionInformation,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting, TFile, Workspace
} from 'obsidian';
import {EditorView} from "@codemirror/view";

// Remember to rename these classes and interfaces!

const INFOBOX_CALLOUT :string = '> [!infobox]';

interface InfoboxSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: InfoboxSettings = {
	mySetting: 'default'
}

interface InfoboxGroup {
	header: Element;
	headerSection?: SectionInfo;
	content: Element;
	contentSection?: SectionInfo;
}

interface Infobox {
	groups: InfoboxGroup[];
	callout: Element;
	calloutSection?: SectionInfo;
	header?: Element;
	file?: string;
}

export default class InfoboxPlugin extends Plugin {
	settings: InfoboxSettings;
	buttons: HTMLButtonElement[] = [];

	async onload() {
		await this.loadSettings();

		this.registerMarkdownPostProcessor(async (element, context) => {
			const callouts = element.querySelectorAll('.callout[data-callout~=infobox] .callout-content');

			const infoboxes : Infobox[] = [];

			await Promise.all(Array.from<Element>(callouts).map(async (box) => {
				const boxLines = await getCalloutSectionInfo(this.app,  box);
				if (!boxLines) {
					console.log('no box lines');
					return;
				}

				const groups : InfoboxGroup[] = [];

				Array.from<Element>(box.children).forEach((child) => {
					if (child.tagName === 'H6' && child.nextElementSibling && !child.nextElementSibling.tagName.startsWith('H')) {
						const groupLines = getGroupSectionInfo(boxLines, child.dataset.heading)
						if (!groupLines) {
							return;
						}

						groups.push({
							header: child,
							headerSection: groupLines.header,
							content: child.nextElementSibling,
							contentSection: groupLines.content
						});
					}
				});

				infoboxes.push({
					groups: groups,
					callout: box,
					calloutSection: boxLines,
					header: box.children[0].tagName === 'H1' ? box.children[0] : undefined,
					file: context.sourcePath
				})
			}));

			infoboxes.forEach((box) => {
				if (box.header) {
					const addButton = document.createElement('button');
					addButton.classList.add('infobox-add-button');
					addButton.innerText = '+';
					addButton.addEventListener('click', async (e) => {
						e.preventDefault();
						const view = this.app.workspace.getActiveViewOfType(MarkdownView);
						if (view) {
							const file = view.file;
							await this.app.vault.process(file, (data) => {
								const contentArray = data.split("\n");
								console.log(box);
								contentArray.splice(box.groups[0].contentSection.lineEnd+1, 0, `> ###### test\n> | type | stat|\n> | --- | --- |\n> | test | test |`);
								return contentArray.join('\n');
							});
						}
					})
					box.header.appendChild(addButton);
					this.buttons.push(addButton);
				}
			}, this);
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
		//
		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });
		//
		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		this.buttons.forEach((button) => {
			button.remove();
		});
	}
//
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

interface SectionInfo {
	text: string;
	lineStart: number;
	lineEnd: number;
}

async function getCalloutSectionInfo(app: App, el: Element) : Promise<SectionInfo | undefined> {
	const file = app.workspace.getActiveFile();
	if (!file) {
		console.log('no file');
		return undefined;
	}

	const content = await this.app.vault.read(file);
	const contentArray = content.split("\n");

	const start = contentArray.findIndex((line) => line.startsWith("> # " + el.children[0].dataset.heading));
	const startLine = start !== -1 && contentArray[start -1] === INFOBOX_CALLOUT ? start -1 : -1;
	if (startLine === -1) {
		return undefined;
	}

	const end = contentArray.findIndex((line, index) => index > start && !line.startsWith(">"));
	const endLine = end === -1 ? contentArray.length : end;

	return {
		text: contentArray.slice(start, end).join('\n'),
		lineStart: startLine,
		lineEnd: endLine
	}
}

function getGroupSectionInfo(section: SectionInfo, header: string) : {header: SectionInfo, content: SectionInfo} | undefined  {
		const lines = section.text.split('\n');

		const headerLine = lines.findIndex((line) => line === "> ###### " + header);
		if (headerLine === -1) {
			return undefined;
		}

		const start = lines.findIndex((line, index) => index > headerLine && !line.startsWith("> #"));
		const end = lines.findIndex((line, index) => index > start && line.startsWith("> #"));

		if (start === -1) {
			return undefined;
		}

		const endLine = end === -1 ? lines.length : end;

		return {
			header: {
				text: lines[headerLine]+'\n',
				lineStart: section.lineStart + headerLine,
				lineEnd: section.lineStart + headerLine
			},
			content: {
				text: lines.slice(start, end).join('\n'),
				lineStart: section.lineStart + start,
				lineEnd: section.lineStart + endLine
			}
	}
}


class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
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
