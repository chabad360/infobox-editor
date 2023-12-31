import {App, Modal, setIcon, Setting} from "obsidian";

export class NewGroupModal extends Modal {
	name: string;
	type = 'table';
	onSubmit: (name: string, type: string) => void;

	constructor(app: App, onSubmit: (name: string, type: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl("h2", {text: "Create New Group?"});

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
				dropdown.setValue(this.type);
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
		const {contentEl} = this;
		contentEl.empty();
	}
}

export class DeleteGroupModal extends Modal {
	name: string;
	onSubmit: () => void;

	constructor(app: App, onSubmit: () => void, name: string) {
		super(app);
		this.onSubmit = onSubmit;
		this.name = name || '';
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl("h2", {text: "Are you sure you want to delete this group?"});

		new Setting(contentEl)
			.setName("Group")
			.addText((text) => {
				if (this.name !== '') {
					text.setValue(this.name);
				}
			})
			.setDisabled(true);


		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Cancel")
					.setCta()
					.onClick(() => {
						this.close();
					}))
			.addButton((btn) =>
				btn
					.setButtonText("Yes")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit();
					}));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

function createNestedSettings(containerEl: HTMLElement, name: string, state: (state?: boolean) => boolean) : HTMLElement {
	const nest = containerEl.createEl("details", {
		cls: "infobox-nested-settings",
		attr: {
			...(state() ? {open: 'open'} : {})
		}
	})

	const summary =  nest.createEl("summary")
	summary.ontoggle = () => {
		state(nest.open)
	}
	new Setting(summary).setHeading().setName(name);

	setIcon(summary.createDiv("collapser").createDiv("handle"), "chevron-right")

	return nest;
}

export type NewKeyValModalOptions = {
	key: string,
	label: string,
	value: string
}

export class NewKeyValModal extends Modal {
	parent: string;

	key: string;
	label: string;
	value: string;

	onSubmit: (opt: NewKeyValModalOptions) => void;
	updateKey: () => void;

	advancedState = false;

	constructor(app: App, onSubmit: (opt: {
		key: string,
		label: string,
		value: string
	}) => void, parent: string) {

		super(app);
		this.onSubmit = onSubmit;
		this.parent = parent.toLowerCase();

		this.key = `${this.parent}.`;
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl("h2", {text: "Add additional item"});

		new Setting(contentEl)
			.setName("Item")
			.addText((text) => {
				text.onChange((value) => {
					if (this.key == `${this.parent}.${escapeKey(this.label)}`) {
						this.key = `${this.parent}.${escapeKey(value)}`
						if (this.updateKey) {
							this.updateKey()
						}
					}

					this.label = value;
				})
				text.setPlaceholder("Label")
			})
			.addText((text) => {
				text.onChange((value) => {
					this.value = value
				})
				text.setPlaceholder("Value")
			});

		const advanced = createNestedSettings(contentEl, "Advanced", (state) => {
			if (state !== undefined) {
				this.advancedState = state;
			}
			return this.advancedState;
		})

		new Setting(advanced)
			.setName("Key")
			.addText((text) => {
				text.onChange((value) => {
					this.key = value;
				})
				text.setPlaceholder("Key")
				text.setValue(this.key);
				this.updateKey = () => {
					text.setValue(this.key);
				}
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit({
							key: this.key,
							label: this.label,
							value: this.value
						});
					}));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

function escapeKey(key: string) :string {
	return key?.replace(/\./g, '\\.')
		.replace(/\s/g, '_').toLowerCase() || '';
}

export class EditKeyValModal extends Modal {
	key: string;
	value: string;
	onSubmit: (value: string) => void;

	constructor(app: App, onSubmit: (value: string) => void, key: string, value?: string) {
		super(app);
		this.onSubmit = onSubmit;
		this.key = key;
		this.value = value || '';
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl("h2", {text: "Edit item"});

		new Setting(contentEl)
			.setName("Item")
			.addText((text) => {
				text.setPlaceholder("Key")
				text.setValue(this.key);
				text.setDisabled(true);
			})
			.addText((text) => {
				text.onChange((value) => {
					this.value = value
				})
				text.setPlaceholder("Value")
				if (this.value !== '') {
					text.setValue(this.value);
				}
			});


		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.value);
					}));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

export class DeleteKeyValModal extends Modal {
	key: string;
	value: string;
	onSubmit: () => void;

	constructor(app: App, onSubmit: () => void, key: string, value: string) {
		super(app);
		this.onSubmit = onSubmit;
		this.key = key || '';
		this.value = value || '';
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl("h2", {text: "Are you sure you want to delete this item?"});

		new Setting(contentEl)
			.setName("Item")
			.addText((text) => {
				if (this.key !== '') {
					text.setValue(this.key);
				}
			})
			.addText((text) => {
				if (this.value !== '') {
					text.setValue(this.value);

				}
			})
			.setDisabled(true);

		// new Setting(contentEl)
		// 	.setName("Value")
		// 	.addText((text) => {
		// 		text.onChange((value) => {
		// 			this.value = value
		// 		})
		// 		if (this.value !== '') {
		// 			text.setValue(this.value);
		// 		}
		// 	});


		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Cancel")
					.setCta()
					.onClick(() => {
						this.close();
					}))
			.addButton((btn) =>
				btn
					.setButtonText("Yes")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit();
					}));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

