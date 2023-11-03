import {Editor, MarkdownPostProcessorContext, MarkdownView, normalizePath, Plugin, setIcon, Vault} from 'obsidian';
import {DEFAULT_SETTINGS, InfoboxSettings} from "./settings";
import {getCalloutSectionInfo, getFrontmatter, getGroupSectionInfo, getRowSectionInfo, SectionInfo} from "./section";
import {
	AddGroup,
	AddKeyValue,
	applyChange,
	DeleteGroup,
	DeleteKeyValue,
	EditKeyValue,
	LockBox,
	UnlockBox
} from "./actions";
import {Infobox} from "./types";
import {getPairFromSection, valueFromKey} from "./key";
import {log} from "./util";

const dragRow = new Map<HTMLElement, HTMLElement>();

export default class InfoboxPlugin extends Plugin {
	settings: InfoboxSettings;
	infoBoxes: Map<string, Infobox> = new Map<string, Infobox>();

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'infobox',
			name: 'Insert Infobox',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('> [!infobox]\n> # `=this.file.name`');
			},
		});

		this.registerMarkdownPostProcessor(async (element, context) => {
			const callouts = element.querySelectorAll('.callout[data-callout~=infobox] .callout-content');

			const content = await getContentArray(this.app.vault, context.sourcePath);
			if (!content) {
				console.log('no content');
				return;
			}

			const infoboxes = await this.getInfoBoxes(callouts, content, context.sourcePath);

			this.renderButtons(infoboxes, content, context);
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

	private renderButtons(infoboxes: Infobox[], content: string[], context: MarkdownPostProcessorContext) {
		infoboxes.forEach((box) => {
			const frontmatter = getFrontmatter(content);
			this.clearButtons(context.docId);
			log("box")
			if (box.callout.children?.at(0)) {
				log("header")
				const buttonContainer = document.createElement('div');
				buttonContainer.classList.add('infobox-button-container');
				box.buttons.push(buttonContainer);

				if (box.callout.text.contains("%% unlocked %%")) {
					createButton(
						buttonContainer,
						'plus-circle',
						'Add a new group',
						['clickable-icon'],
						AddGroup(this.app, box));

					createButton(
						buttonContainer,
						'unlock',
						'Lock this infobox (prevents adding or removing groups)',
						['clickable-icon'],
						LockBox(this.app, box));
				} else {
					createButton(
						buttonContainer,
						'lock',
						'Unlock this infobox (allows adding or removing groups)',
						['clickable-icon'],
						UnlockBox(this.app, box));
				}

				box.header.appendChild(buttonContainer);
			}

			box.callout.children?.forEach((group) => {
				switch (group.children?.at(1)?.element?.tagName) {
					case 'TABLE': {
						if (box.callout.text.contains("%% unlocked %%")) {
							const buttonContainer = document.createElement('div');
							buttonContainer.classList.add('infobox-button-container');
							box.buttons.push(buttonContainer);

							createButton(
								buttonContainer,
								'plus-circle',
								'Add a new item to this group',
								['clickable-icon'],
								AddKeyValue(this.app, group));

							createButton(
								buttonContainer,
								'trash',
								'Delete this group',
								['clickable-icon'],
								DeleteGroup(this.app, group));

							const header = group.children[0].element;

							if (!header) {
								return;
							}

							header.appendChild(buttonContainer);


								const dragHandle = document.createElement('span');
								dragHandle.classList.add('infobox-drag-handle', 'clickable-icon');
								dragHandle.setAttribute('title', 'Drag to reorder');
								setIcon(dragHandle, 'grip-vertical');
								box.buttons.push(dragHandle);

								this.draggable(group);
								header.prepend(dragHandle);

						}

						const content = group.children[1];
						const table = content.element as HTMLTableElement;
						Array.from(table.rows).slice(1).forEach((row, index) => {
							try {
								const key = getPairFromSection(content, index);
								if (!key) {
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
									['clickable-icon'],
									EditKeyValue(this.app, key, val, content));

								if (box.callout.text.contains("%% unlocked %%")) {
									createButton(
										buttonContainer,
										'trash',
										'Delete this item',
										['clickable-icon'],
										DeleteKeyValue(this.app, key, val, content));

									const rowSection = getRowSectionInfo(content, row);

									if (rowSection) {
										const dragHandle = document.createElement('span');
										dragHandle.classList.add('infobox-drag-handle', 'clickable-icon');
										dragHandle.setAttribute('title', 'Drag to reorder');
										setIcon(dragHandle, 'grip-vertical');
										box.buttons.push(dragHandle);

										this.draggable(rowSection);
										row.cells[0].prepend(dragHandle);
									}
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
	}

	private async getInfoBoxes(callouts: NodeListOf<Element>, content: string[], path: string) {
		const infoboxes: Infobox[] = [];

		Array.from<Element>(callouts).map(async (el) => {
			const box = el as HTMLElement;
			const boxLines = getCalloutSectionInfo(content, box);
			if (!boxLines) {
				log('no box lines')
				return;
			}

			Array.from<Element>(box.children).forEach((el) => {
				const child = el as HTMLElement;
				if (child.tagName === 'H6' && child.nextElementSibling && !child.nextElementSibling.tagName.startsWith('H')) {
					const groupLines = getGroupSectionInfo(boxLines, child);
					if (!groupLines) {
						return;
					}
				}
			});

			const headerIdx = Array.from(box.children).findIndex((el) => el.tagName === 'H1');

			infoboxes.push({
				callout: boxLines,
				header: headerIdx === -1 ? undefined : box.children[headerIdx] as HTMLElement,
				file: path,
				buttons: []
			})
		});

		return infoboxes;
	}

	private draggable(section: SectionInfo) {
		const el = section.element;
		const parent = el?.parentElement;
		if (!el || !parent) {
			console.log(el, parent)
			return;
		}

		el.draggable = true;
		const app = this.app;

		el.addEventListener("dragstart", function(e) {
			if (e.target !== el) {
				return false;
			}
			el.style.opacity = "0.2";
			dragRow.set(parent, el);
			// e.dataTransfer.effectAllowed = "move";
		})
		el.addEventListener("dragend", function(e,) {
			if (!dragRow.get(parent)) {
				return;
			}

			el.style.opacity = "1";
			dragRow.delete(parent);
			// console.log(el, section.parent, section);

			applyChange(app, (frontmatter, contentArray) => {
				const newIdx = Array.from(parent.children).indexOf(el);
				const sibling = section.parent?.children?.at(newIdx)
				if (!sibling) {
					return;
				}

				let newLine = sibling.lineStart;
				if (parent.children.length == newIdx + 1 ) {
					newLine = sibling.lineEnd-(section.lineEnd-section.lineStart);
				}

				console.log(section.parent?.children, newIdx, newLine)

				contentArray.splice(section.lineStart, section.lineEnd - section.lineStart + 1);
				contentArray.splice(newLine, 0, section.text);
			})
		})
		el.addEventListener("dragenter", function(e) {
			const dr = dragRow.get(parent);
			if (dr) {
				if (el.previousElementSibling === dr) {
					parent.insertBefore(dr, el.nextElementSibling);
				} else {
					parent.insertBefore(dr, el);
				}
			}
			e.preventDefault();
		})
		el.addEventListener("dragover", function(e) {
			e.preventDefault();
		});
		el.addEventListener("drop", function(e) {
			const dr = dragRow.get(parent);
			if (dr) {
				if (el.previousElementSibling === dr) {
					parent.insertBefore(dr, el.nextElementSibling);
				} else {
					parent.insertBefore(dr, el);
				}
			}
			e.preventDefault();
		})
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
