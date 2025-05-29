// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, it } from 'vitest';
import { fetchWorker } from './utils';

const isOk = (promise: Promise<unknown>) => promise.then(() => true).catch(() => false);

it('unset required env fails', async () => {
	const request = new Request(`http://test.local/`);

	const outcome = await isOk(fetchWorker(request, () => ({})));
	expect(outcome).toBe(false);
});

it('set required env succeeds', async () => {
	const request = new Request(`http://test.local/`);

	const outcome = await isOk(fetchWorker(request, () => ({
		JWT_SECRET: 'abcdef',
	})));

	expect(outcome).toBe(true);
});

it('extra env succeeds', async () => {
	const request = new Request(`http://test.local/`);

	const outcome = await isOk(fetchWorker(request, () => ({
		JWT_SECRET: 'abcdef',
		__EXTRA_TEST_ENV: 'abcdef',
	})));

	expect(outcome).toBe(true);
});
