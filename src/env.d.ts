// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface DocumentEventMap {
	"theme-change": CustomEvent<{ theme: "light" | "dark" }>;
}
