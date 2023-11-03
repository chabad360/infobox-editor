import "./.d";

export function log(...args : any[]) {
	// @ts-ignore
	if (window.debugging) {
		console.log(...args);
	}
}
