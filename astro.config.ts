import { defineConfig } from "astro/config";
import fs from "fs";
import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import remarkUnwrapImages from "remark-unwrap-images";
import { remarkReadingTime } from "./src/utils/remark-reading-time.mjs";
import { visit } from "unist-util-visit";
import type { Root } from "hast";

// https://astro.build/config
export default defineConfig({
	// ! Please remember to replace the following site property with your own domain
	site: "https://jonghakseo.github.io/",
	prefetch: true,
	markdown: {
		remarkPlugins: [remarkUnwrapImages, remarkReadingTime],
		rehypePlugins: [rehypeImageOptimization],
		remarkRehype: { footnoteLabelProperties: { className: [""] } },
		shikiConfig: {
			theme: "dracula",
			wrap: true,
		},
	},
	integrations: [
		mdx({}),
		tailwind({
			applyBaseStyles: false,
		}),
		sitemap({
			filter: (page) => !page.includes("/translations/"),
		}),
		icon(),
	],
	vite: {
		plugins: [rawFonts([".ttf", ".woff"])],
		optimizeDeps: {
			exclude: ["@resvg/resvg-js"],
		},
	},
});

function rawFonts(ext: Array<string>) {
	return {
		name: "vite-plugin-raw-fonts",
		transform(_: string, id: string) {
			if (ext.some((e) => id.endsWith(e))) {
				const buffer = fs.readFileSync(id);
				return {
					code: `export default ${JSON.stringify(buffer)}`,
					map: null,
				};
			}
			return null;
		},
	};
}

// Rehype plugin to add loading="lazy" and decoding="async" to all img elements
function rehypeImageOptimization() {
	return (tree: Root) => {
		visit(tree, "element", (node) => {
			if (node.tagName === "img") {
				if (!node.properties.loading) {
					node.properties.loading = "lazy";
				}
				if (!node.properties.decoding) {
					node.properties.decoding = "async";
				}
			}
		});
	};
}
