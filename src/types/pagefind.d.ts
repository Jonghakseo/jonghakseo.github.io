// @pagefind/default-ui does not ship TypeScript declarations.
declare module "@pagefind/default-ui" {
	export class PagefindUI {
		constructor(options: {
			element: string;
			baseUrl?: string;
			bundlePath?: string;
			showImages?: boolean;
		});
	}
}
