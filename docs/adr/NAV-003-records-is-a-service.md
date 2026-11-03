# NAV-003 — Records is a service, not a package

**Status:** Accepted
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §6 (Records boundary), §7 (contracts)
**Related:** NAV-002 (topology) · NAV-009 (package boundaries) · NAV-011 (versioning)

---

## Context

Three things are often conflated: unifying health-record storage, migrating its storage engine, and sharing a database client across Workers. Only the first already exists — as the **Records** service. The monorepo must consume Records' contracts without bypassing its authority model.

## Decision

**Records remains an independent service. The monorepo consumes its published contracts; it never talks to its database.**

| Thing | Status | Consequence |
|---|---|---|
| **Unification** — one authoritative store | Already exists: Records | Nothing to build |
| **Migration** — replacing `pg` with D1/R2 | **Not proposed** | Separate workstream |
| **Shared DB client** — a package every Worker imports to talk to the database | **Refused** | Bypasses identity mapping, per-record authority, origin/CSRF |

**Boundary in one sentence:** *packages may contain API clients that talk to the Records HTTP boundary, but no package may contain a PostgreSQL/pg client or execute SQL.*

## Contracts consumption

Authoritative types live upstream and are consumed, never copied:

- **From Records** — pinned dependency on `@heartfirst/contracts`: permission matrix, `SR-*` types, error codes, permission evaluator surfaces.
- **From Access** — pinned dependency (or via `access-client`, once extracted): session shape, CSRF interface, deep-link return contract.

**Scope universe — two scopes, no others.** `@my/*` is this workspace; `@heartfirst/*` is upstream, regardless of which service publishes. Records' `@heartfirst/contracts` is the first instance; Access's package, when `access-client` is extracted, is `@heartfirst/access-client` — not `@access/*`, not `@heartfirst-access/*`. A third scope is a naming-boundary change requiring an amendment to this ADR, not a convenience. Until Access publishes, its shapes stay descriptive pins (below), never re-scoped locally.

The monorepo's `packages/contracts` adds only the **product-side layer**:

- Content front-matter schemas (per product)
- Catalog shapes for the shell
- Product-side view wrappers (e.g. a `ProductCatalogView` combining entitlement state and content reference)
- Synthetic fixtures built on the consumed types
- Assertion helpers

Two pinned conventions from the first commit:

1. **Session-shape types are pinned to the currently deployed Access version, with a comment saying so** — the deprecation path stays visible instead of latent.
2. **`SHELL_VERSION` is exported as the Phase 0 adoption-proof constant** — a value imported from `@my/contracts` that flows into a deployed response header, proving workspace resolution from a subdirectory root (see the Phase 0 Checklist).

### Descriptive vs authoritative — the sharper line

Two kinds of type live in `packages/contracts`, with different rules:

| Kind | Examples | Rule |
|---|---|---|
| **Authoritative** | permission matrix, `SR-*` codes, error codes, permission evaluator surfaces | **Consumed from Records/Access as pinned dependencies — never re-declared locally.** Two sources of truth for security-relevant surfaces is a security bug, not a maintenance problem. |
| **Descriptive** | session shape as observed on the wire, catalog shapes, content schemas, view wrappers | **Authored locally, with provenance** — each records the upstream version and observation it was validated against, and is kept honest by drift control (below). |

The local package contains types describing an observed wire format, plus product-side schemas — never a second copy of an authoritative surface. *(This split also corrects the original Phase 0 list, which authored Records-owned error-code enums locally — exactly the two-sources-of-truth defect this ADR exists to prevent. The checklist now consumes them from `@heartfirst/contracts`.)*

### Drift control (descriptive types)

Descriptive types describe an observed format, and observation can go stale. A **scheduled test** validates a live (staged) response against the local schema — session shape from Access, record envelope from Records. From Phase 2b, cross-app journey tests join it. Drift found this way is either a defect in the *description* (fixed by re-observation and a version bump per NAV-011) or an unannounced upstream change — which is a defect *upstream*, reported with the failing observation, never absorbed by loosening the schema. **A descriptive type with no runtime check is a defect, not a convenience.**

**Anti-purpose (restated):** never a duplicate of an authoritative surface — the permission matrix and `SR-*` types are consumed, not copied.

**Structure:** `src/types/` (pure TypeScript, zero runtime) and `src/runtime/` (Zod schemas, validators). Subpath exports `@my/contracts/types` and `@my/contracts/runtime` — one package, two entrypoints, so a Worker that imports a type never pulls in a validation library.

**Version:** 0.x unstable until frozen. The README states the freezing policy; the semver rules both sides follow — including what ends 0.x — are defined in **NAV-011**.

## Consequences

- Every record read or write in a product app crosses the Records HTTP boundary with identity, authority and CSRF intact — the properties the Records review established — **via Access-forwarded operations**: the service binding to Access (`createProductWorker`) is the only runtime path; nothing in this repository talks to Records directly.
- `packages/contracts` has no I/O; it cannot grow a database client by accident (lint-enforced — NAV-007).
- Contract drift from Records is detected by consumer-driven tests, and contract changes must cite authorizing Records/Access evidence (NAV-009).

## Revisit trigger

None anticipated. A shared DB client is refused on security grounds, not convenience; overturning it requires overturning the Records authority model — a Records-side ADR (`REC-*`), not this one.
