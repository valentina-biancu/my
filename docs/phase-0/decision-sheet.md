# `my` — Phase 0 Pre-Work Decision Sheet

**Companion to the Phase 0 Checklist.** All five pre-work decisions, each with a recommendation and the slot you fill. Phase 0 starts when all five rows are decided — not before. Answers marked ✅ are already recorded in an ADR; confirming them here closes the loop.

| # | Decision | Recommendation | Status |
|---|---|---|---|
| 1 | Repository | Private `my` under `shyntesy`, `main`, protected — name decided (NAV-008, Rename record) | **Org slot open** — fill §1 |
| 2 | Toolchain pins | Node 24 pin; no `packageManager` pin (NAV-001, amended on review) | Recommended — verify §2 |
| 3 | `packages/contracts` v0.1 | Provably local contents (already specced) | ✅ NAV-003, Contracts consumption |
| 4 | ADRs 001–011 | Accept as drafted, or amend per ADR | **You decide** — §3 |
| 5 | Deploy gating | A1 — gate inside the deploy pipeline | ✅ NAV-006, Deploy trigger model |

## 1. Repository (the only decision only you can make)

Fill these five slots:

- **Org / account:** `______`
- **Repository name:** `my` — **decided** (renamed from `navigator`; see NAV-008, Rename record — sidesteps the `navigator`/`navigate` collision and matches the `my.shyntesy.com` top-level surface)
- **Visibility:** **private** (recommended — health-adjacent product family; nothing here needs public)
- **Default branch:** `main`
- **Branch protection:** require PR before merge to `main`, ≥1 approval, required status checks from the CI workflow (NAV-007) — enable the day CI first runs green, not "later"
- **CI provider:** GitHub Actions (recommended — the scaffold's workflow file assumes it; if another provider is chosen, the workflow is ported, the pipeline steps are unchanged)

**CI secrets scope (hard rule, from the Checklist):** no deployment tokens in CI — Workers Builds owns deploys; no Access secrets (Stripe, Resend, peppers) anywhere in the monorepo, not even in CI variables. NAV-007, Security and secret hygiene.

## 2. Toolchain pins

Recorded in NAV-001 (Disciplines); the verification item is the Workers Builds image:

- `.nvmrc` → `24` — the pin; `engines.node: ">=24"` and `engines.npm: ">=11"` — the floors
- **No `packageManager` pin** — dropped on review, 2 November 2026 (NAV-001 amendment): the Node pin determines the npm version; a Corepack pin would be a moving part with no benefit
- **Verification before relying on it:** confirm the Workers Builds image honours `.nvmrc` (Node 24), and record observed versions in NAV-001's status line. Node 24 bundles npm 11 — if the image ignores `.nvmrc`, the pins are incoherent and Phase 0 says so rather than hoping.
- No second lockfile anywhere: `bun.lock` / `bun.lockb` removal is per-Worker adoption work (Worker Adoption Runbook §3).

## 3. ADR acceptance

NAV-001 through NAV-011 are drafted and Accepted; NAV-004's Clarify Records posture was endorsed on review, 2 November 2026. The decision that remains yours:

- **Accept the set as drafted** (recommended — every open question carries a recorded decision with a revisit trigger; amending later is a status-line change, not a rewrite), or
- **Name the amendments** — an ADR amended before acceptance records the amendment in its status line, keeping the set honest.

## 4. Access checkpoint (Proposal §14 Q1)

The stable Access state the Phase 0 Prevent adoption runs against:

- **Access deployed version / commit observed:** `______`
- Recorded in the adoption commit message; the Prevent staging binding, DNS and origin registration are reused as-is (Checklist, Notes — no new Access work).

## 5. What deliberately remains open

- **Q2 — how `@heartfirst/contracts` is published from Records.** Gates Phase 1+, not Phase 0 (NAV-003, Contracts consumption).
- **Q16 — `sites/` first surfaces.** Gates the NAV-010 workstream, not Phase 0.
- **NAV-006 verification items** — watch-path large-push behaviour (Build watch paths) and `run_worker_first` syntax (Static assets and run_worker_first), verified against current Cloudflare documentation during Phase 0–1, before the first SPA ships.
