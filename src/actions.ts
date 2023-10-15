import {App, MarkdownView, parseYaml, stringifyYaml} from "obsidian";
import {getRowSectionInfo, SectionInfo} from "./section";
import {DeleteGroupModal, DeleteKeyValModal, EditKeyValModal, NewGroupModal, NewKeyValModal} from "./modal";
import {deletePair, Infobox, InfoboxGroup, Key, setPair} from "./types";

async function applyChange(app: App, change: (frontmatter: any, content: string[]) => void) {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (view) {
		const file = view.file;
		if (file) {
			await app.vault.process(file, (data) => {
				const contentArray = data.split("\n");
				const frontmatterEnd = contentArray.slice(1).findIndex((line) => line === "---") + 1;
				const frontmatter = parseYaml(contentArray.slice(1, frontmatterEnd).join('\n'));

				change(frontmatter, contentArray);

				contentArray.splice(0, frontmatterEnd + 1, '---', stringifyYaml(frontmatter).trimEnd(), '---');

				return contentArray.join('\n');
			});
		}
	}
}

export function LockBox(app: App, box: Infobox) {
	return async (e: MouseEvent) => {
		e.preventDefault();

		await applyChange(app, (_, contentArray) => {
			contentArray.splice(box.calloutSection.lineStart+1, 1);
		})
	}
}

export function UnlockBox(app: App, box: Infobox) {
	return async (e: MouseEvent) => {
		e.preventDefault();

		await applyChange(app, (_, contentArray) => {
			contentArray.splice(box.calloutSection.lineStart+1, 0, "> %% unlocked %%");
		})
	}
}


export function AddGroup(app: App, box: Infobox) {
    return async (e: MouseEvent) => {
        e.preventDefault();

        new NewGroupModal(app, async (name, type) => {
            await applyChange(app, (frontmatter, contentArray) => {
				let insert = `> ###### ${name}\n`;
				console.log(type)
				switch (type) {
					case 'table':
						insert += `> | Type | Stat |\n> | --- | --- |`;
				}

				contentArray.splice(box.calloutSection.lineEnd + 1, 0, insert);
			});
        }).open();
    };
}

export function DeleteGroup(app: App, group: InfoboxGroup) {
    return async (e: MouseEvent) => {
        e.preventDefault();

        const name = group.header.dataset.heading;
        if (!name) {
            return;
        }

        new DeleteGroupModal(app, async () => {
            await applyChange(app, (frontmatter, contentArray) => {
				delete frontmatter[name.toLowerCase()];

				contentArray.splice(group.headerSection.lineStart, group.contentSection.lineEnd - group.headerSection.lineStart + 1);
			})
        }, name).open();
    };
}

export function AddKeyValue(app: App, group: InfoboxGroup) {
    return async (e: MouseEvent) => {
        e.preventDefault();

        new NewKeyValModal(app, async (key, val) => {
            await applyChange(app, (frontmatter, contentArray) => {
				const parent = group.header.dataset.heading?.toLowerCase();
				if (!parent) {
					return;
				}

				const insert = `> | ${key} | \`=this.${parent}.${key.toLowerCase()}\` |`;

				contentArray.splice(group.contentSection.lineEnd + 1, 0, insert);

				if (!frontmatter[parent]) {
					frontmatter[parent] = {};
				}
				frontmatter[parent][key.toLowerCase()] = val;
			});
        }).open();
    };
}

export function EditKeyValue(app: App, key: Key, val: string, group: SectionInfo) {
    return async (e: MouseEvent) => {
        e.preventDefault();

		const row = getRowSectionInfo(group, key.key.last() as string);
		if (!row) {
			console.log('no row');
			return;
		}

		const name = row.text.match(/> \|? ?(.+?) ?\|/)?.[1] || key.key.last() as string;

        new EditKeyValModal(app, async (newVal) => {
            await applyChange(app, (frontmatter) => {
				setPair(frontmatter, key, newVal);
			});
        }, name as string, val).open();
    };
}

export function DeleteKeyValue(app: App, key: Key, val: string, group: SectionInfo) {
    return async (e: MouseEvent) => {
        e.preventDefault();

		const row = getRowSectionInfo(group, key.key.last() as string);
		if (!row) {
			console.log('no row');
			return;
		}

		const name = row.text.match(/> \|? ?(.+?) ?\|/)?.[1] || key.key.last() as string;

        new DeleteKeyValModal(app, async () => {
            await applyChange(app, (frontmatter, contentArray) => {
				deletePair(frontmatter, key);

				contentArray.splice(row.lineStart, 1);
			});
        }, name, val).open();
    };
}
