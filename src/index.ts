// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Hono, type Context } from 'hono';

import { sign as signJWT, verify as verifyJWT } from 'hono/jwt';
import { setCookie, deleteCookie } from 'hono/cookie';
import { parse as parseCookie, type CookieOptions } from 'hono/utils/cookie';

import { secureHeaders } from 'hono/secure-headers';

import { vValidator } from '@hono/valibot-validator';
import {
	safeParse as vSafeParse,
	pipe as vPipe,
	transform as vTransform,
	object as vObject,
	string as vString,
	number as vNumber,
	url as vUrl,
	safeInteger as vSafeInteger,
	// hash as vHash,
	// nonEmpty as vNonEmpty,
} from 'valibot';

import { transformEnv, type Env } from './env';
import { matchPathSegments, sha256, uint8ArrayToHex } from './utils';

type HContext = Context<{ Bindings: Env }>;

const attestationCookieOptions = {
	path: '/',
	httpOnly: true,
	secure: true,
	sameSite: 'lax',
} satisfies CookieOptions;

const setAttestationCookie = (c: HContext, value: string) =>
	setCookie(c, c.env.CONFIG.cookieName, value, {
		...attestationCookieOptions,
		expires: new Date(Date.now() + c.env.CONFIG.cookieMaxAge * 1000),
	});

const deleteAttestationCookie = (c: HContext) =>
	deleteCookie(c, c.env.CONFIG.cookieName, attestationCookieOptions);

const makeChallenge = async (req: Request, env: Env) => {
	const realIP = req.headers.get('x-real-ip') ?? '';
	const userAgent = req.headers.get('user-agent') ?? '';
	const acceptLanguage = req.headers.get('accept-language') ?? '';
	const partialDate = Math.floor(Date.now() / (env.CONFIG.cookieMaxAge * 1000));
	const { difficulty } = env.CONFIG;
	const secretDrv = await sha256(env.CONFIG.jwtSecret).then((v) => uint8ArrayToHex(v));

	const data = 'v1,'
		+ `realIP=${realIP},`
		+ `userAgent=${userAgent},`
		+ `acceptLanguage=${acceptLanguage},`
		+ `partialDate=${partialDate},`
		+ `difficulty=${difficulty},`
		+ `secretDrv=${secretDrv},`;

	return sha256(data);
};

const app = new Hono<{ Bindings: Env }>().basePath('/.heimdallr');

app.use((c, next) => secureHeaders({
	contentSecurityPolicy: {
		defaultSrc: ['\'none\''],
		styleSrc: [`'${ASSET_MANIFEST.styleHash}'`],
		scriptSrc: [`'${ASSET_MANIFEST.scriptHash}'`, '\'strict-dynamic\''],
	},
	permissionsPolicy: {
		geolocation: [],
		camera: [],
		microphone: [],
	},
	crossOriginEmbedderPolicy: 'require-corp',
	xDownloadOptions: false,
	xDnsPrefetchControl: false,
})(c, next));

app.use(async (c, next) => {
	await next();

	c.res.headers.set('x-robots-tag', 'noindex,nofollow');
	if (!c.res.headers.has('cache-control')) {
		c.res.headers.set('cache-control', 'no-cache');
	}
});

app.get(
	'/attest',

	vValidator(
		'query',
		vObject({
			redirect: vPipe(vString(), vUrl()),
			nonce: vPipe(vString(), vTransform((i) => Number.parseInt(i, 10)), vSafeInteger()),
			// hash: vPipe(vString(), vHash(['sha256'])),
		}),
		(result, c) => {
			if (!result.success) return c.json({ error: 'Bad request' }, 400);
		},
	),

	async (c) => {
		const { nonce, redirect } = c.req.valid('query');

		if (new URL(c.req.url).origin !== new URL(redirect).origin) {
			return c.json({ error: 'Invalid redirect' }, 400);
		}

		const challenge = await makeChallenge(c.req.raw, c.env).then((v) => uint8ArrayToHex(v));
		const hash = await sha256(challenge + nonce).then((v) => uint8ArrayToHex(v));

		if (!hash.startsWith('0'.repeat(c.env.CONFIG.difficulty))) {
			deleteAttestationCookie(c);
			return c.json({ error: 'Invalid attestation' }, 403);
		}

		const now = Math.floor(Date.now() / 1000);

		const jwt = await signJWT({
			// hash,
			// challenge,
			nonce,
			iat: now,
			exp: now + c.env.CONFIG.cookieMaxAge,
			nbf: now - 30,
		}, c.env.CONFIG.jwtSecret, 'HS256');

		setAttestationCookie(c, jwt);
		return c.redirect(redirect, 302);
	});

