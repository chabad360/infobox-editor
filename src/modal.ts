import {App, Modal, Setting} from "obsidian";

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

export class NewKeyValModal extends Modal {
	key: string;
	value: string;
	onSubmit: (key: string, value: string) => void;

	constructor(app: App, onSubmit: (key: string, value: string) => void, key?: string, value?: string) {
		super(app);
		this.onSubmit = onSubmit;
		this.key = key || '';
		this.value = value || '';
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl("h2", {text: "Add additional item"});

		new Setting(contentEl)
			.setName("Item")
			.addText((text) => {
				text.onChange((value) => {
					this.key = value
				})
				text.setPlaceholder("Key")
				if (this.key !== '') {
					text.setValue(this.key);
					text.setDisabled(true)
				}
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
						this.onSubmit(this.key, this.value);
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

