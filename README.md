# Heimdallr

Heimdallr is a modern, minimal, and privacy-friendly reverse proxy that separates the humans from the bots through proof-of-work challenges, running on [Cloudflare Workers](https://workers.cloudflare.com/).

Heimdallr was inspired by [Anubis](https://github.com/TecharoHQ/anubis). Heimdallr has a more minimalistic user interface and is optimized for reduced data storage/transfer and faster attestation verification, while Anubis is a more advanced and configurable solution.

## Configuration

`JWT_SECRET` is a required secret variable that is used for signing the [JSON Web Tokens](https://en.wikipedia.org/wiki/JSON_Web_Token) stored with clients. This should be set to a lengthy, securely generated random string.

Options such as the challenge difficulty, attestation cookie name, and attestation cookie max age can be configured within the source code by editing the `CONFIG` object in `src/index.ts`.

When deployed, Heimdallr should be configured with [routes](https://developers.cloudflare.com/workers/configuration/routing/routes/), so that it can intercept requests from clients to the origin.
