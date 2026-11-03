# NAV-001 — Package manager: npm workspaces + Turborepo

**Status:** Accepted
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §4
**Related:** NAV-002 (topology) · NAV-006 (deployment) · NAV-007 (disciplines)

---

## Context

The `my` monorepo hosts four Cloudflare Workers (shell, clarify, navigate, prevent) plus shared packages. The existing product Workers were built with **bun**; the monorepo standardises on **npm**. Requirements: one lockfile, atomic cross-package changes, per-app deploys that build only what changed, and CI that proves compatibility before deployment.

## Decision

**npm workspaces + Turborepo.** One workspace per app (`apps/*`), one per package (`packages/*`), plus `tests`.

### Root `package.json` shape

```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*", "tests"],
  "engines": { "node": ">=24", "npm": ">=11" },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint && dependency-cruiser",
    "check:deps": "syncpack lint",
    "affected": "turbo run typecheck test build --filter='...[origin/main]'"
  },
  "overrides": { "/* documented security pins */": "" },
  "devDependencies": {
    "turbo": "<pinned>",
    "syncpack": "<pinned>",
    "dependency-cruiser": "<pinned>"
  }
}
```

### Disciplines

- **Node 24, not 22.** Node 22 reaches EOL April 2027; Node 24 runs to April 2028. Pin `.nvmrc`, `engines.node`, and `engine-strict=true` in `.npmrc` so the pin actually bites. **Verification item:** confirm the Workers Builds image honours `.nvmrc` (Node 24) and record the observed versions in this ADR's status line — do not assert alignment; verify it.
- **No `packageManager` pin.** That field is a Corepack pin: it does nothing unless Corepack is enabled — and enabled, it would enforce npm 10.x on top of a Node 24 that bundles npm 11, a moving part with no benefit. The Node pin determines the npm version; `engines.npm: ">=11"` is the floor. Verify the npm major Node 24 actually bundles before treating the floor as fixed.
- **One workspace per app.** No `apps/<app>/{web,worker}` split. The Cloudflare Vite plugin's single-project layout is the default (NAV-006 records the one legitimate exception).
- **Internal dependencies use `"*"`, not `"workspace:"`.** npm does not support the `workspace:` protocol.
- **One root lockfile; `npm ci` in CI.** No per-app lockfile survives adoption.

**Amendment (review, 2 November 2026):** the original draft carried `packageManager: npm@10.9.2`. Dropped per review — option 1: remove the pin entirely, keep `engines.npm` as a floor only. **Second amendment (2 November 2026, post-restore bring-up re-run):** dropping the pin broke Turborepo — turbo cannot resolve the workspace graph without a package-manager declaration (`devEngines.packageManager` or the legacy `packageManager` field), and the Nov-1 rehearsal had run with the pin still present, so the break went unnoticed. Declared `devEngines.packageManager: { "name": "npm", "version": ">=11 <12" }` — declarative metadata for tooling, not a Corepack pin: no shim enforcement, and the range spans only the npm 11 major that Node 24 bundles (turbo rejects multi-major ranges), bumped together with the Node pin — which this ADR's verification step already mandates. The Node pin still determines the npm version; `engines.npm` remains the only version floor. The first amendment's substance stands.

## Bun migration (per-Worker adoption work)

The product Workers were built with bun; the monorepo uses npm. This is per-Worker adoption work, not automatic:

1. Remove the per-Worker `bun.lock` / `bun.lockb` — the root `package-lock.json` becomes the only lockfile.
2. If `package.json` scripts use `bun build` / `bun run`, change them to `wrangler` / `vite` equivalents. If they already use wrangler, no change.
3. Verify with `grep -l "bun" apps/*/package.json` **before** claiming "bun doesn't affect the monorepo."

Expectation: bun was likely only the package manager, and scripts likely already use wrangler — but verify rather than assume.

## Consequences

- A single lockfile; npm hoisting is managed, and phantom dependencies are blocked by `import/no-extraneous-dependencies` in CI (NAV-007).
- Turborepo provides affected-only task execution; Workers Builds watch paths (NAV-006) decide whether a build starts at all.
- Version drift across workspaces is surfaced by `syncpack lint` in CI (v13 command; the v12 name was `list-mismatches`).

## Revisit trigger

Switching to pnpm requires a recorded trigger (for example, a hoisting failure npm cannot express) and a **new ADR** documenting the migration path (`rm -rf node_modules package-lock.json && pnpm import && pnpm install`). Do not revisit on aesthetics.
