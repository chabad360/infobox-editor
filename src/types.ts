import {getKeyFromSection, SectionInfo} from "./section";

export interface InfoboxGroup {
	header: HTMLElement;
	headerSection: SectionInfo;
	content: HTMLElement;
	contentSection: SectionInfo;
}

export interface Infobox {
	groups: InfoboxGroup[];
	callout: HTMLElement;
	calloutSection: SectionInfo;
	header?: HTMLElement;
	file?: string;
	buttons: HTMLElement[];
}

export type Key = {parent:string | undefined, key:string};

export function getPairFromSection(group: SectionInfo, row: number) : Key | undefined {
	const rawKey = getKeyFromSection(group, row)?.split(".");
	console.log(rawKey);
	if (!rawKey || rawKey.length === 0) {
		console.log('no rawKey');
		return;
	}
	const key = rawKey.last()
	if (!key) {
		console.log('no key in rawKey');
		return;
	}

	return {parent: rawKey.length === 1 ? undefined : rawKey.first(), key: key};
}

export function valueFromKey(frontmatter: any, key: Key) : any | undefined {
	if (!key.parent) {
		return frontmatter[key.key];
	}
	return frontmatter[key.parent][key.key];
}

export function setPair(frontmatter: any, key: Key, value: string) {
	if (!key.parent) {
		frontmatter[key.key] = value;
		return;
	}
	frontmatter[key.parent][key.key] = value;
}

export function deletePair(frontmatter: any, key: Key) {
	if (!key.parent) {
		delete frontmatter[key.key];
		return;
	}
	delete frontmatter[key.parent][key.key];
}
