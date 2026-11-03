# NAV-011 — Contract versioning policy

**Status:** Accepted
**Date:** 2 November 2026
**Source:** Review of NAV-001…NAV-010 — structural gap named in review (proposal §14, Q8)
**Related:** NAV-003 (descriptive vs authoritative; drift control) · NAV-006 (expand → migrate → contract) · NAV-009 (contract change evidence)

---

## Context

Three ADRs carry the pieces around contract versioning: drift control for descriptive types (NAV-003), change evidence (NAV-009), and runtime compatibility via expand → migrate → contract (NAV-006). The versioning policy itself was unstated — what counts as a breaking change, how deprecation windows are measured, what a changelog must contain, and how a breaking change is coordinated between upstream publication (Records, Access) and downstream consumption (this monorepo). The review named the gap rather than leaving it as "we'll handle it when we hit it" — because the moment you hit it is exactly when negotiating a versioning policy is hardest.

## Decision

### Semver, with the wire as the referee

Published contract packages — `@heartfirst/contracts` from Records, and the Access session-shape types — use **semantic versioning** where the referee is the observed wire format, not just the type declarations:

- **MAJOR — breaking.** A shape change an existing consumer cannot tolerate: removed field, narrowed type, changed error-code meaning.
- **MINOR — additive.** New optional fields, new codes, new operations; old consumers keep working.
- **PATCH — correction.** No shape change (docs, comments, type-name-only changes).

A type-level change that is wire-compatible may still be MAJOR for local ergonomics; that is allowed but must be named as such in the changelog.

### What is versioned

| Surface | Owner | Policy |
|---|---|---|
| `@heartfirst/contracts` — permission matrix, `SR-*`, error codes | Records | Semver as published by Records |
| Access session shape, CSRF interface, deep-link contract | Access | Semver; pinned per deployed Access version (NAV-003) |
| `@my/contracts` — descriptive types, content schemas, wrappers | this monorepo | **0.x unstable until frozen**; freezing to 1.0 is itself a decision citing evidence |

### Deprecation window

A deprecated shape is removed only when **every consumer's stated compatibility floor** (NAV-006 rollback runbook) has moved past the version that introduced its replacement. Within the window, the NAV-006 discipline applies:

1. **Expand** — publish the new shape alongside the old (MINOR).
2. **Migrate** — consumers move; old shape still published and tested.
3. **Contract** — remove the old shape (MAJOR), with the changelog recording which floor movement justified closure.

### Changelog discipline

Every published version of an upstream contract package carries a changelog entry stating: what changed, which semver axis, and the authorizing document (Records/Access evidence). A downstream bump in this monorepo cites the changelog entry **and** the authorizing evidence in its PR (NAV-009's rule) — a bare `package.json` bump never lands alone.

### Breaking-change coordination

A MAJOR bump publishes only when:

1. The expand-phase release is already deployed and observed.
2. Consumer-driven fixtures are updated in the same release, or in a release pinned to the same window.
3. Migration notes exist for every consumer pattern we exercise.

Downstream, the consumption bump is one atomic PR: version bump + adapted consumers + updated fixtures.

### Drift and unannounced change

Drift control (NAV-003) validates live responses against descriptive schemas. **An upstream wire change without a version bump is a defect upstream** — reported with the failing observation, never absorbed by loosening the local schema.

## Consequences

- "Breaking" has a definition before the first breaking change, not during it.
- Deprecation windows are measurable against rollback floors already stated in the runbook — no new bookkeeping.
- Changelog citations and fixture sync become routine PR hygiene rather than incident work.

## Revisit triggers

- Records or Access cannot publish semver (continuous deploy without versioning) → the policy degrades to observation-only; record the degradation and lean on drift control until upstream versioning exists.
- The monorepo begins publishing contracts consumed by other repos → extend this ADR with a publication policy before the first external consumer.
