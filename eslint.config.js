import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { plugin as shadcn } from '@shadcn/lint';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '@lucide/svelte',
							message: 'Use phosphor-svelte/lib/*Icon instead (see AGENTS.md).'
						},
						{
							name: 'lucide-svelte',
							message: 'Use phosphor-svelte/lib/*Icon instead (see AGENTS.md).'
						}
					],
					patterns: [
						{
							group: ['@lucide/*', 'lucide-*', '@hugeicons/*', '@tabler/*'],
							message: 'Use phosphor-svelte/lib/*Icon instead (see AGENTS.md).'
						}
					]
				}
			]
		}
	},
	{
		// Strict shadcn design-system lint (see AGENTS.md). Svelte markup is
		// fully read by ESLint + svelte-eslint-parser (Oxlint misses markup).
		files: ['**/*.svelte'],
		plugins: { shadcn },
		settings: {
			shadcn: {
				note: 'See AGENTS.md for design rules and approved exceptions.'
			}
		},
		rules: {
			'shadcn/no-restyle': [
				'error',
				{
					allow: ['layout'],
					contracts: [
						{ pattern: '^Button$', allow: ['w-full', 'mt-*', 'mb-*'] },
						{
							pattern: '(Card\\.Title$|^CardTitle$|^Title$)',
							allow: ['layout', 'typography'],
							deny: ['font-*']
						},
						{
							pattern: '(Card\\.Content$|^CardContent$|^Content$)',
							allow: ['layout', 'spacing']
						},
						{
							// The calculator editor needs a mono typeface and a fixed
							// line-height so gutter rows align with textarea lines.
							pattern: '^Textarea$',
							allow: ['layout', 'spacing', 'typography']
						}
					],
					message: {
						spacing: 'Use a {{component}} size ({{sizes}}) instead of padding.'
					}
				}
			],
			'shadcn/no-arbitrary-values': 'error',
			'shadcn/no-raw-colors': 'error',
			'shadcn/no-unknown-classes': 'error'
		}
	},
	{
		// Vendored design-system definitions, not usage: the shadcn rules
		// police how components are USED elsewhere (routes, lib features).
		// (Mirrors the upstream monorepo override pattern.)
		files: ['src/lib/components/ui/**/*.{svelte,ts}'],
		plugins: { shadcn },
		rules: {
			'shadcn/no-restyle': 'off',
			'shadcn/no-arbitrary-values': 'off',
			'shadcn/no-raw-colors': 'off',
			'shadcn/no-unknown-classes': 'off',
			'svelte/no-navigation-without-resolve': 'off'
		}
	}
);
