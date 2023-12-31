import {getKeyFromSection, SectionInfo} from "./section";
import {deleteValue, setValue, value} from "./key";


export interface Infobox {
	callout: SectionInfo;
	file?: string;
	buttons: HTMLElement[];
}

export class Key {
	key: string[];
	private rawKey :string;

	static newFromGroup(group: SectionInfo, row: number) : Key | undefined {
		const rawKey = getKeyFromSection(group, row);
		if (!rawKey) {
			return undefined;
		}

		const key = new Key();

		key.rawKey = rawKey;
		key.key = rawKey.split('.');
		return key;
	}

	static new(rawKey: string) : Key | undefined {
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


