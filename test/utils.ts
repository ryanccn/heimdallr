// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	createExecutionContext,
	waitOnExecutionContext,
} from 'cloudflare:test';
import { expect } from 'vitest';
import { fixtures } from './fixtures';

import worker from '../src';

export const fetchWorker = async (
	request: Request,
	overrideEnv?: (env: typeof fixtures.env) => Record<string, unknown> | PromiseLike<Record<string, unknown>>,
) => {
	const ctx = createExecutionContext();

	const response = await (worker as ExportedHandler).fetch!(
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
		request as any,
		overrideEnv === undefined ? fixtures.env : await overrideEnv(fixtures.env),
		ctx,
	);

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
