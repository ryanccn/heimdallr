// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/* eslint-disable unicorn/prefer-top-level-await */

import { calculateProof } from './proof';

const challengeDataElem = document.querySelector<HTMLScriptElement>('#challenge-data')!;

const statusElem = document.querySelector<HTMLDivElement>('#status')!;
const statusTextElem = document.querySelector<HTMLSpanElement>('#status-text')!;
const statusExtraElem = document.querySelector<HTMLSpanElement>('#status-extra')!;

(async () => {
	const { challenge, difficulty } = JSON.parse(challengeDataElem.text) as { challenge: string; difficulty: number };

	const startTime = Date.now();
	const { nonce } = await calculateProof({
		data: challenge,
		difficulty,
		concurrency: navigator.hardwareConcurrency ?? 2,
	});
	const endTime = Date.now();

	statusElem.classList.add('success');
	statusTextElem.textContent = 'Challenge solved!';
	statusExtraElem.textContent = `${((endTime - startTime) / 1000).toFixed(2)}s, ${nonce}its`;

	setTimeout(() => {
		const redirect = location.href;

		location.href = `/.heimdallr/attest?${new URLSearchParams({
			redirect,
			nonce: nonce.toString(),
			// hash,
		})}`;
	}, 500);
})().catch((error) => {
	console.error(error);

	if (error instanceof Error) {
		statusElem.classList.add('failure');
		statusTextElem.textContent = 'Challenge failed!';
		statusExtraElem.textContent = error.message;
	}
});
