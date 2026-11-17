# My Navigator — local interaction slice

Synthetic local-only preview, not an authentication implementation or deployable shell. No email, credentials, Records calls, persistent browser storage or product code. Reload resets the simulation. Dates are evaluated at 17 November 2026.

From the monorepo root (Node 24+):

```
node apps/shell/demo/server.mjs
```

Open http://127.0.0.1:4173. No dependency installation needed for this slice. Stop with Ctrl+C.

```
node --test apps/shell/test/*.test.mjs
```

“Try a scenario” offers active/ended purchases and service failure. The synthetic sign-in journey is example email → deliberate confirmation → My Navigator. Open Prevent with either standalone or bundle purchase; Compass requires explicit selection when no compatible purchase is selected. Try session expiry at the product destination and return with the same purchase.

Product and Records destinations are explicitly labelled placeholders. Native dialog supplies keyboard focus containment and Escape. Customer and assistive-technology testing remain outstanding.

No Worker configuration, production build or database is added. Connection requires reviewed account-session/handoff authority, deployed topology verification and real inventory. Client-side checks are navigation examples, never security controls. Existing Access chooser and product entry remain unchanged. UI fixture interpolation is safe only for these fixed fixtures; real service data requires safe rendering and validation.
