// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest';

import { sign } from 'hono/jwt';
import { expectInterstitial, fetchWorker, parseSetCookies } from './utils';
import { fixtures } from './fixtures';

beforeAll(() => {
	vi.useFakeTimers();
	vi.setSystemTime(fixtures.valid.time);
});

afterAll(() => {
	vi.useRealTimers();
});

afterEach(() => {
	vi.restoreAllMocks();
});

const obtainJWT = async (fixtureType: 'valid' | 'expired' | 'future') => {
	if (fixtureType !== 'valid') vi.setSystemTime(fixtures[fixtureType].time);

	const request = new Request(`http://test.local/.heimdallr/attest?${new URLSearchParams({
		redirect: 'http://test.local/',
		nonce: fixtures[fixtureType].nonce.toString(),
	}).toString()}`);

	const response = await fetchWorker(request);
	expect(response.status).toBe(302);

	if (fixtureType !== 'valid') vi.setSystemTime(fixtures.valid.time);

	const jwt = parseSetCookies(response.headers.getSetCookie())[fixtures.env.COOKIE_NAME];
	return jwt;
};

const validationTypes = ['strong', 'weak'] as const;
const mockOriginResponses = [false, true] as const;
const addStatusHeaders = [false, true] as const;

const combinations = validationTypes.flatMap(
	(validationType) => mockOriginResponses.flatMap(
		(mockOriginResponse) => addStatusHeaders.flatMap(
			(addStatusHeader) => ({ validationType, mockOriginResponse, addStatusHeader }),
		),
	),
);

it.each(combinations)(
	'valid JWT is valid ($validationType, $mockOriginResponse, $addStatusHeader)',
	async ({ validationType, mockOriginResponse, addStatusHeader }) => {
		const jwt = await obtainJWT('valid');

		const request = new Request(`http://test.local/`, {
			headers: {
				cookie: `${fixtures.env.COOKIE_NAME}=${jwt}`,
			},
		});

		vi.spyOn(Math, 'random').mockImplementationOnce(() => validationType === 'strong' ? 0 : 1);

		if (!mockOriginResponse) {
			vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
				let url;
				if (input instanceof Request) url = input.url.toString();
				else if (input instanceof URL) url = input.toString();
				else url = input;

				if (url !== 'http://test.local/')
					throw new Error('Mock implementation of `fetch` should not have been called for non-testing URL');

				return Promise.resolve(new Response(null, { headers: { 'x-test-origin-response': '1' } }));
			});
		}

		const response = await fetchWorker(
			request,
			(env) => ({
				...env,
				ADD_STATUS_HEADER: addStatusHeader ? 'true' : 'false',
				MOCK_ORIGIN_RESPONSE: mockOriginResponse ? 'true' : 'false',
			}),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('x-heimdallr-status'))
			.toBe(addStatusHeader ? `pass-${validationType}` : null);
		expect(response.headers.get('x-test-origin-response'))
			.toBe(mockOriginResponse ? null : '1');
	},
);

it('expired JWT is invalid', async () => {
	const jwt = await obtainJWT('expired');

	const request = new Request(`http://test.local/`, {
		headers: {
			cookie: `${fixtures.env.COOKIE_NAME}=${jwt}`,
		},
	});

	const response = await fetchWorker(request);
	await expectInterstitial(response);
});

it('future JWT is invalid', async () => {
	const jwt = await obtainJWT('future');

	const request = new Request(`http://test.local/`, {
		headers: {
			cookie: `${fixtures.env.COOKIE_NAME}=${jwt}`,
		},
	});

	const response = await fetchWorker(request);
	await expectInterstitial(response);
});

it('malformed JWT is invalid (when strong)', async () => {
	const malformedJWT = await sign({ __malformed: true }, fixtures.env.JWT_SECRET, 'HS256');

	const request = new Request(`http://test.local/`, {
		headers: {
			cookie: `${fixtures.env.COOKIE_NAME}=${malformedJWT}`,
		},
	});

	vi.spyOn(Math, 'random').mockImplementationOnce(() => 0);
	const response = await fetchWorker(request);
	await expectInterstitial(response);
});

it('incorrect JWT is invalid (when strong)', async () => {
	const incorrectJWT = await sign({ nonce: 1 }, fixtures.env.JWT_SECRET, 'HS256');

	const request = new Request(`http://test.local/`, {
		headers: {
			cookie: `${fixtures.env.COOKIE_NAME}=${incorrectJWT}`,
		},
	});

	vi.spyOn(Math, 'random').mockImplementationOnce(() => 0);
	const response = await fetchWorker(request);
	await expectInterstitial(response);
});
