import {MarkdownPostProcessorContext, MarkdownView, parseYaml, Plugin, stringifyYaml} from 'obsidian';
import {NewGroupModal, NewKeyValModal} from "./modal";
import {DEFAULT_SETTINGS, InfoboxSettings, InfoboxSettingTab} from "./settings";
import {getCalloutSectionInfo, getGroupSectionInfo, SectionInfo} from "./section";

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

									const frontmatter = parseYaml(contentArray.slice(1, frontmatterEnd).join('\n'));
									console.log(frontmatter);

									const parent = group.header.dataset.heading.toLowerCase();
									const insert = `> | ${key} | \`=this.${parent}.${key.toLowerCase()}\` |`;

									contentArray.splice(group.contentSection.lineEnd + 1, 0, insert);

									if (!frontmatter[parent]) {
										frontmatter[parent] = {};
									}
									frontmatter[parent][key.toLowerCase()] = val;

									contentArray.splice(0, frontmatterEnd+1, '---', stringifyYaml(frontmatter).trimEnd(), '---');

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
		this.addSettingTab(new InfoboxSettingTab(this.app, this));
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
