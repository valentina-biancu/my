# NAV-004 — WorksheetLayout before any form engine

**Status:** Accepted
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §8
**Related:** NAV-009 (package boundaries, `packages/ui`)

---

## Context

Products share a page pattern around their worksheets. The temptation is to generalise that pattern into a schema-driven form engine. The W05 review established that the meaning of these pages is carried by lifecycle and authority, not by field definitions — and that flattening it would be a semantic regression, not a reuse win.

## Decision

**Share the page pattern as a component — `WorksheetLayout` — and explicitly refuse a form engine until a decision gate is met.**

### What is shared: a page pattern

> introduction and summary → "read more" accordion → worksheet

That structure is genuinely shared. It is not a field schema, and it does not justify a form engine.

### `WorksheetLayout`

A component with slots for intro, read-more accordions, worksheet body and actions.

**It owns:** heading hierarchy, summary placement, accordion behaviour and accessibility, spacing, print styles.

**It does not own:** field definitions, validation, conditional visibility, submission semantics, or the meaning of Unknown vs absent vs To discuss.

Each worksheet body remains a specific component.

### Why not a schema-driven engine yet

A form engine is reasonable when form behaviour is genuinely field-level. It becomes poor when meaning is carried by lifecycle and authority:

- **Unknown, absent and To discuss are three states, not one.**
- **Saved, reported sent, received and agreed are four independent operations.**
- **One Action identity must survive across home, Results and programme.**
- **Family outreach must not appear as a Briefing candidate by default.**
- **Unit-dependent comparison depends on *missing* information.**

A configuration language expressive enough to encode these becomes a small programming language; one that cannot encode them flattens the semantics the W05 review established.

## Decision gate for revisiting

Revisit only if **all** of the following hold:

1. Three worksheets share the same *field-level* behaviour.
2. The shared behaviour includes conditional visibility or derived values currently duplicated.
3. The semantics can be expressed in configuration without product-specific escape hatches.
4. The engine can be tested through the same contract fixtures as hand-built forms.
5. The engine's accessibility and error behaviour matches the hand-built baseline.

## Clarify's Records posture (Q12)

**Decision: Clarify takes no Records dependency at adoption.**

Clarify's five stages are educational and preparatory — gathering what is known, surfacing gaps, preparing the health-team conversation, recording decisions and next actions. None of it reads or writes Records; at adoption (Phase 2d) `apps/clarify` talks to Access for session and nothing else.

This is stated explicitly rather than accepted by default, because the claim is strong: Clarify is one of the three main products, and its flow reads as potentially wanting access to prior results in later worksheets. The escape hatch is standing:

**Escape hatch:** a specified feature requiring a Record — for Clarify or Navigate — reopens this posture as its own decision, with the Records boundary rules (NAV-003) applied from the first field.

**Endorsed (user, on review, 2 November 2026):** *"Clarify at Phase 2d takes no Records dependency; this is the default and the escape hatch — a specified feature requiring a Record — stands."* Recorded with the expectation stated openly, so it is honest rather than optimistic:

- **Phase 2d Clarify is self-contained** — shell-adjacent but Records-isolated. It does not demonstrate the cross-product-semantics value that justified the monorepo; that value comes from Prevent + Navigate, and from Clarify–Records integration if and when a specified feature requires it.
- **"What you know" is narrative, not records.** A customer saying "I have an Lp(a) result" is a knowledge claim in Clarify's worksheet session state — not a Records entry, and not populated from Records. Recording the actual value is Prevent or Navigate work.

## The adjacent worksheet decisions (Q9–Q11)

Decided alongside the layout, revisitable per trigger:

- **Q9 — field shapes are captured per worksheet, as built**, recorded in a per-product appendix to this ADR as each worksheet ships. `WorksheetLayout` needs none of them — that is the point of the ownership boundary. What gates Phase 2d is the *pattern* being shared, not shapes pre-declared.
- **Q10 — conditional visibility is worksheet-owned, not layout-owned.** A worksheet implements its own conditional logic in its component. A conditional pattern appearing in two worksheets becomes a candidate `packages/ui` primitive under the standard extraction rule (NAV-009) — never a layout feature. The engine decision gate above is the only path to schema-level conditionals.
- **Q11 — "read more" content is per-worksheet**, from `content/<product>/` under that product's schema (NAV-005). Shared guidance would require a cross-product content schema and a shared editorial surface — premature before two products have worksheets at all. Genuinely shared guidance (the same explainer wanted by two content owners) is proposed as shared content with its own review path, never assumed.

## Consequences

- `WorksheetLayout` lives in `packages/ui` only once a second confirmed consumer exists (Rule of Three — Clarify's second worksheet sharing the pattern with Prevent's is the expected trigger).
- Copying a labelled field a third time will feel like a DRY violation; extracting too early is worse, because it forces Clarify and Prevent to share constraints their workflows do not share. The README names this cost explicitly.
- No page layouts, no product-specific forms, no "card and button kit" for visual consistency alone — `packages/ui` anti-purpose (NAV-009).
