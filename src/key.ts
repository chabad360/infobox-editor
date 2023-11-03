import {SectionInfo} from "./section";
import {Key} from "./types";

export function value(obj: any, keys: string[]): any | undefined {
	if (keys.length === 0) {
		return obj;
	}

	if (!obj[keys[0]]) {
		return undefined;
	}

	return value(obj[keys[0]], keys.slice(1));
}

export function setValue(obj: any, keys: string[], value: any) {
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

export function deleteValue(obj: any, keys: string[]) {
	if (keys.length === 0) {
		return;
	}

	if (keys.length === 1) {
		delete obj[keys[0]];
		return;
	}

	if (!obj[keys[0]] || !obj) {
		return;
	}

	deleteValue(obj[keys[0]], keys.slice(1));
}

export function getPairFromSection(group: SectionInfo, row: number): Key | undefined {
	return Key.newFromGroup(group, row);
}

export function valueFromKey(frontmatter: any, key: Key): any | undefined {
	return key.getFromFrontmatter(frontmatter);
}

export function setPair(frontmatter: any, key: Key, value: string) {
	return key.setInFrontmatter(frontmatter, value);
}

export function deletePair(frontmatter: any, key: Key) {
	return key.deleteFromFrontmatter(frontmatter);
}
