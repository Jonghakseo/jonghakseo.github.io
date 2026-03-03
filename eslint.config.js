import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import astroPlugin from "eslint-plugin-astro";
import astroParser from "astro-eslint-parser";
import a11y from "eslint-plugin-jsx-a11y";

export default [
	{
		ignores: ["node_modules", "dist", ".astro"],
	},
	{
		files: ["**/*.{js,mjs,cjs,ts}"],
		languageOptions: {
			globals: globals.node,
		},
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	eslintPluginPrettierRecommended,
	{
		files: ["**/*.astro"],
		languageOptions: {
			parser: astroParser,
			parserOptions: {
				parser: tseslint.parser,
				sourceType: "module",
				extraFileExtensions: [".astro"],
			},
		},
		plugins: {
			astro: astroPlugin,
			"jsx-a11y": a11y,
		},
		rules: {
			...astroPlugin.configs.recommended.rules,
			...a11y.configs.recommended.rules,
			"prettier/prettier": "off",
			"jsx-a11y/iframe-has-title": "warn",
			"jsx-a11y/html-has-lang": "warn",
		},
	},
	{
		rules: {
			"@typescript-eslint/no-var-requires": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ varsIgnorePattern: "Props", ignoreRestSiblings: true },
			],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-empty-object-type": "warn",
			"@typescript-eslint/ban-ts-comment": "warn",
			"@typescript-eslint/triple-slash-reference": "warn",
			"@typescript-eslint/no-require-imports": "warn",
			"no-undef": "warn",
		},
	},
];
