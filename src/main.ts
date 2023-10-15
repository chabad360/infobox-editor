import {normalizePath, Plugin, setIcon, Vault} from 'obsidian';
import {DEFAULT_SETTINGS, InfoboxSettings} from "./settings";
import {getCalloutSectionInfo, getFrontmatter, getGroupSectionInfo} from "./section";
import {AddGroup, AddKeyValue, DeleteGroup, DeleteKeyValue, EditKeyValue, LockBox, UnlockBox} from "./actions";
import {Infobox, InfoboxGroup} from "./types";
import {getPairFromSection, valueFromKey} from "./key";

export default class InfoboxPlugin extends Plugin {
	settings: InfoboxSettings;
	infoBoxes: Map<string, Infobox> = new Map<string, Infobox>();

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
				const frontmatter = getFrontmatter(content);
				this.clearButtons(context.docId);
				if (box.header) {
					const buttonContainer = document.createElement('div');
					buttonContainer.classList.add('infobox-button-container');
					box.buttons.push(buttonContainer);

					if (box.calloutSection.text.contains("%% unlocked %%")) {
						createButton(
							buttonContainer,
							'plus-circle',
							'Add a new group',
							['infobox-group-button'],
							AddGroup(this.app, box));

						createButton(
							buttonContainer,
							'unlock',
							'Lock this infobox (prevents adding or removing groups)',
							['infobox-group-button'],
							LockBox(this.app, box));
					} else {
						createButton(
							buttonContainer,
							'lock',
							'Unlock this infobox (allows adding or removing groups)',
							['infobox-group-button'],
							UnlockBox(this.app, box));
					}

					box.header.appendChild(buttonContainer);
				}

				box.groups.forEach((group) => {

					switch (group.content.tagName) {
						case 'TABLE': {
							if (box.calloutSection.text.contains("%% unlocked %%")) {
								const buttonContainer = document.createElement('div');
								buttonContainer.classList.add('infobox-button-container');
								box.buttons.push(buttonContainer);

								createButton(
									buttonContainer,
									'plus-circle',
									'Add a new item to this group',
									['infobox-group-button'],
									AddKeyValue(this.app, group));

								createButton(
									buttonContainer,
									'trash',
									'Delete this group',
									['infobox-group-button'],
									DeleteGroup(this.app, group));

								group.header.appendChild(buttonContainer);
							}
							const table = group.content as HTMLTableElement;
							Array.from(table.rows).slice(1).forEach((row, index) => {
								try {
									const key = getPairFromSection(group.contentSection, index);
									if (!key) {
										console.log('no key');
										return;
									}
									const val = valueFromKey(frontmatter, key);

										const buttonContainer = document.createElement('div');
										buttonContainer.classList.add('infobox-button-container', 'infobox-content-button-container');
										box.buttons.push(buttonContainer);

										createButton(
											buttonContainer,
											'pencil',
											'Edit this item',
											['infobox-content-button'],
											EditKeyValue(this.app, key, val, group.contentSection));

										if (box.calloutSection.text.contains("%% unlocked %%")) {
											createButton(
												buttonContainer,
												'trash',
												'Delete this item',
												['infobox-content-button'],
												DeleteKeyValue(this.app, key, val, group.contentSection));
										}

										row.cells[1].appendChild(buttonContainer);
								} catch (e) {
									console.log(e);
								}
							})
						}
					}
					this.infoBoxes.set(context.docId, box);
				})
			}, this);
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		// this.addSettingTab(new InfoboxSettingTab(this.app, this));
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

	private async getInfoBoxes(callouts: NodeListOf<Element>, content: string[], path: string) {
		const infoboxes: Infobox[] = [];

		await Promise.all(Array.from<Element>(callouts).map(async (el) => {
			const box = el as HTMLElement;
			const boxLines = await getCalloutSectionInfo(content, box);
			if (!boxLines) {
				console.log('no box lines');
				return;
			}

			const groups: InfoboxGroup[] = [];

			Array.from<Element>(box.children).forEach((el) => {
				const child = el as HTMLElement;
				if (child.tagName === 'H6' && child.nextElementSibling && !child.nextElementSibling.tagName.startsWith('H')) {
					const groupLines = getGroupSectionInfo(boxLines, child.dataset.heading || '');
					if (!groupLines) {
						return;
					}

					groups.push({
						header: child,
						headerSection: groupLines.header,
						content: child.nextElementSibling as HTMLElement,
						contentSection: groupLines.content
					});
				}
			});

			const headerIdx = Array.from(box.children).findIndex((el) => el.tagName === 'H1');

			infoboxes.push({
				groups: groups,
				callout: box,
				calloutSection: boxLines,
				header: headerIdx === -1 ? undefined : box.children[headerIdx] as HTMLElement,
				file: path,
				buttons: []
			})
		}));

		return infoboxes;
	}

	onunload() {
		this.clearButtons();
	}

	private clearButtons(path?: string) {
		this.infoBoxes.forEach((box) => {
			if (!path || box.file === path) {
				box.buttons.forEach((button) => {
					button.remove();
				});
			}
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

function createButton(container: HTMLElement, icon :string, titleText :string, classList :string[], onClick :(e :MouseEvent) => void) : HTMLElement {
	const button = document.createElement('span');
	button.classList.add(...classList, 'clickable-icon')
	button.setAttribute('title', titleText);
	setIcon(button, icon);
	button.addEventListener('click', onClick);
	container.appendChild(button);
	return button;
}
