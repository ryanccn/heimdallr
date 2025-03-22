import { expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest';

import { expectInterstitial, fetchWorker, parseSetCookies } from './utils';
import { fixtures } from './fixtures';
import { sign } from 'hono/jwt';

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

it.each([
	{ type: 'strong', mathRandomValue: 0 },
	{ type: 'weak', mathRandomValue: 1 },
])('valid JWT is valid ($type validation)', async ({ type, mathRandomValue }) => {
	const jwt = await obtainJWT('valid');

	const request = new Request(`http://test.local/`, {
		headers: {
			cookie: `${fixtures.env.COOKIE_NAME}=${jwt}`,
		},
	});

	vi.spyOn(Math, 'random').mockImplementationOnce(() => mathRandomValue);
	const response = await fetchWorker(request);

	expect(response.status).toBe(200);
	expect(response.headers.get('x-heimdallr-status')).toBe(`pass-${type}`);
});

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
