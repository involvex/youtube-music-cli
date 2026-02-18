import pluginReact from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import {defineConfig} from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import js from '@eslint/js';

export default defineConfig([
	{
		ignores: ['templates/**/*'],
	},
	{
		files: ['**/*.{js,mjs,cjs}'],
		plugins: {js},
		extends: ['js/recommended'],
		languageOptions: {globals: {...globals.node}},
	},
	...tseslint.configs.recommended,
	{
		files: ['**/*.{ts,mts,cts,jsx,tsx}'],
		languageOptions: {
			globals: {...globals.node},
			ecmaVersion: 'latest',
			sourceType: 'module',
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ['**/*.jsx', '**/*.tsx'],
		...pluginReact.configs.flat['recommended'],
		plugins: {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			'react-hooks': hooksPlugin as any,
		},
		settings: {
			react: {version: 'detect'},
			jsxRuntime: 'automatic',
		},
		rules: {
			...hooksPlugin.configs.recommended.rules,
			'react/react-in-jsx-scope': 'off',
			'react/jsx-uses-react': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
		},
	},
]);
