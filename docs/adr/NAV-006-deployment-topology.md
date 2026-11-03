# NAV-006 — Deployment topology

**Status:** Accepted (asset-guard scope decided; see §Static assets and `run_worker_first`)
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §5, §10.3, §10.7, §10.8
**Related:** NAV-001 (tooling) · NAV-002 (topology) · NAV-008 (shell route list) · Watch-Path-Matrix.md

---

## Context

Five independently deployed Workers share one repository and contract types. Cloudflare Workers Builds defaults to building **every** Worker on **every** commit. Deployment must be shaped so that a change to one product cannot rebuild, redeploy or break another — and so a rollback cannot produce wire-format skew.

## Decision

### Root directory per Worker

Each app deploys its own Worker with its own `wrangler.jsonc` at the app root. Workers Builds connects the same repository to each Worker and sets the root directory.

```
apps/shell/wrangler.jsonc        root: apps/shell
apps/clarify/wrangler.jsonc      root: apps/clarify
apps/navigate/wrangler.jsonc     root: apps/navigate
apps/prevent/wrangler.jsonc      root: apps/prevent
```

Each app uses the **Cloudflare Vite plugin's single-project layout** — one `wrangler.jsonc`, one `package.json`, SPA and Worker built together. This must be verified against the guard-before-assets requirement in Phase 0–1; if it does not fit, that is the **one legitimate argument** for splitting web and worker workspaces, and this ADR should be amended with the reason.

### Build watch paths

Workers Builds defaults to includes `[*]` and excludes `[]` — every commit builds every Worker unless configured otherwise. Configure per Worker; see **Watch-Path-Matrix.md** for the full matrix.

Two layers of filtering:

1. **Watch paths** decide whether a build *starts*.
2. **Turborepo filtering** decides which tasks *run inside* a build.

**Excludes are evaluated before includes.** Whether large pushes bypass path filtering must be verified against current Cloudflare watch-paths documentation before the number is encoded anywhere permanent. **Zero-file-change pushes trigger no build** — path matching is bypassed; do not treat it as a bug. If path filtering *is* bypassed on a large push, a large merge may redeploy every Worker — the A1 gate (below) keeps full-run protection intact when it happens; plan release timing (bulk history moves, vendor drops) accordingly.

### Environments vs Previews

- **Wrangler environments** for persistent Workers (e.g. `staging`, `production`).
- **Previews** for per-branch / per-PR URLs.

Which persistent environments exist, and whether per-PR Previews are enabled, is proposal §14 Q5 — a pre-scaffold decision recorded when made, not discovered during setup.

### Service bindings are non-inheritable

Bindings must be redeclared in every named environment. A binding to `<worker-name>` in environment `staging` uses `service: "<name>-staging"`.

- **Naming convention:** `<app>-worker-<env>` — e.g. `prevent-worker-staging`, `access-worker-staging`.
- Every new environment requires explicit binding declarations in every dependent Worker.
- A missing binding fails at **request time**, not deploy time — unless asserted at startup. Each Worker carries a **startup binding assertion** (fail-fast at boot).

### Static assets and `run_worker_first`

By default, **a matching static asset is served without invoking the Worker at all** — `assets.not_found_handling = "single-page-application"` only covers the *no-match* case. The session guard is therefore not default behaviour: it must be configured explicitly via **`run_worker_first`**, the list of routes that must reach the Worker before static asset matching. Without this, guarded HTML would bypass the Worker silently — at deployment, with tests passing.

**Guard scope (decided, at route granularity):**

- **Guarded HTML routes** (pages requiring a session) are listed in `run_worker_first` and checked by the Worker.
- **JS/CSS assets** pass through to static serving without the Worker — no health data in them.
- **Data routes** are always guarded — they are Worker routes by construction, never assets.

Because the shell serves both public routes (catalog) and guarded routes (account, entitlement state), the guard is a **route list, not a boolean** — enumerated before the shell is built and recorded as Appendix A of NAV-008.

**Verification item:** the current `run_worker_first` syntax and route-array support are verified against current Cloudflare documentation during Phase 0–1, before the first SPA ships (decision sheet, *What deliberately remains open*).

### Deploy trigger model

**Workers Builds is the deploy trigger. `turbo deploy` is manual/emergency recovery only.**

Watch paths and root directories are designed for Workers Builds; two pipelines invite double deploys, races, and drift between what CI tested and what deployed. The emergency path lives in the runbook (`docs/phase-0/worker-adoption-runbook.md` §7), with its break-glass token custody: a Cloudflare API token held outside CI — not in repository secrets, not in CI variables.

- **Tests gate the deploy (A1: unfiltered at deploy time, filtered on PRs).** PRs run affected-only (`turbo run typecheck lint test build --filter='...[origin/main]'`); the deploy pipeline runs the **full unfiltered suite** — `turbo run typecheck test build` with no filter. **Unfiltered means all packages, not just this Worker's dependency subgraph**: a Prevent deploy runs Clarify's tests too. That is the deliberate conservative choice — a wrong-but-green filtered deploy costs more than a slow one — and it is a real per-deploy cost that grows with each app. Recorded here so it is not mistaken for an oversight when deploys start feeling slow.
- **Cloudflare API tokens live in Workers Builds configuration** — not in CI, not in `.env`. CI does not deploy; it does not need deployment tokens.
- **A2 (tag/release promotion) was considered and refused.** It inserts a promotion step between a green run and a deploy — a window in which `main` can move — and a second mechanism to maintain. If A2 ever replaces A1, this section and Watch-Path-Matrix.md are rewritten together, and the replacing ADR names the trigger.

### Rollback compatibility

Five independently deployed Workers sharing contract types mean a rolled-back Worker can speak an older wire format than its peers.

**Rule:** contract changes are backward-compatible within a deploy window, using **expand → migrate → contract**:

1. **Expand** — add the new field/operation; old and new clients both work.
2. **Migrate** — all consumers use the new shape; old shape still supported.
3. **Contract** — remove the old shape after the deploy window.

The rollback runbook states the **compatibility floor per Worker** — at deploy time, not discovered during an incident.

## Consequences

- A commit under `apps/prevent/**` builds and deploys only the Prevent Worker; `packages/**` builds all Workers; `docs/**` builds none.
- Binding mistakes surface at boot or in CI, not in a user's request.
- The route-list asset guard keeps health data behind auth while avoiding pointless 401s on static assets.

## Revisit triggers

- Cloudflare changes watch-path semantics (large-push bypass) → re-verify, update Watch-Path-Matrix.md.
- The single-project Vite layout conflicts with guard-before-assets → amend this ADR with the split rationale.
