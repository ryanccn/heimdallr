import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
} from 'cloudflare:test';
import { expect } from 'vitest';

import worker from '../src';

export const fetchWorker = async (request: Request) => {
	const ctx = createExecutionContext();

	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
	const response = await (worker as ExportedHandler).fetch!(request as any, env, ctx);

	await waitOnExecutionContext(ctx);
	return response;
};

/**
 * This function assumes that the headers are well-formed! **Do not use in a production setting.**
 */
export const parseSetCookies = (setCookies: string[]): Record<string, string> => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Object.fromEntries(setCookies.map((c) => c.split(';')[0]!.split('=')));
};

export const expectInterstitial = async (response: Response) => {
	expect(response.status).toBe(401);
	expect(response.headers.get('content-type')).toMatch('text/html');
	expect(response.headers.get('x-heimdallr-status')).toBe(null);

	const text = await response.text();
	expect(text).toMatch(`<script id="challenge-data" type="application/json">`);
};