app.get('/interstitial', async (c) => {
	const challenge = await makeChallenge(c.req.raw, c.env)
		.then((v) => uint8ArrayToHex(v));
	const { difficulty } = c.env.CONFIG;

	const head = ''
		+ `<script type="module">${ASSET_MANIFEST.script}</script>`
		+ `<style>${ASSET_MANIFEST.style}</style>`
		+ `<script id="challenge-data" type="application/json">${JSON.stringify({ challenge, difficulty })}</script>`;

	const rendered = ASSET_MANIFEST.html.replace('</head>', head + '</head>');

	c.header('cache-control', 'no-cache');
	deleteAttestationCookie(c);
	return c.html(rendered, 401);
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

const attestationSchema = vObject({
	// hash: vPipe(vString(), vHash(['sha256'])),
	// challenge: vPipe(vString(), vNonEmpty()),
	nonce: vPipe(vNumber(), vSafeInteger()),
});

type ValidateOutcome = 'pass-strong' | 'pass-weak' | 'fail' | 'ignore';

const validate = async (req: Request, env: Env): Promise<ValidateOutcome> => {
	const url = new URL(req.url);
	if (
		matchPathSegments(url, ['.well-known'])
		|| url.pathname === '/favicon.ico'
		|| url.pathname === '/robots.txt'
	) return 'ignore';

	const userAgent = req.headers.get('user-agent');
	if (!!userAgent && !userAgent.toLowerCase().includes('mozilla')) return 'ignore';

	const cookies = parseCookie(req.headers.get('cookie') ?? '', env.CONFIG.cookieName);

	const attestationJWT = cookies[env.CONFIG.cookieName];
	if (!attestationJWT) {
		return 'fail';
	}

	let payload;

	try {
		payload = await verifyJWT(attestationJWT, env.CONFIG.jwtSecret, 'HS256');
	} catch {
		return 'fail';
	}

	if (Math.random() > 0.1) return 'pass-weak';

	const { success, output: attestation } = vSafeParse(attestationSchema, payload);
	if (!success) {
		return 'fail';
	}

	const { nonce } = attestation;

	const challenge = await makeChallenge(req, env).then((v) => uint8ArrayToHex(v));
	const hash = await sha256(challenge + nonce).then((v) => uint8ArrayToHex(v));

	if (!hash.startsWith('0'.repeat(env.CONFIG.difficulty))) {
		return 'fail';
	}

	// const referenceChallenge = await makeChallenge(req, env.JWT_SECRET);
	// const rawChallenge = hexToUint8Array(challenge);
	// if (!timingSafeEqual(rawChallenge, referenceChallenge)) {
	// 	return 'fail';
	// }

	// const referenceHash = await sha256(challenge + nonce);
	// const rawHash = hexToUint8Array(hash);
	// if (!timingSafeEqual(rawHash, referenceHash)) {
	// 	return 'fail';
	// }

	return 'pass-strong';
};

export default {
	fetch: async (req, rawEnv, ctx) => {
		const env = transformEnv(rawEnv);

		if (matchPathSegments(new URL(req.url), ['.heimdallr'])) {
			return app.fetch(req, env, ctx);
		}

		const outcome = await validate(req, env);

		if (outcome === 'fail') {
			const patchedReq = new Request(new URL('/.heimdallr/interstitial', req.url), req);
			return app.fetch(patchedReq, env, ctx);
		}

		let resp;

		if (env.CONFIG.mockOriginResponse) {
			resp = new Response(outcome, {
				headers: {
					'content-type': 'text/plain;charset=utf-8',
				},
			});
		} else {
			const originResp = await fetch(req);
			resp = new Response(originResp.body, originResp);
		}

		if (env.CONFIG.addStatusHeader) {
			resp.headers.set('x-heimdallr-status', outcome);
		}

		return resp;
	},
} satisfies ExportedHandler;
