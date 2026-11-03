# NAV-007 — Dependency boundaries and operational disciplines

**Status:** Accepted
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §10.5, §10.6, §11
**Related:** NAV-001 (tooling) · NAV-003 (contracts) · NAV-009 (boundaries)

---

## Context

A monorepo makes wrong dependencies cheap to write and hard to see. Boundaries must be enforced by tools in CI — not by documentation, review vigilance, or good intentions. Operational disciplines (secrets, bindings, bundle size) follow the same rule.

## Decision

### Dependency graph — enforced in lint

```
apps/* → packages/ui → packages/design-tokens
apps/* → packages/contracts → @heartfirst/contracts (from Records)
apps/* → packages/test-support (dev)
packages/* ↛ apps/*
apps/a ↛ apps/b
```

- **`dependency-cruiser`** for architecture rules; **`eslint-plugin-import`** for dependency declaration.
- **`syncpack lint` in CI** (v13 command; the v12 name was `list-mismatches`) — internal version consistency across workspaces (NAV-001). `npm version --workspaces` does not cascade internal dependency bumps; syncpack enforces it.
- **No relative imports across package boundaries** — import by package name, always.
- Package names use the `@my/*` scope and are never bare identifiers that collide with browser globals.
- `import/no-extraneous-dependencies` blocks phantom dependencies under npm hoisting.

### `nodejs_compat` discipline

Shared packages prefer **Web Standard APIs** (`crypto.subtle`, `TextEncoder`) over Node APIs. Workers run on `nodejs_compat`, but compatibility is a floor, not a target.

### Bundle and compatibility checks

- **Bundle size per affected Worker:** `wrangler deploy --dry-run`; fail if the compressed script exceeds a threshold (start at **3 MB**; verify the current platform limit before this number is treated as fixed).
- **`tsc --noEmit` is a separate Turbo task**, not bundled into `build` — type-checking cache invalidates on a different axis than build output.

### Security and secret hygiene

- **Secrets grep from day one**, porting Records' `security.test.mjs` discipline.
- **Binding target verification in CI:** parse every `wrangler.jsonc` and assert service bindings resolve.
- **Startup binding assertion** per Worker: fail-fast on a missing binding at boot (NAV-006).
- **`npm audit --audit-level=critical`**, with root `overrides` rationale documented per pin.
- **Nothing belonging to Access (Stripe, Resend, peppers) appears in the monorepo** — not even in CI variables.

### CI shape and test discipline

- **Required status checks are repo-level, not path-scoped** — GitHub offers no per-path required check. All PRs run the same required checks; stricter review for `packages/*` arrives via CODEOWNERS routing (NAV-009).
- **Every test result states its evidence level** — synthetic, local provider, or deployed integration — from the first test written.
- **Test ownership splits at adoption:** Access's `shared-product-worker.test.mjs` (testing `createProductWorker`) stays in Access; the product's own shell tests move to `apps/<app>/` — split before porting, to avoid a both-need-it problem (Worker Adoption Runbook §8). Playwright journey suites arrive with cross-app journeys (Phase 4).

### ADR namespacing across repos

Records uses `docs/decisions/0001-…`. Prefix per repo: **`NAV-…`** for this monorepo, **`ACC-…`** for Access, **`REC-…`** for Records. Applies in ADR filenames and cross-references. A cross-repository decision is cited by its full identifier — `ACC-001` from a NAV ADR, never bare `001` — so a reference survives a repository move.

### Client non-authoritative rule

**Any permission or entitlement decision rendered in the client must come from the Access response, never from client-side computation or cache.** A feature is visible only when the server says so. This matters most for `apps/shell`, whose whole job is showing state — the temptation to compute it locally is real and wrong.

Enforced four ways:

- **Shape** — session and entitlement types are descriptive pins to the deployed Access version (NAV-003), so no local type surface exists in which to *compute* an entitlement.
- **State** — no app caches entitlement as authority; feature visibility follows the server's truth in the response that rendered it.
- **Review** — "does this compute authority client-side?" is a standing review item for `apps/*` PRs.
- **Test** — `packages/test-support` ships the assertion helpers for the adjacent invariants: "no record created by browsing", "revision unchanged", "no cross-subject leak" (NAV-009).

## Consequences

- Boundary violations are CI failures, not review-time discoveries.
- The client non-authoritative rule keeps entitlement truth in exactly one place: Access.
- Secrets hygiene is inherited from the Records discipline rather than reinvented.
- **Accessibility is a review-checklist item, not its own ADR.** When the first workspace ships, the checklist covers keyboard navigation, focus order and screen-reader semantics; automatable checks run in CI, and `WorksheetLayout` (NAV-004) owns the shared behaviours once extracted.

## Revisit trigger

- A rule that blocks legitimate work twice → the rule is either wrong or the architecture is; write the ADR amendment either way.
- New operational discipline (e.g. SBOM) → extend this ADR rather than spawning unwritten conventions.
