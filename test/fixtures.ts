export const fixtures = {
	env: {
		JWT_SECRET: 'unsafe_hardcoded_secret',
		DIFFICULTY: (5).toString(),
		COOKIE_NAME: 'heimdallr.attestation',
		COOKIE_MAX_AGE: (7 * 24 * 60 * 60).toString(),
		ADD_STATUS_HEADER: 'true',
		MOCK_ORIGIN_RESPONSE: 'true',
	},

	valid: {
		time: 1_234_567_890,
		challenge: 'dbdca93c2261411516a85a4a9628b263e214f597e465c8ed72f13106d031155c',
		nonce: 154_850,
	},

	expired: {
		time: 0,
		challenge: 'ec471ce854da23fe24a184be6bf6bd99ea74fb3ba0fe543109ce8e88491ca105',
		nonce: 491_637,
	},

	future: {
		time: 1_234_567_890 + 60 * 60 * 1000,
		challenge: 'dbdca93c2261411516a85a4a9628b263e214f597e465c8ed72f13106d031155c',
		nonce: 154_850,
	},
} as const;
