import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import { fixtures } from './test/fixtures';
import { readFile } from 'node:fs/promises';

const ASSET_MANIFEST = await readFile('dist/asset-manifest.json', { encoding: 'utf8' });

export default defineWorkersConfig({
	define: {
		ASSET_MANIFEST,
	},

	test: {
		coverage: {
			provider: 'istanbul',
			include: ['src/**/*.ts'],
			exclude: ['src/client/**/*.ts'],
		},

		poolOptions: {
			workers: {
				wrangler: {
					configPath: './wrangler.toml',
				},

				miniflare: {
					bindings: {
						...fixtures.env,
					},
				},
			},
		},
	},
});
