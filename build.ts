// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { build as esbuild } from 'esbuild';
import { transform as lightningcss } from 'lightningcss';
import { minify } from 'html-minifier';

import { rm, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const relativePath = (...parts: string[]) => path.join(import.meta.dirname, ...parts);

await rm(relativePath('dist'), { recursive: true, force: true });
await mkdir(relativePath('dist'));

const html = await readFile(relativePath('src/index.html'), { encoding: 'utf8' })
	.then((html) => minify(html, { collapseWhitespace: true, removeComments: true }));

const styleSrc = await readFile(relativePath('src/client/index.css'), { encoding: 'utf8' });

const style = new TextDecoder().decode(
	lightningcss({
		code: new TextEncoder().encode(styleSrc),
		filename: 'index.css',
		minify: true,
	}).code,
);

const script = await esbuild({
	entryPoints: ['src/client/index.ts'],
	platform: 'browser',
	format: 'esm',
	bundle: true,
	minify: true,
	logLevel: 'info',
	write: false,
}).then((result) => result.outputFiles[0]!.text);

await esbuild({
	entryPoints: ['src/index.ts'],
	platform: 'neutral',
	format: 'esm',
	bundle: true,
	minify: true,
	define: { ASSET_MANIFEST: JSON.stringify({ html, style, script }) },
	outfile: relativePath('dist/index.js'),
	logLevel: 'info',
});
