// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { it, expect, assert, vi, beforeAll, afterAll } from 'vitest';

import { verify } from 'hono/jwt';
import { fixtures } from './fixtures';
import { fetchWorker, parseSetCookies } from './utils';

beforeAll(() => {
	vi.useFakeTimers();
	vi.setSystemTime(fixtures.valid.time);
});

afterAll(() => {
	vi.useRealTimers();
});

it('rejects invalid data', async () => {
	const request = new Request('http://test.local/.heimdallr/attest');
	const response = await fetchWorker(request);

	expect(response.status).toBe(400);
});

it('valid attestation is valid', async () => {
	const request = new Request(`http://test.local/.heimdallr/attest?${new URLSearchParams({
		redirect: 'http://test.local/',
		nonce: fixtures.valid.nonce.toString(),
	}).toString()}`);

	const response = await fetchWorker(request);
	expect(response.status).toBe(302);
	expect(response.headers.get('location') === 'http://test.local/');

	const jwt = parseSetCookies(response.headers.getSetCookie())[fixtures.env.COOKIE_NAME];
	expect(jwt).toBeTruthy();

	let data: { nonce: number; iat: number; exp: number; nbf: number };

	try {
		data = await verify(jwt!, fixtures.env.JWT_SECRET, 'HS256') as unknown as typeof data;
	} catch {
		assert.fail('JWT is invalid');
	}

	expect(data.nonce).toBe(fixtures.valid.nonce);

	const referenceTimeSec = Math.floor(fixtures.valid.time / 1000);
	expect(data.iat).toBe(referenceTimeSec);
	expect(data.exp).toBe(referenceTimeSec + 7 * 24 * 60 * 60);
	expect(data.nbf).toBe(referenceTimeSec - 30);
});

it('mismatched nonce fails attestation', async () => {
	const request = new Request(`http://test.local/.heimdallr/attest?${new URLSearchParams({
		redirect: 'http://test.local/',
		nonce: '0',
	}).toString()}`);

	const response = await fetchWorker(request);
	expect(response.status).toBe(403);
});

it('mismatched challenge fails attestation', async () => {
	const request = new Request(`http://test.local/.heimdallr/attest?${new URLSearchParams({
		redirect: 'http://test.local/',
		nonce: fixtures.valid.nonce.toString(),
	}).toString()}`, {
		headers: {
			'accept-language': '__accept_language_string',
		},
	});

	const response = await fetchWorker(request);
	expect(response.status).toBe(403);
});

it('cross-origin redirect fails attestation', async () => {
	const request = new Request(`http://test.local/.heimdallr/attest?${new URLSearchParams({
		redirect: 'http://test2.local/',
		nonce: fixtures.valid.nonce.toString(),
	}).toString()}`);

	const response = await fetchWorker(request);
	expect(response.status).toBe(400);
});
