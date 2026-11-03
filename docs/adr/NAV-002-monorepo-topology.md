# NAV-002 — Monorepo topology

**Status:** Accepted
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §1–§3
**Related:** NAV-001 (tooling) · NAV-003 (Records boundary) · NAV-006 (deploy trigger) · NAV-008 (naming) · NAV-009 (boundaries)

---

## Context

Five deployable surfaces (the shell plus three product Workers now, two more later) share contracts, fixtures, tooling and a content pipeline — while two services, **Access** and **Records**, must remain independent authorities. The question is what lives inside one repository and what stays out.

## Decision

**The `my` monorepo contains the product Workers and their shared packages. Access and Records stay outside as independent services.** There is no migration phase: product Workers are adopted one at a time, when their phase begins (Phase 0 adopts prevent — see the Phase 0 Checklist).

### Repository layout

```
my/
├── apps/
│   ├── shell/                   my.shyntesy.com — built new
│   ├── clarify/                 adopt existing Worker, then add SPA
│   ├── navigate/                adopt existing Worker, then add SPA
│   ├── prevent/                 adopt existing Worker, then add SPA
│   │   (recognise/ and protect/ arrive when their product work begins)
├── packages/
│   ├── contracts/               product-side layer over @heartfirst/* published types
│   ├── design-tokens/           semantic CSS variables
│   ├── test-support/            boundary doubles, fixture builders
│   ├── content-pipeline/        front-matter validation, release filtering
│   └── config-{eslint,ts,vitest}/
├── content/
│   ├── shell/  clarify/  navigate/  prevent/
├── sites/                       paste-ready Systeme.io blocks from design-tokens
├── review/                      source dispositions, coverage ledger
├── tests/                       cross-app journey evidence
├── docs/adr/                    NAV-001 through NAV-011
├── turbo.json
├── package.json
├── package-lock.json            one lockfile at root
└── CODEOWNERS
```

`packages/ui` and `packages/access-client` are deferred until two consumers demonstrably exist (Rule of Three — NAV-009).

### Four explicit refusals

1. **No shared database client.** Records stays a service (NAV-003).
2. **No generic form engine.** `WorksheetLayout` first (NAV-004).
3. **No app-to-app imports.** Shared code moves to `packages/` (NAV-009).
4. **No "common" or "misc" package.**

### Adoption, not migration

Workers enter `apps/` by **cutover on their adoption day — never by parallel-running deploy sources.** Per Worker:

1. **Tag and freeze the pre-adoption source** (`pre-monorepo/<app>`). The tag is the parity baseline and the rollback target; the old source goes inert, it is not deleted. The tag is recorded in the adoption commit message.
2. **Repoint that Worker's Workers Builds connection** to the monorepo — root directory `apps/<app>`, watch paths per Watch-Path-Matrix.md. The repoint is the entire cutover: Workers Builds is the deploy trigger (NAV-006, §Deploy trigger model), so a repointed connection is a finished adoption, not a half-state.
3. **One deploy source per Worker, always.** Two live deploy sources for one Worker is a **defect state, not a transition state** — if both can trigger a deploy, it is fixed before any other work on that Worker, not tracked as acceptable drift.

**Parity gates close the adoption:** rendered-DOM equivalence against the frozen tag, CSP parity (no loosened directives), no new external requests, the Access handoff re-tested end-to-end, and `X-Robots-Tag: noindex` preserved. An adoption that cannot pass its gates does not close — the blocker and the phase decision go to a new ADR (see Revisit triggers).

### What this topology does not change

Delivery order. Prevent remains the first product connected to a real implementation; the shell, clarify, navigate, recognise and protect are worked on when their phase begins.

### Scope boundary

Access, Records, Stripe, Systeme.io, entitlement semantics and payment mechanics are separate workstreams. This repository covers the product estate only.

## What a monorepo solves — and what it does not

**It solves:**

- **Contract coherence.** One place to consume `@heartfirst/contracts` from Records and the Access session interface; one place to detect drift.
- **One test universe.** Shared fixtures and boundary doubles.
- **Atomic change.** A contract change and its consumers land in one commit; CI proves compatibility before deployment.
- **Consistent tooling.** One ESLint preset, one TS base config, one Vitest setup.
- **Publication gating.** One content pipeline (NAV-005).
- **Boundary discipline.** Enforced in lint, not in documentation (NAV-007).

**It does not solve:**

- **Product semantics.** Sharing infrastructure does not make products the same.
- **AI cost.** Cost comes from re-deciding semantics, not re-typing markup.
- **The reuse percentage.** Reuse is zero at Phase 0–1; the "48%" is a hypothesis to be measured at Phase 2.

**Honest framing:** the monorepo's value in Phase 0–1 is **discipline** — contracts, fixtures, boundaries, content gating — not reuse.

## Consequences

- One repository to gate, review and roll forward; Access and Records keep their own release cadence and ADR namespaces (NAV-007).
- Adoption is incremental and evidence-driven: each Worker enters `apps/` unchanged first, under the cutover rule (§Adoption, not migration), then gains its SPA in a later phase with the same parity gates.
- The repo name `my` matches the shell host `my.shyntesy.com` and reads as the family above its apps: my clarify, my navigate, my prevent (NAV-008).

## Revisit triggers

- A product Worker that cannot be adopted without breaking its parity gates → record the blocker and the phase decision in a new ADR.
- Two packages that keep changing together → consider merging them, not adding a third.
- Access or Records needing to live inside the monorepo → that is a topology change requiring a new ADR and both services' owners at the table.
