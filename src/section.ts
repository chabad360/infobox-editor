import {parseYaml} from "obsidian";

const INFOBOX_CALLOUT = '> [!infobox]';

export interface SectionInfo {
	text: string;
	lineStart: number;
	lineEnd: number;
	element?: HTMLElement;
	parent?: SectionInfo;
	children?: SectionInfo[];
}

export function getCalloutSectionInfo(contentArray: string[], el: HTMLElement): SectionInfo | undefined {
	const startLine = contentArray.findIndex((line) => line.startsWith(INFOBOX_CALLOUT));
	if (startLine === -1) {
		return undefined;
	}

	const end = contentArray.findIndex((line, index) => index > startLine && !line.startsWith(">"));
	const endLine = end === -1 ? contentArray.length : end - 1;

	const firstEl = el.children.item(0);
	let headerEl = el.children.item(1);
	const thirdEl = el.children.item(2);
	if (firstEl?.tagName != "P" || headerEl?.tagName != "H1") {
		if (firstEl?.tagName === "H1") {
			headerEl = firstEl;
		} else {
			return undefined;
		}
	}


	const h = headerEl;
	headerEl = createDiv();
	h.parentElement?.insertBefore(headerEl, h);
	headerEl.appendChild(firstEl);
	headerEl.appendChild(h);

	if (thirdEl?.tagName === "P")
		headerEl.appendChild(thirdEl);

	return {
		text: contentArray.slice(startLine, end).join('\n'),
		lineStart: startLine,
		lineEnd: endLine,
		element: el,
		children: [
			{
				text: contentArray[startLine+1],
				lineStart: startLine+1,
				lineEnd: startLine+1,
				element: headerEl as HTMLElement
			}
		]
	}
}

export function getGroupSectionInfo(section: SectionInfo, header: HTMLElement): SectionInfo | undefined {
	const lines = section.text.split('\n');

	const headerLine = lines.findIndex((line) => line === "> ###### " + header.dataset.heading || '') ;
	if (headerLine === -1) {
		return undefined;
	}

	const start = lines.findIndex((line, index) => index > headerLine && !line.startsWith("> #"));
	if (start === -1) {
		return undefined;
	}

	const end = lines.findIndex((line, index) => index > start && line.startsWith("> #"));
	const endLine = end === -1 ? lines.length -1 : end - 1;

	const div = createDiv();
	if (!header.parentElement || !header.nextElementSibling) {
		return undefined;
	}

	header.parentElement.insertBefore(div, header);
	div.appendChild(header);
	div.appendChild(div.nextElementSibling as HTMLElement);


	const s :SectionInfo = {
		text: lines.slice(headerLine, end === -1 ? lines.length : end).join('\n'),
		lineStart: section.lineStart + headerLine,
		lineEnd: section.lineStart + endLine,
		parent: section,
		element: div
	}

	s.children =[
		{
			text: lines[headerLine] + '\n',
			lineStart: section.lineStart + headerLine,
			lineEnd: section.lineStart + headerLine,
			parent: s,
			element: header
		},
		{
			text: lines.slice(start, end === -1 ? lines.length : end).join('\n'),
			lineStart: section.lineStart + start,
			lineEnd: section.lineStart + endLine,
			parent: s,
			element: header.nextElementSibling as HTMLElement
		}
	]

	section.children ? section.children.push(s) : section.children = [s];

	return s;
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

	let s : SectionInfo | undefined;

	const el = section.element as HTMLTableElement;
	if (!el) {
		return undefined;
	}

	if (typeof row === "number") {
		if (row >= lines.length) {
			return undefined;
		}

		s = {
			text: lines[row],
			lineStart: section.lineStart + row,
			lineEnd: section.lineStart + row,
			element: el.rows[row] as HTMLElement
		}
	} else if (typeof row === "string") {
		const rowLine = lines.findIndex((line) => line.contains("."+ row + "`"))
		if (rowLine === -1) {
			return undefined;
		}

		s = {
			text: lines[rowLine],
			lineStart: section.lineStart + rowLine,
			lineEnd: section.lineStart + rowLine,
			element: el.rows[rowLine] as HTMLElement
		}
	} else if (row instanceof HTMLTableRowElement) {
		const rowLine = lines.findIndex((line) => line.contains("." + (row.children[0] as HTMLElement).innerText + "`"));
		if (rowLine === -1) {
			return undefined;
		}

		s = {
			text: lines[rowLine],
			lineStart: section.lineStart + rowLine,
			lineEnd: section.lineStart + rowLine,
			element: row
		}
	}

	if (!s) {
		return undefined;
	}

	s.parent = section;
	section.children ? section.children.push(s) : section.children = [s];

	return s;
}

export function getKeyFromSection(section: SectionInfo, row: number): string | undefined {
	const lines = section.text.split('\n');
	return lines[row+2].match(/=this.(.+?)`\s?\|?/)?.[1];
}
