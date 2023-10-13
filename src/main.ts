import {
	App,
	MarkdownPostProcessorContext,
	MarkdownView, normalizePath,
	parseYaml,
	Plugin,
	setIcon,
	stringifyYaml,
	Vault
} from 'obsidian';
import {DeleteGroupModal, DeleteKeyValModal, NewGroupModal, NewKeyValModal} from "./modal";
import {DEFAULT_SETTINGS, InfoboxSettings, InfoboxSettingTab} from "./settings";
import {getCalloutSectionInfo, getFrontmatter, getGroupSectionInfo, getRowSectionInfo, SectionInfo} from "./section";

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
	buttons: HTMLElement[] = [];

	async onload() {
		await this.loadSettings();

		this.registerMarkdownPostProcessor(async (element, context) => {
			const callouts = element.querySelectorAll('.callout[data-callout~=infobox] .callout-content');

			const content = await getContentArray(this.app.vault, context.sourcePath);
			if (!content) {
				console.log('no content');
				return;
			}

			const infoboxes = await this.getInfoBoxes(callouts, content, context.sourcePath);

			infoboxes.forEach((box) => {
				console.log(content[box.calloutSection.lineStart], content[box.calloutSection.lineEnd]);
				if (box.header) {
					const buttonContainer = document.createElement('div');
					buttonContainer.classList.add('infobox-button-container');
					this.buttons.push(buttonContainer);

					const addButton = document.createElement('span');
					addButton.classList.add('infobox-group-button', 'clickable-icon');
					addButton.setAttribute('title', 'Add a new group');
					setIcon(addButton, 'plus-circle');
					addButton.addEventListener('click', this.AddGroup(box));
					buttonContainer.appendChild(addButton);
					box.header.appendChild(buttonContainer);
				}

				box.groups.forEach((group) => {
					switch (group.content.tagName) {
						case 'TABLE':
							console.log(content[group.headerSection.lineStart], content[group.contentSection.lineStart], content[group.contentSection.lineEnd]);

							const buttonContainer = document.createElement('div');
							buttonContainer.classList.add('infobox-button-container');
							this.buttons.push(buttonContainer);

							const addButton = document.createElement('span');
							addButton.classList.add('infobox-group-button', 'clickable-icon');
							addButton.setAttribute('title', 'Add a new item to this group');
							setIcon(addButton, 'plus-circle');
							addButton.addEventListener('click', this.AddKeyValue(group));
							buttonContainer.appendChild(addButton);

							const deleteButton = document.createElement('span');
							deleteButton.classList.add('infobox-group-button', 'clickable-icon');
							deleteButton.setAttribute('title', 'Delete this group');
							setIcon(deleteButton, 'trash');
							deleteButton.addEventListener('click', this.DeleteGroup(group));
							buttonContainer.appendChild(deleteButton);

							group.header.appendChild(buttonContainer);

							const table = group.content as HTMLTableElement;
							Array.from(table.rows).forEach((row, index) => {
								try {
									const key = row.cells[0].innerText;
									const parent = group.header.dataset.heading.toLowerCase();
									const frontmatter = getFrontmatter(content);
									const val = frontmatter[parent][key.toLowerCase()];

									if (key && val) {
										const buttonContainer = document.createElement('div');
										buttonContainer.classList.add('infobox-button-container', 'infobox-content-button-container');
										this.buttons.push(buttonContainer);

										const editButton = document.createElement('span');
										editButton.classList.add('infobox-content-button', 'clickable-icon');
										editButton.setAttribute('title', 'Edit this item');
										setIcon(editButton, 'pencil');
										editButton.addEventListener('click', this.EditKeyValue(parent, key, val));
										buttonContainer.appendChild(editButton);

										const deleteButton = document.createElement('span');
										deleteButton.classList.add('infobox-content-button', 'clickable-icon');
										deleteButton.setAttribute('title', 'Delete this item');
										setIcon(deleteButton, 'trash');
										deleteButton.addEventListener('click', this.DeleteKeyValue(parent, key, val, group.contentSection));
										buttonContainer.appendChild(deleteButton);

										row.cells[1].appendChild(buttonContainer);
									}
								} catch (e) {
									console.log(e);
								}
							})
					}
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

	private AddGroup(box: Infobox) {
		return async (e: MouseEvent) => {
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

						contentArray.splice(box.calloutSection.lineEnd + 1, 0, insert);
						return contentArray.join('\n');
					});
				}
			}).open();
		};
	}

	private DeleteGroup(group: InfoboxGroup) {
		return async (e: MouseEvent) => {
			e.preventDefault();

			new DeleteGroupModal(this.app, async () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const file = view.file;
					await this.app.vault.process(file, (data) => {
						const contentArray = data.split("\n");

						const frontmatterEnd = contentArray.slice(1).findIndex((line) => line === "---") + 1;
						const frontmatter = parseYaml(contentArray.slice(1, frontmatterEnd).join('\n'));

						delete frontmatter[group.header.dataset.heading.toLowerCase()];

						contentArray.splice(group.headerSection.lineStart, group.contentSection.lineEnd - group.headerSection.lineStart + 1);

						contentArray.splice(0, frontmatterEnd + 1, '---', stringifyYaml(frontmatter).trimEnd(), '---');

						return contentArray.join('\n');
					});
				}
			}, group.header.dataset.heading).open();
		};
	}

	private AddKeyValue(group: InfoboxGroup) {
		return async (e: MouseEvent) => {
			e.preventDefault();

			new NewKeyValModal(this.app, async (key, val) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const file = view.file;
					await this.app.vault.process(file, (data) => {
						const contentArray = data.split("\n");

						const parent = group.header.dataset.heading.toLowerCase();
						const insert = `> | ${key} | \`=this.${parent}.${key.toLowerCase()}\` |`;

						contentArray.splice(group.contentSection.lineEnd + 1, 0, insert);

						const frontmatterEnd = contentArray.slice(1).findIndex((line) => line === "---") + 1;
						const frontmatter = parseYaml(contentArray.slice(1, frontmatterEnd).join('\n'));
						if (!frontmatter[parent]) {
							frontmatter[parent] = {};
						}
						frontmatter[parent][key.toLowerCase()] = val;
						contentArray.splice(0, frontmatterEnd + 1, '---', stringifyYaml(frontmatter).trimEnd(), '---');

						return contentArray.join('\n');
					});
				}
			}).open();
		};
	}

	private EditKeyValue(parent :string, key :string, val :string) {
		return async (e: MouseEvent) => {
			e.preventDefault();

			new NewKeyValModal(this.app, async (_, newVal) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const file = view.file;
					await this.app.vault.process(file, (data) => {
						const contentArray = data.split("\n");
						const frontmatterEnd = contentArray.slice(1).findIndex((line) => line === "---") + 1;

						const frontmatter = parseYaml(contentArray.slice(1, frontmatterEnd).join('\n'));

						if (!frontmatter[parent]) {
							frontmatter[parent] = {};
						}
						frontmatter[parent][key.toLowerCase()] = newVal;

						contentArray.splice(0, frontmatterEnd + 1, '---', stringifyYaml(frontmatter).trimEnd(), '---');

						return contentArray.join('\n');
					});
				}
			}, key, val).open();
		};
	}

	private DeleteKeyValue(parent :string, key :string, val :string, group: SectionInfo) {
		return async (e: MouseEvent) => {
			e.preventDefault();

			new DeleteKeyValModal(this.app, async () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const file = view.file;
					await this.app.vault.process(file, (data) => {
						const contentArray = data.split("\n");
						const frontmatterEnd = contentArray.slice(1).findIndex((line) => line === "---") + 1;

						const frontmatter = parseYaml(contentArray.slice(1, frontmatterEnd).join('\n'));

						delete frontmatter[parent][key.toLowerCase()];

						const row = getRowSectionInfo(group, key);
						if (!row) {
							console.log('no row');
							return;
						}

						contentArray.splice(row.lineStart, 1);
						contentArray.splice(0, frontmatterEnd + 1, '---', stringifyYaml(frontmatter).trimEnd(), '---');

						return contentArray.join('\n');
					});
				}
			}, key, val).open();
		};
	}

	private async getInfoBoxes(callouts: NodeListOf<Element>, content: string[], path: string) {
		const infoboxes: Infobox[] = [];

		await Promise.all(Array.from<Element>(callouts).map(async (box) => {
			const boxLines = await getCalloutSectionInfo(content, box);
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
				file: path
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

async function getContentArray(vault: Vault, path: string) : Promise<string[] | undefined> {
	const content = await vault.adapter.read(normalizePath(path));
	return content.split("\n");
}
