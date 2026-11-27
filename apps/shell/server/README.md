# Server-side Shell authentication coordinator

`auth-client.mjs` implements the Shell side of the proposed Access handoff. It is
not yet wired into the local demo, an HTTP server, a Worker or a deployment.
Access remains a standalone application; Records remains a separate service.

First customer access starts in the purchase welcome email and is authenticated
by Access. My Navigator initiates the technical browser-bound handshake after
that authentication. Returning customers use Access's existing resubmit flow.
The host must connect both paths, preserve validated destination intent and start
a fresh transaction if an email opens in another browser. This module alone does
not implement those redirects.

The constructor requires a private Access adapter (`begin`, `redeem`, `check`,
`revoke`), both exact HTTPS origins, environment, a non-extractable AES-256-GCM key,
key ID, explicit cookie-persistence choice, transaction limit and page allowlist.
The active key is the only accepted key; rotating it invalidates pending cookies.
A previous-key window is not implemented or implicitly approved. Key provisioning,
rotation and emergency invalidation require the D-04 host configuration decision.

No root Access credential is accepted by this module. An Access-only browser
handler authenticates its own cookie and authorises the transaction. Shell sends
only its transaction/code/verifier/state over its private adapter at redemption.

The host must round-trip `bootstrap()`'s protected cookie before `begin()`. Each
transaction has its own encrypted HttpOnly host-only cookie, so another start
does not overwrite it. Access enforces the atomic outstanding-transaction budget.
The bootstrap mechanism is not an anti-abuse control against cookie clearing;
apply request limits at the host boundary.

`complete()` rejects missing, tampered, expired or wrong-browser transaction
cookies before private exchange. It returns a validated destination and cookies,
not an arbitrary redirect URL. Map page keys through the host route registry,
recheck the workspace's authority, set cookies and redirect to a clean URL using
no-store/no-referrer responses with no third-party content or credential logs.
A destination ID is not proof of purchase or Records ownership.

An existing different account is never silently replaced. A stale existing cookie
also fails closed and needs an explicit host recovery action. An exchange that
succeeds just before an account mismatch or lost response can leave an unreachable
session in Access; its bounded expiry applies and its code cannot be reused.
No automatic retry or cross-account substitution is implemented.

`logout()` requires POST, exact Origin, and a host-supplied session-bound CSRF
check. Only confirmed Access revocation returns a clearing cookie. The HTTP host
must clear private rendered state and revalidate restored tabs. No positive
session cache or passive renewal is implemented.

Run the ordinary Shell tests through its existing `npm test` script. Developers
can run the joined component test from the `my` root with an isolated Access
checkout containing the companion implementation:

```sh
HF_ACCESS_REPO=/absolute/path/to/access node --test apps/shell/test-support/access-handoff.integration.mjs
```

No live email, staging service, AWS resource or user record is contacted. Tests use
local Access magic-link routes, workerd/D1 and synthetic account/purchase fixtures.
The existing product and navigation demo remains unchanged until host integration.
