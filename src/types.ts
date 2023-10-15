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

export class Key {
	key: string[];
	private rawKey :string;

	static new(group: SectionInfo, row: number) : Key | undefined {
		const rawKey = getKeyFromSection(group, row);
		if (!rawKey) {
			console.log('no rawKey');
			return undefined;
		}

		const key = new Key();

		key.rawKey = rawKey;
		key.key = rawKey.split('.');
		return key;
	}

	getFromFrontmatter(frontmatter: any) : any | undefined {
		return value(frontmatter, this.key);
	}

	setInFrontmatter(frontmatter: any, value: any) {
		return setValue(frontmatter, this.key, value);
	}

	deleteFromFrontmatter(frontmatter: any) {
		return deleteValue(frontmatter, this.key);
	}
}


function value(obj: any, keys: string[]) : any | undefined {
	if (keys.length === 0) {
		return obj;
	}

	if (!obj[keys[0]]) {
		return undefined;
	}

	return value(obj[keys[0]], keys.slice(1));
}

function setValue(obj: any, keys: string[], value: any) {
	if (keys.length === 0) {
		return;
	}

	if (keys.length === 1) {
		obj[keys[0]] = value;
		return;
	}

	if (!obj[keys[0]]) {
		obj[keys[0]] = {};
	}

	setValue(obj[keys[0]], keys.slice(1), value);
}

function deleteValue(obj: any, keys: string[]) {
	if (keys.length === 0) {
		return;
	}

	if (keys.length === 1) {
		delete obj[keys[0]];
		return;
	}

	if (!obj[keys[0]]) {
		return;
	}

	deleteValue(obj[keys[0]], keys.slice(1));
}

export function getPairFromSection(group: SectionInfo, row: number) : Key | undefined {
	return Key.new(group, row);
}

export function valueFromKey(frontmatter: any, key: Key) : any | undefined {
	return key.getFromFrontmatter(frontmatter);
}

export function setPair(frontmatter: any, key: Key, value: string) {
	return key.setInFrontmatter(frontmatter, value);
}

export function deletePair(frontmatter: any, key: Key) {
	return key.deleteFromFrontmatter(frontmatter);
}
