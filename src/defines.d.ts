// SPDX-FileCopyrightText: 2025 Ryan Cao <hello@ryanccn.dev>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

interface AssetManifest {
	html: string;
	style: string;
	script: string;
	styleHash: string;
	scriptHash: string;
};

declare const ASSET_MANIFEST: AssetManifest;
