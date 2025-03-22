// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
// SPDX-FileCopyrightText: 2025 Xe Iaso <me@xeiaso.net>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// https://github.com/TecharoHQ/anubis/blob/c66305904b1cc5764a131cb2627480071b405275/cmd/anubis/js/proof-of-work.mjs

interface ProofOptions {
	data: string;
	difficulty: number;
	concurrency: number;
}

export const calculateProof = (options: ProofOptions) =>
	new Promise<{ hash: string; nonce: number }>((resolve, reject) => {
		const webWorkerURL = URL.createObjectURL(new Blob([
			'"use strict";(', createTaskFn(), ')()',
		], { type: 'application/javascript;charset=utf-8' }));

		const workers: Worker[] = [];

		for (let i = 0; i < options.concurrency; i++) {
			const worker = new Worker(webWorkerURL);

			worker.addEventListener('message', (event) => {
				for (const worker of workers) worker.terminate();
				worker.terminate();

				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				resolve(event.data);
			});

			worker.addEventListener('error', () => {
				for (const worker of workers) worker.terminate();
				worker.terminate();

				reject(new Error('Failed to calculate proof of work'));
			});

			worker.postMessage({
				...options,
				nonce: i,
			});

			workers.push(worker);
		}

		URL.revokeObjectURL(webWorkerURL);
	});

const createTaskFn = () => (() => {
	// eslint-disable-next-line unicorn/consistent-function-scoping
	const sha256 = (text: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));

	// eslint-disable-next-line unicorn/consistent-function-scoping
	const uint8ArrayToHex = (arr: Uint8Array) => {
		return [...arr]
			.map((c) => c.toString(16).padStart(2, '0'))
			.join('');
	};

	addEventListener('message', (event: MessageEvent<ProofOptions & { nonce: number }>) => {
		(async () => {
			const { data, difficulty, concurrency } = event.data;
			let { nonce } = event.data;

			while (true) {
				const currentHash = await sha256(data + nonce);
				const thisHash = new Uint8Array(currentHash);
				let valid = true;

				for (let j = 0; j < difficulty; j++) {
					// which byte we are looking at
					const byteIndex = Math.floor(j / 2);
					// which nibble in the byte we are looking at (0 is high, 1 is low)
					const nibbleIndex = j % 2;

					// get the nibble
					const nibble = (thisHash[byteIndex]! >> (nibbleIndex === 0 ? 4 : 0)) & 0x0F;

					if (nibble !== 0) {
						valid = false;
						break;
					}
				}

				if (valid) {
					postMessage({ hash: uint8ArrayToHex(thisHash), nonce });
					break;
				}

				nonce += concurrency;
			}
		})().catch((error) => { throw error; });
	});
}).toString();
