# NAV-005 — Content publication gating

**Status:** Accepted
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §9
**Related:** NAV-002 (topology) · NAV-009 (ownership) · NAV-010 (static estate)

---

## Context

Product content is health-adjacent and editorially controlled. Unreviewed copy reaching production is a clinical-trust risk, not a cosmetic one. Content approval must stay separate from code review, and the pipeline — not a reviewer's memory — must enforce it.

## Decision

**Content lives in `content/` per product, gated by front matter, enforced by `packages/content-pipeline` at build time.**

### Content tree

```
content/
├── shell/          catalog copy — marketing schema
├── clarify/        per-product schema
├── navigate/       per-product schema
└── prevent/        health-guidance schema
```

### Front matter per item

```yaml
id: PF-C26
title: Family communication
status: draft | approved | deferred
provenance: Manual MC9
reviewer: pending
clinical_review: pending
release_eligible: false
```

### Pipeline behaviour

- Validates front matter against the per-product schema.
- **Rejects unknown status values** — a typo cannot silently publish.
- **Excludes non-release-eligible items from production** — release is an explicit state, never a default.
- Emits a content manifest per release: what shipped, at what status, with which reviewers.

Content approval is separate from code review: a content PR can be code-correct and still not release-eligible.

**The publication gate — an item ships in a production build only if all hold:**

1. Front matter parses and matches the product's schema.
2. `status: approved` — not draft, not deferred.
3. `reviewer` — and, where the product's schema is health-guidance, `clinical_review` — is a filled name, not `pending`. Marketing-schema content requires the reviewer only; health-guidance requires both.
4. `release_eligible: true`.
5. The item appears in the release manifest for that deploy.

**The manifest is the inventory of record.** The manifest of the last production deploy is the complete statement of what is live — there is no standing aspirational inventory to maintain — and rollback comparison is manifest-to-manifest, not archaeology.

**The pipeline validates, filters and emits — it does not approve.** An approval workflow living inside the build would make the build the authority: the two-sources-of-truth defect NAV-003 refuses for types, refused here for content. Approval is a named human's `reviewer`/`clinical_review` in front matter; the pipeline verifies the names exist and the states are honest.

### Ownership (`owners.toml`)

Each product's `content/<product>/` carries an `owners.toml` mapping content paths to named owners. **No named owner, no production content** — the pipeline refuses to release content whose path has no owner of record.

The file's schema is **TBD until the first product's `content/` directory is created** — expected fields: path patterns, content owner, clinical reviewer; the pipeline reads it from the product root. Defining it earlier would be designing for zero users.

## W05 carry-forwards (binding on all content)

1. **Completion-language governance.** Five confirmed locations so far (MC10 L548, MC12 L171, SC7 L252, MC10 L566, T5 L298). Working assumption for the remaining files: every "finish", "close", "stabilize", "safe", "protected", "improved" or "prevented" is suspect until read in context.
2. **Minimum-day boundary is a contract constraint.** The product must not suggest a reduced dose or frequency, silently alter a monitoring schedule, or present language implying clinical modification of a prescribed instruction.

**Flags, humans judge.** The word list can flag suspect completion language; it cannot read context. All five confirmed locations were found by reading, and every remaining hit gets the same treatment: flagged for human judgement, never auto-rejected. Auto-rejection would be worse, not safer — it teaches editors to dodge the words instead of fixing the claims. A flagged item cannot reach `status: approved` until the flag is dispositioned — fixed, or justified in review. The word list is versioned pipeline configuration, extended as new suspect words are confirmed. The five confirmed locations are fixed in the source content as Phase 1-adjacent editorial work, before Prevent's content ships.

**Minimum-day enforcement has two halves; both are required.** Where the constraint is mechanically expressible — comparisons against minimum-day references, schedule arithmetic, "you can reduce/stop/skip" phrasing patterns — the pipeline **rejects** the item outright. Where it is not, the `clinical_review` signature on health-guidance content attests the item was checked against the constraint. Both halves are required because this constraint's failures are exactly the ones that look like helpfulness.

## Open item — MC19 activity survival

The 10-week calendar is not compressed into 30 days; sequencing prerequisites are discarded. Activities tied to specific weeks are now untethered. Reconciliation is per-activity: available-when-relevant, or dropped with the calendar — **each drop recorded in the content disposition ledger (`review/`), never silent**. Revisit trigger: a clinical reviewer identifies an activity whose timed sequencing is itself clinically load-bearing — that activity is re-examined, not the whole calendar. W05 follow-up; not a blocker for Phase 0.

## Consequences

- A deploy cannot carry content that the front matter does not justify; the manifest is the audit trail.
- `content/shell` uses a **marketing-catalog schema**, not health-guidance — the shell is the platform, not a fourth product (NAV-008).
- The ownership *mechanism* is decided (`owners.toml`, above); the named owners and clinical reviewers per product remain open (proposal §14, Q14–Q15).

## Revisit trigger

If the front-matter schema cannot express a real editorial state (e.g. region-scoped releases), extend the schema in `packages/content-pipeline` with a fixture per new state — do not bypass the pipeline.
