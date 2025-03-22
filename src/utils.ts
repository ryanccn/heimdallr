// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// const HTML_ESCAPE_MAP: Record<string, string> = {
// 	'&': '&amp;',
// 	'<': '&lt;',
// 	'>': '&gt;',
// 	'"': '&quot;',
// 	'\'': '&#39;',
// };

// export const escapeHTML = (s: string) => {
// 	return s.replaceAll(/[&<>"']/g, (v) => HTML_ESCAPE_MAP[v]!);
// };

export const matchPathSegments = (u: URL, s: string[]) => {
	const a = u.pathname.split('/').slice(0, s.length + 1);
	const b = ['', ...s];

	/* istanbul ignore if -- @preserve */
	if (a.length !== b.length) return false;

	for (const [i, elem] of a.entries()) {
		if (elem !== b[i]) return false;
	}

	return true;
};

export const sha256 = (text: string) =>
	crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
		.then((buf) => new Uint8Array(buf));

export const uint8ArrayToHex = (arr: Uint8Array) => {
	return [...arr]
		.map((c) => c.toString(16).padStart(2, '0'))
		.join('');
};
