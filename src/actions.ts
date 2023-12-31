import {App, MarkdownView, parseYaml, stringifyYaml} from "obsidian";
import {getRowSectionInfo, SectionInfo} from "./section";
import {DeleteGroupModal, DeleteKeyValModal, EditKeyValModal, NewGroupModal, NewKeyValModal} from "./modal";
import {Infobox, Key} from "./types";
import {deletePair, setPair} from "./key";

const ROW_NAME_REGEX = /> \|? ?(.+?) ?\|/;

export async function applyChange(app: App, change: (frontmatter: any, content: string[]) => void) {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (view) {
		const file = view.file;
		if (file) {
			await app.vault.process(file, (data) => {
				const contentArray = data.split("\n");
				const frontmatterEnd = contentArray.slice(1).findIndex((line) => line === "---") + 1;
				const frontmatter = parseYaml(contentArray.slice(1, frontmatterEnd).join('\n')) || {};

				change(frontmatter, contentArray);

				contentArray.splice(0, frontmatterEnd + 1, '---', stringifyYaml(frontmatter).trimEnd(), '---');

				return contentArray.join('\n');
			});
			// @ts-ignore, seems to be undocumented
			setTimeout(view.leaf.rebuildView(), 200).then();
		}
	}
}

export function LockBox(app: App, box: Infobox) {
	return async (e: MouseEvent) => {
		e.preventDefault();

		await applyChange(app, (_, contentArray) => {
			contentArray.splice(box.callout.lineStart+1, 1);
		})
	}
}

export function UnlockBox(app: App, box: Infobox) {
	return async (e: MouseEvent) => {
		e.preventDefault();

		await applyChange(app, (_, contentArray) => {
			contentArray.splice(box.callout.lineStart+1, 0, "> %% unlocked %%");
		})
	}
}


export function AddGroup(app: App, box: Infobox) {
    return async (e: MouseEvent) => {
        e.preventDefault();

        new NewGroupModal(app, async (name, type) => {
            await applyChange(app, (frontmatter, contentArray) => {
				let insert = `> ###### ${name}\n`;
				switch (type) {
					case 'table':
						insert += `> | Type | Stat |\n> | --- | --- |`;
						break;
				}

				contentArray.splice(box.callout.lineEnd + 1, 0, insert);
			});
        }).open();
    };
}

export function DeleteGroup(app: App, group: SectionInfo) {
    return async (e: MouseEvent) => {
        e.preventDefault();

        const name = group.children?.at(0)?.element?.dataset.heading;
        if (!name) {
            return;
        }

        new DeleteGroupModal(app, async () => {
            await applyChange(app, (frontmatter, contentArray) => {
				delete frontmatter[name.toLowerCase()];

				contentArray.splice(group.lineStart, group.lineEnd - group.lineStart + 1);
			})
        }, name).open();
    };
}

export function AddKeyValue(app: App, group: SectionInfo) {
    return async (e: MouseEvent) => {
        e.preventDefault();

        new NewKeyValModal(app, async ({
			key,
			label,
			value
		}) => {
            await applyChange(app, (frontmatter, contentArray) => {
				contentArray.splice(group.lineEnd + 1, 0, `> | ${label} | \`=this.${key}\` |`);

				Key.new(key)?.setInFrontmatter(frontmatter, value);
			});
        }, group.children?.at(0)?.element?.dataset.heading || '').open();
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

		const name = row.text.match(ROW_NAME_REGEX)?.[1] || key.key.last() as string;

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

		const name = row.text.match(ROW_NAME_REGEX)?.[1] || key.key.last() as string;

        new DeleteKeyValModal(app, async () => {
            await applyChange(app, (frontmatter, contentArray) => {
				deletePair(frontmatter, key);

				contentArray.splice(row.lineStart, 1);
			});
        }, name, val).open();
    };
}
