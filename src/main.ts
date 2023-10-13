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
	headerSection: SectionInfo;
	content: Element;
	contentSection: SectionInfo;
}

interface Infobox {
	groups: InfoboxGroup[];
	callout: Element;
	calloutSection: SectionInfo;
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

			const infoboxes = await this.getInfoBoxes(callouts, context);

			infoboxes.forEach((box) => {
				if (box.header) {
					const addButton = document.createElement('button');
					addButton.classList.add('infobox-add-button');
					addButton.innerText = '+';
					addButton.addEventListener('click', async (e) => {
						e.preventDefault();

						new NewGroupModal(this.app, async (name, type) => {
							const view = this.app.workspace.getActiveViewOfType(MarkdownView);
							if (view) {
								const file = view.file;
								await this.app.vault.process(file, (data) => {
									const contentArray = data.split("\n");
									let insert = `> ###### ${name}\n`;
									console.log(type)
									switch (type) {
										case 'table':
											insert += `> | Type | Stat |\n> | --- | --- |`;
									}

									contentArray.splice(box.calloutSection.lineEnd, 0, insert);
									return contentArray.join('\n');
								});
							}
						}).open();
					});
					box.header.appendChild(addButton);
					this.buttons.push(addButton);
				}

				box.groups.forEach((group) => {
					if (group.content.tagName !== 'TABLE') {
						return;
					}
					const addButton = document.createElement('button');
					addButton.classList.add('infobox-add-button');
					addButton.innerText = '+';
					addButton.addEventListener('click', async (e) => {
						e.preventDefault();

						new NewKeyValModal(this.app, async (key, val) => {
							const view = this.app.workspace.getActiveViewOfType(MarkdownView);
							if (view) {
								const file = view.file;
								await this.app.vault.process(file, (data) => {
									const contentArray = data.split("\n");
									const frontmatterEnd = contentArray.slice(1).findIndex((line) => line === "---") + 1;

									const parent = group.header.dataset.heading.toLowerCase();
									const insert = `> | ${key} | \`=this.${parent}.${key.toLowerCase()}\` |`;

									contentArray.splice(group.contentSection.lineEnd + 1, 0, insert);
									contentArray.splice(frontmatterEnd, 0, `${parent}:\n  ${key.toLowerCase()}: ${val}`);
									return contentArray.join('\n');
								});
							}
						}).open();
					});
					group.header.appendChild(addButton);
					this.buttons.push(addButton);
				})
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

	private async getInfoBoxes(callouts: NodeListOf<Element>, context: MarkdownPostProcessorContext) {
		const infoboxes: Infobox[] = [];

		await Promise.all(Array.from<Element>(callouts).map(async (box) => {
			const boxLines = await getCalloutSectionInfo(this.app, box);
			if (!boxLines) {
				console.log('no box lines');
				return;
			}

			const groups: InfoboxGroup[] = [];

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

		return infoboxes;
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



export class NewGroupModal extends Modal {
	name: string;
	type = 'table';
	onSubmit: (name: string, type: string) => void;

	constructor(app: App, onSubmit: (name: string, type: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Create New Group?" });

		new Setting(contentEl)
			.setName("Name")
			.addText((text) => {
				text.onChange((value) => {
					this.name = value
				})
			});

		new Setting(contentEl)
			.setName("Content Type")
			.addDropdown((dropdown) => {
				dropdown.addOption('table', 'Table');
				dropdown.onChange((value) => {
					this.type = value;
				})
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.name, this.type);
					}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class NewKeyValModal extends Modal {
	key: string;
	value: string;
	onSubmit: (key: string, value: string) => void;

	constructor(app: App, onSubmit: (key: string, value: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Add additional item" });

		new Setting(contentEl)
			.setName("Key")
			.addText((text) => {
				text.onChange((value) => {
					this.key = value
				})
			});

		new Setting(contentEl)
			.setName("Value")
			.addText((text) => {
				text.onChange((value) => {
					this.value = value
				})
			});


		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.key, this.value);
					}));
	}

	onClose() {
		const { contentEl } = this;
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
