# Phase 0 — Skeleton and Prevent adoption proof

**Status:** Active checklist
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §12 (Phase 0)
**Related:** NAV-001…NAV-011 · Watch-Path-Matrix.md

---

**Restoration note (2 November 2026):** the original repository history
was lost to a workspace rollback on the development platform; the tree was
restored the same day from the archived scaffold zip, the Prevent field
zip (v0.1.0, md5 31176f82…), and the session record — and re-verified
green (turbo gates, dev boot, wrangler dry-run). See the Worker Adoption
Runbook status paragraph for the event record.

Phase 0 proves the monorepo skeleton with the **existing Prevent Worker, unchanged** — no SPA yet, no product work. It is deliberately smaller and stronger than earlier drafts: the Worker already exists and is deployed.

## Build the skeleton

- [x] Workspace, Turborepo, TypeScript project references
- [x] ESLint boundaries + `dependency-cruiser` rules (NAV-007)
- [x] Node 24 + `engines.npm` floor, `engine-strict=true`, root `overrides` — no `packageManager` pin (NAV-001)
- [x] `CODEOWNERS` matching the ownership table (NAV-009)
- [x] `packages/contracts` — 0.x unstable; **provably local content only at Phase 0** (`SHELL_VERSION`, content front-matter schemas, descriptive session types pinned to the deployed Access version with provenance, deliberately empty entitlement stub); **no local copies of Records-owned `SR-*` types or error codes** — those arrive from `@heartfirst/contracts` at Phase 1+, when Q2 publishes it (NAV-003); subpath exports (`@my/contracts/types`, `@my/contracts/runtime`)
- [x] `packages/test-support`, `packages/design-tokens`, `packages/content-pipeline`
- [x] `packages/ui` and `packages/access-client` stay **empty**
- [x] All ADRs accepted: NAV-001 through NAV-011 (NAV-004's Clarify Records posture endorsed on review, 2 November 2026)

## The Prevent adoption proof

- [x] Move the existing Prevent Worker into `apps/prevent/` **unchanged** — no SPA, no product work (restored `953837c`; the named follow-ups are folded in there)
- [x] Replace the bun lockfile with the root npm lockfile; adjust build scripts if needed (NAV-001 — moot: the field source was already npm-based; its sub-lockfile was not imported)
- [x] Add **one import from `@my/contracts`** — the `SHELL_VERSION` constant — flowing into a response header (`X-Shell-Version`, verified on the built artifact and in the wrangler dry-run bundle)
- [ ] Deploy via Workers Builds to `prevent-staging.shyntesy.com` — the existing Access staging binding is already wired
- [ ] **Deploy-source cutover (NAV-002 §Adoption, not migration):** tag and freeze the pre-adoption Prevent source (`pre-monorepo/prevent`) the same day; repoint its Workers Builds connection to `apps/prevent` (the original tag was lost with the history; the frozen pre-adoption source is the field zip v0.1.0, md5 31176f82…)

## Done when

1. The existing Prevent Worker builds from `apps/prevent/` and deploys to staging — via the repointed connection, with the pre-adoption source tagged and frozen: **one deploy source, not two.**
2. The deployed response contains the constant imported from `@my/contracts` — workspace resolution works from a subdirectory root.
3. **Bumping the constant, pushing, and observing the deployed response change** — a contract change reaches its consumer.
4. Watch-path exclusion is proven **without a placeholder app**: a docs-only commit builds nothing; the `SHELL_VERSION` bump builds Prevent only. The two-Worker exclusion proof (a Clarify change does not build Prevent) lands at Phase 2d, when Clarify's connection exists — no temporary `apps/navigate/` fixture (amendment to v0.5 §12, restored 2 November 2026).

## Not done when

Only the pipeline is proven. The contract constant in deployed output is not ceremony; **it is the point.**

## Notes

- **No new Access work required.** The existing Prevent staging Worker already has DNS, Access origin registration, and a named binding configured — the adoption re-uses it.
- Next: Phase 1 converts Prevent's HTML response to SPA asset serving with parity gates (CSP preserved, `X-Robots-Tag: noindex` preserved, handoff flow re-tested, no new external requests).
