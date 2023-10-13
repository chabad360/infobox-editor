import {parseYaml} from "obsidian";

const INFOBOX_CALLOUT = '> [!infobox]';

export interface SectionInfo {
	text: string;
	lineStart: number;
	lineEnd: number;
}

export async function getCalloutSectionInfo(contentArray: string[], el: HTMLElement): Promise<SectionInfo | undefined> {
	const start = contentArray.findIndex((line) => line.startsWith("> # " + el.children[0].dataset.heading));
	const startLine = start !== -1 && contentArray[start - 1] === INFOBOX_CALLOUT ? start - 1 : -1;
	if (startLine === -1) {
		return undefined;
	}

	const end = contentArray.findIndex((line, index) => index > start && !line.startsWith(">"));
	const endLine = end === -1 ? contentArray.length : end - 1;

	return {
		text: contentArray.slice(startLine, end).join('\n'),
		lineStart: startLine,
		lineEnd: endLine
	}
}

export function getGroupSectionInfo(section: SectionInfo, headerStr: string): {
	header: SectionInfo,
	content: SectionInfo
} | undefined {
	const lines = section.text.split('\n');

	const headerLine = lines.findIndex((line) => line === "> ###### " + headerStr) ;
	if (headerLine === -1) {
		return undefined;
	}

	const start = lines.findIndex((line, index) => index > headerLine && !line.startsWith("> #"));
	if (start === -1) {
		return undefined;
	}

	const end = lines.findIndex((line, index) => index > start && line.startsWith("> #"));
	const endLine = end === -1 ? lines.length -1 : end - 1;

	return {
		header: {
			text: lines[headerLine] + '\n',
			lineStart: section.lineStart + headerLine,
			lineEnd: section.lineStart + headerLine
		},
		content: {
			text: lines.slice(start, end === -1 ? lines.length : end).join('\n'),
			lineStart: section.lineStart + start,
			lineEnd: section.lineStart + endLine
		}
	}
}

export function getFrontmatter(content: string[]) : any {
	const frontmatterEnd = content.slice(1).findIndex((line) => line === "---");

	if (frontmatterEnd === -1) {
		return undefined;
	}

	return parseYaml(content.slice(1, frontmatterEnd+1).join('\n'));
}

export function getRowSectionInfo(section: SectionInfo, row: number | string | HTMLTableRowElement): SectionInfo | undefined {
	const lines = section.text.split('\n');
	console.log(section, row);

	switch (typeof row) {
		case "number": {
			if (row >= lines.length) {
				return undefined;
			}

			return {
				text: lines[row],
				lineStart: section.lineStart + row,
				lineEnd: section.lineStart + row
			}
		}
		case "string": {
			const rowLine = lines.findIndex((line) => line.startsWith("> | " + row + " |"));
			if (rowLine === -1) {
				return undefined;
			}
			return {
				text: lines[rowLine],
				lineStart: section.lineStart + rowLine,
				lineEnd: section.lineStart + rowLine
			}
		}
		case "object": {
			const rowLine = lines.findIndex((line) => line.startsWith("> | " + row.children[0].innerText + " |"));
			if (rowLine === -1) {
				return undefined;
			}
			return {
				text: lines[rowLine],
				lineStart: section.lineStart + rowLine,
				lineEnd: section.lineStart + rowLine
			}
		}
	}

}
