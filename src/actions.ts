import {App, MarkdownView, parseYaml, stringifyYaml} from "obsidian";
import {getRowSectionInfo, SectionInfo} from "./section";
import {DeleteGroupModal, DeleteKeyValModal, NewGroupModal, NewKeyValModal} from "./modal";
import {Infobox, InfoboxGroup} from "./types";

export function AddGroup(app: App, box: Infobox) {
    return async (e: MouseEvent) => {
        e.preventDefault();

        new NewGroupModal(app, async (name, type) => {
            const view = app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const file = view.file;
                if (file) {
                    await app.vault.process(file, (data) => {
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
            }
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
            const view = app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const file = view.file;
                if (file) {
                    await app.vault.process(file, (data) => {
                        const contentArray = data.split("\n");

                        const frontmatterEnd = contentArray.slice(1).findIndex((line) => line === "---") + 1;
                        const frontmatter = parseYaml(contentArray.slice(1, frontmatterEnd).join('\n'));

                        delete frontmatter[name.toLowerCase()];

                        contentArray.splice(group.headerSection.lineStart, group.contentSection.lineEnd - group.headerSection.lineStart + 1);

                        contentArray.splice(0, frontmatterEnd + 1, '---', stringifyYaml(frontmatter).trimEnd(), '---');

                        return contentArray.join('\n');
                    });
                }
            }
        }, name).open();
    };
}

export function AddKeyValue(app: App, group: InfoboxGroup) {
    return async (e: MouseEvent) => {
        e.preventDefault();

        new NewKeyValModal(app, async (key, val) => {
            const view = app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const file = view.file;
                if (file) {
                    await app.vault.process(file, (data) => {
                        const contentArray = data.split("\n");

                        const parent = group.header.dataset.heading?.toLowerCase();
                        if (!parent) {
                            return data;
                        }

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
            }
        }).open();
    };
}

export function EditKeyValue(app: App, parent: string, key: string, val: string) {
    return async (e: MouseEvent) => {
        e.preventDefault();

        new NewKeyValModal(app, async (_, newVal) => {
            const view = app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const file = view.file;
                if (file) {
                    await app.vault.process(file, (data) => {
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
            }
        }, key, val).open();
    };
}

export function DeleteKeyValue(app: App, parent: string, key: string, val: string, group: SectionInfo) {
    return async (e: MouseEvent) => {
        e.preventDefault();

        new DeleteKeyValModal(app, async () => {
            const view = app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const file = view.file;
                if (file) {
                    await app.vault.process(file, (data) => {
                        const contentArray = data.split("\n");
                        const frontmatterEnd = contentArray.slice(1).findIndex((line) => line === "---") + 1;

                        const frontmatter = parseYaml(contentArray.slice(1, frontmatterEnd).join('\n'));

                        delete frontmatter[parent][key.toLowerCase()];

                        const row = getRowSectionInfo(group, key);
                        if (!row) {
                            console.log('no row');
                            return data;
                        }

                        contentArray.splice(row.lineStart, 1);
                        contentArray.splice(0, frontmatterEnd + 1, '---', stringifyYaml(frontmatter).trimEnd(), '---');

                        return contentArray.join('\n');
                    });
                }
            }
        }, key, val).open();
    };
}
