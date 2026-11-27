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

## Opt-in HTTP host

`auth-http.mjs` now supplies `createShellHttpHost` and `shellAccessAdapter`. The
factory is not yet assembled into a deployed Worker and does not use the synthetic
demo as an authenticated renderer. It adds bootstrap/start, callback, sign-out and
explicit local sign-in-recovery routes. Missing sessions on registered deep links
preserve their destination. A callback redirects to a clean registered local URL;
external destinations are rejected. Responses use no-store/no-referrer and a
restrictive CSP. Styled/product rendering and its reviewed CSP remain integration
work, not a claim that the finished UI is wired up.

The caller must provide:

- The private named ShellAccess binding, never a fallback public fetch URL.
- Explicit client policy and separate encryption/CSRF keys.
- `allowAuthRequest`, an actual host abuse-limit adapter (no production no-op).
- `routeFor` and `destinationFor`, the registered route mappings.
- `renderAccount`, which must enforce product/workspace/Records permissions and
  must not treat an account identity as ownership. Account authority is rechecked
  after asynchronous rendering before release.

Logout GET only displays a confirmation. POST verifies Origin and a session-bound
HMAC CSRF token before requesting root revocation. Explicit `/auth/reset` POST can
discard the browser's local Shell cookie and establish a fresh bootstrap cookie;
it does not claim to revoke the root or other server sessions. An unreachable old
Shell session remains bounded by its existing expiry/revocation policy.

Access's opt-in host keeps the existing magic-link confirmation and resubmit form.
Recovery destinations travel with their individual emails and start new handshakes,
including when the email opens in another browser. Purchase welcome links currently
open Shell Home; direct purchased-workspace routing still needs the authoritative
mapping. Free registration and Recognise saving are not implemented by this host.

The additional developer-only joined HTTP suite is:

```sh
HF_ACCESS_REPO=/absolute/path/to/access node --test apps/shell/test-support/access-http.integration.mjs
```

It uses actual local Access HTTP routes and the named private binding, captured
email payloads and a synthetic renderer. It is not live email, real-browser,
Records or staging evidence. No local commands are required from the project owner
just to review these PRs.
