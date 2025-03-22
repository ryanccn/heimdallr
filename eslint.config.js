// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { config } from '@ryanccn/eslint-config';

export default config({
	globals: ['es2024'],
	ignores: ['**/coverage'],
	stylistic: true,
});
