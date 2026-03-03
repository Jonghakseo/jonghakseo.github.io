---
title: "Supporting HMR in a Monorepo"
description: "How to solve the issue of internal packages not supporting HMR in a monorepo environment using resolve aliases."
publishDate: "2024-11-16"
tags: ["developer-tools"]
lang: "en"
translationQuality: "draft"
---

Our company's frontend repository operates as a monorepo. We migrated to a Turborepo-based monorepo around September last year, and adopted pnpm this March.

When we extracted packages like `ui` and `animation` as part of the monorepo transition, their entry points pointed to built output, which caused difficulties with HMR. In a typical development environment this isn't a problem, but for environments like Storybook where you need to modify and preview UI packages simultaneously, it's a critical issue.

For example, consider the following scenario:

1. Run Storybook in dev mode
2. Change a style in the `ui` package's Button component
3. Rebuild the `ui` package
4. Storybook detects the change in the `ui` package
5. Full Reload

The HMR functionality hidden deep inside Vite's React plugin—normally encapsulated and out of sight—roughly works like this:

1. Map module dependency relationships
2. Traverse the module dependency tree, detect changes, and inject HMR scripts that notify the outside
3. When a specific module changes, the HMR script detects it and reloads only that module + invalidates its cache

In step 2, the logic determines whether a module is an external dependency or internal source code before injecting the HMR script. The problem is that in a monorepo environment, this logic isn't smart enough to precisely distinguish whether a specific package is an external or internal dependency.

So what's the quick fix?

In development, we just need to tell the HMR logic that these are internal dependencies, not external modules. But how?

```ts
import { type AliasOptions, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const isDev = process.env.NODE_ENV === "development";

const devAliases = {
	// Reference via local paths to support HMR for packages in development
	"@ui": path.resolve(__dirname, "../../packages/ui/index"),
	"@icon": path.resolve(__dirname, "../../packages/icon/index"),
	"@style": path.resolve(__dirname, "../../packages/style/index"),
} satisfies AliasOptions;

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: isDev ? devAliases : undefined,
	},
});
```

It's as simple as that!

The example uses Vite's `resolve.alias`, but this solution works equally well with webpack and other bundler configurations.

**When referencing via local paths, you must explicitly specify the entry point like `index.ts`! Otherwise, the module resolver will use the `package.json` entry point, which means HMR won't work as intended because it'll still treat the built output as the entry.**

If you're familiar with the basic mechanics of HMR and understand how module resolution works in JavaScript environments, you can add HMR support in a monorepo with this straightforward solution. :)
