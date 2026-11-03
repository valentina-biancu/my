# Watch-Path Matrix

**Status:** Active — verify against current Cloudflare documentation before encoding numbers
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §5, §10.4
**Related:** NAV-006 (deployment topology)

---

Workers Builds defaults to includes `[*]` and excludes `[]` — **every commit builds every Worker unless configured otherwise.** This matrix is the per-Worker configuration for the `my` monorepo.

## The matrix

| Change path | Builds |
|---|---|
| `apps/<app>/**` | that app's Worker only |
| `content/<app>/**` | that app's Worker only |
| `packages/**` | **all** Workers |
| `sites/**` | none (or CI-only) |
| `tests/**`, `docs/**`, `review/**` | none |

Paths matching no include list build nothing: `sites/**`, `tests/**`, `docs/**`, `review/**`, root files. The `sites/` static-estate workstream (NAV-010) has no Worker; its output is paste-ready blocks, not a deployable.

## Why `packages/**` builds every Worker

A shared-package change must reach every consumer's build. This is the accepted cost of source-level sharing: the same change arrives everywhere, is tested everywhere, and deploys per Worker. **If a package change should not build a Worker, that is a signal the package is not actually shared — revisit the extraction (Rule of Three, NAV-009), not the matrix.**

## Operational notes

- **Zero-file-change pushes trigger no build** — path matching is bypassed. Do not treat it as a bug.
- The current matrix uses **no excludes**; if one is added (for example, excluding `**/*.md` within an app), re-verify the whole row.

## Two layers of filtering

1. **Watch paths decide whether a build starts.** Configured per Worker in Workers Builds against the repository root.
2. **Turborepo filtering decides which tasks run inside a build.** The Workers Builds step runs `turbo run test build --filter=...`, so tests gate every deploy that starts.

A path that starts no build costs nothing; a path that starts a build runs the full affected task graph for that Worker.

## Evaluation order caveat

**Excludes are evaluated before includes.** Whether large pushes bypass path filtering must be verified against the current Cloudflare watch-paths documentation before any number or threshold is encoded in an ADR — plan release timing (bulk history moves, vendor drops) accordingly.

## Config sketch (per Worker)

| Worker | Root directory | Includes | Excludes |
|---|---|---|---|
| `apps/shell` | `apps/shell` | `apps/shell/**`, `content/shell/**`, `packages/**` | — |
| `apps/clarify` | `apps/clarify` | `apps/clarify/**`, `content/clarify/**`, `packages/**` | — |
| `apps/navigate` | `apps/navigate` | `apps/navigate/**`, `content/navigate/**`, `packages/**` | — |
| `apps/prevent` | `apps/prevent` | `apps/prevent/**`, `content/prevent/**`, `packages/**` | — |

Phase 0 closes criterion 4 with this matrix: a docs-only commit builds nothing; a `packages/contracts` change builds Prevent only. The two-Worker exclusion proof (a Clarify change does not build Prevent) lands at Phase 2d, when Clarify's Workers Builds connection exists — **no placeholder app** (Phase 0 Checklist, amended relative to v0.5 §12).

## Verification checklist

- [ ] Confirm excludes-before-includes semantics against current Cloudflare docs
- [ ] Confirm large-push behaviour (does a >N-file push bypass path filters? v0.5 records 3000+ files / 20+ commits as *unverified*)
- [ ] Wire one Worker (prevent, per Phase 0) and observe one filtered and one unfiltered commit
- [ ] Record any Cloudflare-side changes here — this file is the living matrix, NAV-006 is the decision
