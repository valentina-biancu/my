# NAV-009 — App-to-app and package boundaries

**Status:** Accepted
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §6, §7, §11
**Related:** NAV-002 (topology) · NAV-003 (contracts) · NAV-007 (enforcement) · NAV-011 (versioning)

---

## Context

Four apps in one repository make cross-app imports the path of least resistance. The boundary rules decide whether the monorepo stays a container or becomes a coupling engine. Packages, likewise, must stay single-role or they accrete into a "common" dump.

## Decision

### App-to-app boundaries

- Cross-app links are **navigation or contextual previews** — never shared record writes.
- **No app imports another app's source.** Enforced by `dependency-cruiser` (NAV-007).
- Clarify and Navigate do not inherit Prevent's record semantics.
- Four current apps (shell, clarify, navigate, prevent); recognise and protect arrive when their product work begins.

### Never ship a combined bundle

**A Clarify customer's browser must not download Prevent's application code just because they share a source repo.** Share at source level (`packages/*`), never at bundle level. Each product's deployed JS is its own. This is a hard rule, not a preference.

### Package roster — single role each

| Package | Role | Starts |
|---|---|---|
| `contracts` | Product-side layer over `@heartfirst/*` published types; content schemas, fixtures, wrappers. No I/O. | populated |
| `design-tokens` | Semantic CSS variables, light/dark, theme init, print styles. **No React components.** | populated |
| `test-support` | Fixture builders, boundary doubles (including failure cases), clock/ID injection, assertion helpers ("no record created by browsing", "revision unchanged", "no cross-subject leak"). Test-only; excluded from bundles by build config. | populated |
| `content-pipeline` | Front-matter validation, status enforcement, release filtering, manifest emission. Per-product schema. | populated |
| `config-{eslint,ts,vitest}` | One per tool category. | populated |
| `ui` | Shared primitives only (`WorksheetLayout` when extracted). **No page layouts, no product forms, no form engine, no card-and-button kit.** | **empty** |
| `access-client` | Thin typed helper — session bootstrap, CSRF bootstrap, allow-listed deep-link return, typed session error states. | **empty** |

**`ui` and `access-client` start empty** and are populated only when a primitive has **two confirmed consumers** (Rule of Three). `apps/shell` is expected to trigger the `access-client` extraction before Clarify — that is the rule being honoured, not a deviation. **No `packages/handoff`:** Access `createProductWorker` already owns the ticket flow, per-product cookie, session and logout.

### Contract change evidence

A change to `packages/contracts` — or a bump of `@heartfirst/contracts` — **must cite the authorizing Records/Access evidence or gate document** in its commit or PR. This operationalizes "shared change control" rather than leaving it as a phrase: the change is merged on a reference, not on an argument. What counts as breaking, and the deprecation window a bump must respect, are defined in **NAV-011**.

### Ownership

| Area | Owner |
|---|---|
| `apps/shell` | Platform |
| `apps/clarify`, `apps/navigate`, `apps/prevent` | Respective product teams |
| `packages/contracts` | Platform + Records owners (for consumed types); shared change control |
| `packages/design-tokens` | Design/platform |
| `packages/test-support` | Platform/QA |
| `packages/content-pipeline` | Platform + content owners |
| `sites/` | Design/platform |
| `content/shell` | Platform |
| `content/{clarify,navigate,prevent}` | Respective product + content reviewers |
| `review/` | Prevent content owner |

## Consequences

- Reuse is deliberate and evidence-backed: nothing is extracted on speculation, and nothing shared at bundle level.
- A contract change with no cited evidence fails review — the check is procedural and visible.
- Combined-bundle leakage is structurally impossible: each app builds from its own workspace root.

## Revisit trigger

- A third consumer duplicates the same primitive → extract it (that is the Rule of Three working, not a deviation).
- A package accreting a second role → split it or refuse the addition; "common" and "misc" remain refused names (NAV-002).
