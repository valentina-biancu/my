# NAV-010 — Static estate (`sites/`)

**Status:** Accepted
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §9.5
**Related:** NAV-002 (topology) · NAV-005 (content gating) · NAV-009 (ownership)

---

## Context

A third of the visible surface is not a Worker at all: the sales funnel, thank-you pages, Risk Atlas and free briefing live on Systeme.io. Recurring bugs there — footer contrast, theme defaults, missing label toggles — are exactly the drift that `packages/design-tokens` would prevent, **if** there is a build step that produces paste-ready blocks from the tokens.

## Decision

**The monorepo carries a `sites/` tree that compiles design tokens into paste-ready Systeme.io blocks.**

```
sites/
├── systeme/
│   ├── header.html
│   ├── footer.html
│   └── body-blocks/
└── package.json
```

- Source of truth for colors, spacing and type is `packages/design-tokens` — the same semantic CSS variables the product apps consume.
- The build emits **paste-ready HTML blocks** sized for Systeme.io's editor constraints — no runtime, no framework output.
- This is a **parallel small workstream, not Phase 0.** Without it, the monorepo reads as serving only the Workers while a third of the visible surface drifts.
- **First-surfaces inventory, decided before the pipeline starts.** Surfaces are ranked by *recurrence of drift, not ease of rendering* — the ones the recurring bugs touch most often come first. The inventory is decided **before pipeline work starts**; the pipeline's shape (block granularity, token subset) may depend on which surfaces it must serve. The chosen inventory is recorded in this ADR when made.
- **Every generated block carries a provenance marker** — a comment naming its source version — so a block pasted into Systeme.io is identifiable as generated and re-generatable, not hand-edited drift. A block that has been hand-edited in Systeme.io is stale by definition; the marker makes that visible instead of latent.
- **Deployment is a human pasting blocks into Systeme.io.** The runbook is a paste checklist: regenerate, diff, paste, note the marker version. CI runs lint and typecheck on `sites/` changes like anywhere else — no `wrangler deploy --dry-run`, no bundle-size check, because nothing deploys.
- A variable needed by a static block is a **token**, proposed through design-tokens' ownership — `sites/` consumes tokens, it never extends them with static-only one-offs.

## Recognise as possibly static

Recognise may be static content plus a local-only interactive layer, with no authenticated Worker. **Do not assume `apps/recognise` without checking** when that product work begins (NAV-008).

## Consequences

- Static-surface fixes become commits with review and history, not manual re-pastes from memory.
- The design system gains a second enforcement point: tokens used by Workers and tokens used by sales pages cannot diverge silently.
- Scope stays honest — `sites/` does not become a second CMS; it emits blocks, Systeme.io remains the host.

## Revisit trigger

- If Systeme.io block constraints cannot be met from tokens alone (editor-specific quirks), record the quirk and the workaround in this ADR rather than abandoning the pipeline.
- If a static surface needs interactivity beyond paste-ready blocks, that is a new decision, not an extension of `sites/`.
