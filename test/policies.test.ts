// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { it, expect, describe } from 'vitest';
import { expectInterstitial, fetchWorker } from './utils';

describe('user agents', () => {
	it('ignores benign user agents', async () => {
		const request = new Request('http://test.local', {
			headers: {
				'user-agent': 'curl/0.0.1',
			},
		});

		const response = await fetchWorker(request);

		expect(response.status).toBe(200);
		expect(response.headers.get('x-heimdallr-status')).toBe('ignore');
	});

	it('filters empty user agents', async () => {
		const request = new Request('http://test.local');
		const response = await fetchWorker(request);
		await expectInterstitial(response);
	});

	it('filters user agents containing "mozilla"', async () => {
		const request = new Request('http://test.local', {
			headers: {
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
			},
		});

		const response = await fetchWorker(request);
		await expectInterstitial(response);
	});
});

describe('URL patterns', () => {
	it.each([
		{ name: '.well-known', path: '/.well-known/test' },
		{ name: 'favicon.ico', path: '/favicon.ico' },
		{ name: 'robots.txt', path: '/robots.txt' },
	])('ignores URL pattern $name', async ({ path }) => {
		const request = new Request(`http://test.local${path}`);
		const response = await fetchWorker(request);

		expect(response.status).toBe(200);
		expect(response.headers.get('x-heimdallr-status')).toBe('ignore');
	});

	it('responds to .heimdallr/', async () => {
		const request = new Request('http://test.local/.heimdallr/test');
		const response = await fetchWorker(request);

		expect(response.status).toBe(404);
	});

	it('responds to .heimdallr/interstitial', async () => {
		const request = new Request('http://test.local/.heimdallr/interstitial');
		const response = await fetchWorker(request);

		await expectInterstitial(response);
	});
});
