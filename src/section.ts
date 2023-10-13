import {App} from "obsidian";

const INFOBOX_CALLOUT = '> [!infobox]';

export interface SectionInfo {
	text: string;
	lineStart: number;
	lineEnd: number;
}

export async function getCalloutSectionInfo(app: App, el: HTMLElement): Promise<SectionInfo | undefined> {
	const file = app.workspace.getActiveFile();
	if (!file) {
		console.log('no file');
		return undefined;
	}

	const content = await app.vault.read(file);
	const contentArray = content.split("\n");

	const start = contentArray.findIndex((line) => line.startsWith("> # " + el.children[0].dataset.heading));
	const startLine = start !== -1 && contentArray[start - 1] === INFOBOX_CALLOUT ? start - 1 : -1;
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

export function getGroupSectionInfo(section: SectionInfo, header: string): {
	header: SectionInfo,
	content: SectionInfo
} | undefined {
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
			text: lines[headerLine] + '\n',
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


