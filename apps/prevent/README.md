# Prevent heart risk

First-pass Prevent web application for deployment to a Cloudflare Worker.

Prevent supports the shared Navigator loop:

```text
Known → Unknown → To discuss → Next action → Results → Known → repeat
```

The application records agreed actions, baselines, owners, measures, review
points and results. It prepares a print/PDF-friendly Prevent Take-Forward Pack
without interpreting results or recommending treatment.

## Run locally

Requirements: Node.js 22.13 or later.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite and sign in with:

```text
PREVENT-LOCAL
```

To use a different local testing code, copy `.env.example` to `.env.local`,
change `PREVENT_LOCAL_ACCESS_CODE`, then restart the development server.

## Production access

Prevent owns its login. It does not use an OpenAI or ChatGPT account.

The current production-ready route uses purchase/access codes and a signed,
`HttpOnly` session cookie. Production fails closed unless both of these
Cloudflare Worker secrets are set:

```text
PREVENT_SESSION_SECRET
PREVENT_ACCESS_CODE_HASHES
```

Generate a code hash locally:

```bash
PREVENT_SESSION_SECRET='your-long-random-secret' npm run auth:hash -- 'HF-XXXX-XXXX'
```

Multiple hashes can be supplied as a comma-separated value. Configure HTTPS,
rate limiting on `/api/verify-code`, request-size limits, no caching on the auth
routes and logs that never record submitted codes.

Magic-link login can be added to the same Prevent-owned session model after an
email delivery provider and identity/entitlement store are selected. It is not
silently simulated in this version.

## Cloudflare build and deployment

```bash
npm run build
```

The generated Worker output is written under `dist/`. The existing
`worker/index.ts` is the Cloudflare Worker entry point used by Vinext.

Set the two production secrets:

```bash
npx wrangler secret put PREVENT_SESSION_SECRET
npx wrangler secret put PREVENT_ACCESS_CODE_HASHES
```

Then deploy:

```bash
npx wrangler deploy
```

Before production use, connect the Worker to the intended HeartFirst hostname
and apply the edge controls listed above.

## Data behaviour

Health working information remains in the browser's local storage in this
first-pass application. The access cookie verifies product access; it does not
contain health information. Records remain separate for each person.

The current JSON data shape is intended for a later shared Navigator vault, but
this first pass does not silently read Clarify or Navigate browser storage.
Cross-product reuse requires the shared identity and vault layer to be
implemented deliberately.

## Useful commands

- `npm run dev` — local development
- `npm run build` — production Worker build
- `npm test` — build and application checks
- `npm run lint` — code-quality checks
- `npm run auth:hash -- 'HF-XXXX-XXXX'` — hash a production access code

The application uses React, Vinext, Vite and Cloudflare Workers.
