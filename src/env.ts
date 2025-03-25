// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { nonEmpty, object, optional, parse, pipe, safeInteger, string, transform } from 'valibot';

const intStringSchema = () => pipe(string(), transform((v) => Number.parseInt(v)), safeInteger());
const flagSchema = () => pipe(string(), transform((v) => v === '1' || v === 'true'));

export type Config = {
	jwtSecret: string;

	difficulty: number;
	cookieName: string;
	cookieMaxAge: number;
	addStatusHeader: boolean;

	mockOriginResponse: boolean;
};

export type Env = {
	CONFIG: Config;
};

const EnvConfigSchema = pipe(
	object({
		JWT_SECRET: pipe(string(), nonEmpty()),
		DIFFICULTY: optional(intStringSchema()),
		COOKIE_NAME: optional(string()),
		COOKIE_MAX_AGE: optional(intStringSchema()),
		ADD_STATUS_HEADER: optional(flagSchema()),
		MOCK_ORIGIN_RESPONSE: optional(flagSchema()),
	}),
	transform((input) => {
		return {
			jwtSecret: input.JWT_SECRET,
			difficulty: input.DIFFICULTY ?? 5,
			cookieName: input.COOKIE_NAME ?? 'heimdallr.attestation',
			cookieMaxAge: input.COOKIE_MAX_AGE ?? 7 * 24 * 60 * 60,
			addStatusHeader: input.ADD_STATUS_HEADER ?? true,
			mockOriginResponse: input.MOCK_ORIGIN_RESPONSE ?? false,
		} satisfies Config;
	}),
);

export const transformEnv = (raw: unknown): Env => {
	const config = parse(EnvConfigSchema, raw);
	return { CONFIG: config };
};
