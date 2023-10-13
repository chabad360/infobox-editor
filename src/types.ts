import {SectionInfo} from "./section";

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
