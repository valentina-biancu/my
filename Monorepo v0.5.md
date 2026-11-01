# HeartFirst Navigator — Monorepo Proposal

**Draft v0.5 · 1 November 2026 · Architecture proposal; no implementation, contract or clinical approval**

## Changes in this revision

| Change | Source |
|---|---|
| **Phase 0 adopts the existing Prevent Worker unchanged**, rather than a trivial stand-in. Phase 0 is stronger and smaller than v0.4's version. | Confirmed: Workers already exist, deployed |
| **No migration phase.** Access and Records stay outside; product Workers are adopted one at a time when their phase begins. | Confirmed by user |
| **`packages/handoff` confirmed unnecessary.** Access `createProductWorker` already implements the ticket flow, per-product cookie, session and logout. | Access Worker diff inspected |
| **`packages/contracts` becomes a product-side layer.** Authoritative types consumed from Records and Access as pinned dependencies; local scope is content schemas, fixtures, product wrappers. | Reviewer 4 (earlier) |
| **Bun acknowledgement.** Product Workers were built with bun; the monorepo uses npm. Lockfile removal and possible build-script changes are per-Worker adoption work. | Confirmed by user |
| **HTML-to-SPA transition is Phase 1 work, not adoption.** The Worker wrapper stays; the inline HTML response becomes SPA asset serving. Parity gates per product. | Confirmed by Access Worker diff |
| **Test split by ownership.** Access-owned `createProductWorker` tests stay in Access; product-specific tests move to the monorepo per product. | Confirmed by Access Worker diff |
| **Client non-authoritative rule** stated explicitly. | Reviewer 4 (earlier) |
| **"Never ship a combined bundle"** constraint stated. | Reviewer 4 (earlier) |
| **Required status checks are repo-level, not path-level.** `CODEOWNERS` provides path-specific review; CI cannot. | Reviewer 4 (earlier) |
| **Contract v1.1 §21.10 resolution** noted in NAV-008. | Reviewer 4 (earlier) |
| **URL story clarified:** sales paths stay at shyntesy.com; subdomains are post-purchase product hosts; `navigator.html` becomes `apps/shell` at my.shyntesy.com. | Confirmed by user |
| **Watch-path matrix, rollback compatibility, deploy trigger model, bundle-size check, secrets grep, binding verification, tsc task, CI caching, nodejs_compat, ADR namespacing** — consolidated under §10. | Reviewer 3 + Reviewer 4 (later) |

Carried forward from v0.4: `my.shyntesy.com` host; `apps/shell` naming; single workspace per app; Node 24 pin; `*` not `workspace:`; four refusals; Rule of Three; `WorksheetLayout`; content pipeline; View as orientation, not dashboard.

---

## 1. Recommendation in one page

Adopt a monorepo for the Navigator product family — **shell, Clarify, Navigate, Prevent** — with **Access and Records remaining independent services outside it**. Use **npm workspaces + Turborepo**, single workspace per app, TypeScript project references, dependency-boundary linting, and a committed root lockfile.

```
navigator/
├── apps/
│   ├── shell/                   my.shyntesy.com — built new from existing navigator.html
│   ├── clarify/                 adopt existing Worker + add SPA
│   ├── navigate/                adopt existing Worker + add SPA
│   ├── prevent/                 adopt existing Worker + add SPA
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
├── docs/adr/                    NAV-001 through NAV-010
├── turbo.json
├── package.json
├── package-lock.json            one lockfile at root
└── CODEOWNERS
```

**Shared packages start with five.** `packages/ui` and `packages/access-client` start empty and are created when a second consumer demonstrably needs them (Rule of Three). **No `packages/handoff`**: Access `createProductWorker` already owns that responsibility, per its implementation.

**Four explicit refusals:**

1. **No shared database client.** Records stays a service.
2. **No generic form engine.** `WorksheetLayout` first.
3. **No app-to-app imports.** Shared code moves to `packages/`.
4. **No "common" or "misc" package.**

**What this proposal does not change:** the delivery order. Prevent remains the first product connected to a real implementation; the shell, Clarify, Navigate, Recognise and Protect are worked on when their phase begins.

**Scope boundary.** Access, Records, Stripe, Systeme.io, entitlement semantics and payment mechanics are separate workstreams. This proposal covers the monorepo only.

---

## 2. Naming and topology (NAV-008)

### The hierarchy

```
HeartFirst        mission — unbounded. heartfirst.shyntesy.com
  Navigator       product family — bounded. shyntesy.com (marketing entry point)
    my            personal shell         my.shyntesy.com
      Clarify     product               clarify.shyntesy.com
      Navigate    product               navigate.shyntesy.com
      Prevent     product               prevent.shyntesy.com
      Recognise   product (future)      recognise.shyntesy.com
      Protect     product (future)      protect.shyntesy.com
```

Navigator is the product-family name; its marketing entry point is shyntesy.com (currently `navigator.html`). `my.shyntesy.com` is the post-purchase personal shell. This matches the current state — shyntesy.com is the sales funnel root, product sales pages live at `shyntesy.com/{clarify,navigate,prevent}`.

### Hosts and deployment mapping

| Host | Content | Monorepo origin |
|---|---|---|
| `shyntesy.com` | Sales funnel root (navigator marketing) | Systeme.io — not in monorepo |
| `shyntesy.com/{clarify,navigate,prevent}` | Product sales pages | Systeme.io — not in monorepo |
| `heartfirst.shyntesy.com` | Mission / about / research | Static — outside scope |
| `my.shyntesy.com` | Post-purchase personal shell: catalog, account, cross-product navigation | `apps/shell` |
| `clarify.shyntesy.com` | Clarify product | `apps/clarify` |
| `navigate.shyntesy.com` | Navigate product | `apps/navigate` |
| `prevent.shyntesy.com` | Prevent product | `apps/prevent` |

Separate product subdomains because:

- Cookies are host-scoped. Clarify (least sensitive) cannot exfiltrate a session that reads Prevent (most sensitive).
- Host-based product identity in Access `createProductWorker` is preserved, not reimplemented.
- Route shadows between products are impossible.
- Optionality for future products with different auth surfaces.

### URL story

**Sales paths stay; subdomains are post-purchase.**

- `shyntesy.com` remains the marketing entry — no redirect, no migration.
- `shyntesy.com/{product}` remains the product sales page — no redirect, no migration.
- Post-purchase, Access redirects to `{product}.shyntesy.com`.
- `navigator.html` today becomes `apps/shell` deployed to `my.shyntesy.com` — a new build, not a port.

This resolves NAV-008's previous open question about SEO and Access host checks: sales URLs and product URLs are disjoint. No redirect exists to confuse crawlers, and no host check is duplicated.

### `apps/shell` is the platform, not a fourth product

Jobs:

- Post-purchase personal destination (sign-in is Access's, not the shell's).
- Product catalog with per-product state.
- Cross-product navigation.
- Account routes.
- Consumes `packages/access-client` more heavily than any single product.

Rules:

- **Content-pipeline schema is a marketing-catalog schema**, not health-guidance.
- **Ownership is platform.** `CODEOWNERS` maps accordingly.
- **Not a landing page to fill.** Orientation is View — discrete, present everywhere, not a dashboard. The shell exists to route, not to accumulate.
- **`X-Robots-Tag: noindex` from day one.**
- **Client is non-authoritative.** The shell renders catalog and entitlement state from Access responses; it never computes entitlement itself, never caches it as an authority. Feature visibility follows the server's truth.

### Recognise and Protect

Not planned now. `apps/` and `content/` are structured so that adding them is a new entry. Recognise may be static-first — do not assume `apps/recognise` without checking.

### Contract resolution

This decision resolves **Contract v1.1 §21.10** — the open item about whether Clarify exposes its callback directly or is refactored into a shared monorepo/deployment. Both are now answered: each product Worker keeps its own callback (via `createProductWorker`), and they live in a shared monorepo. Note this in NAV-008's status line.

---

## 3. What a monorepo solves, and what it does not

### It solves

- **Contract coherence.** One place to consume `@heartfirst/contracts` from Records and the Access session interface; one place to detect drift.
- **One test universe.** Shared fixtures and boundary doubles.
- **Atomic change.** A contract change and its consumers land in one commit; CI proves compatibility before deployment.
- **Consistent tooling.** One ESLint preset, one TS base config, one Vitest setup.
- **Publication gating.** One content pipeline.
- **Boundary discipline.** Enforced in lint, not documentation.

### It does not solve

- **Product semantics.** Sharing infrastructure does not make products the same.
- **AI cost.** Cost comes from re-deciding semantics, not re-typing markup.
- **The reuse percentage.** Reuse is zero at Phase 0–1. The "48%" is a hypothesis to be measured at Phase 2.

**Honest framing:** the monorepo's value in Phase 0–1 is **discipline** — contracts, fixtures, boundaries, content gating — not reuse.

---

## 4. Tooling: npm workspaces (NAV-001)

**Decision: npm workspaces + Turborepo.**

### Root `package.json` shape

```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*", "tests"],
  "packageManager": "npm@10.9.2",
  "engines": { "node": ">=24", "npm": ">=10.9.2" },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint && dependency-cruiser",
    "check:deps": "syncpack list-mismatches",
    "affected": "turbo run typecheck test build --filter='...[origin/main]'"
  },
  "overrides": { "/* documented security pins */": "" },
  "devDependencies": {
    "turbo": "<pinned>",
    "syncpack": "<pinned>",
    "dependency-cruiser": "<pinned>"
  }
}
```

- **Node 24, not 22.** Node 22 reaches EOL April 2027; 24 runs to April 2028. Pin `.nvmrc`, `engines.node`, and `engine-strict=true` in `.npmrc` so the pin bites (`packageManager` is a Corepack field npm does not enforce).
- **`workspaces` uses `apps/*` and `packages/*`** — one workspace per app; no split.
- **Internal dependencies use `"*"`, not `"workspace:*"`.** npm does not support the `workspace:` protocol.
- **One root lockfile; `npm ci` in CI.**

### Bun migration

The product Workers were built with bun. The monorepo uses npm. Per-Worker adoption, not automatic:

- Remove per-Worker `bun.lockb`; the root `package-lock.json` is the only lockfile.
- If `package.json` scripts use `bun build` / `bun run`, change to `wrangler` / `vite` equivalents. If they already use `wrangler`, no change.
- Verify with `grep -l "bun" apps/*/package.json` before committing to "bun doesn't affect the monorepo."

Expectation: bun was likely only the package manager; scripts likely already use wrangler. But verify rather than assume.

### If you ever revisit pnpm

`rm -rf node_modules package-lock.json && pnpm import && pnpm install`. Record as a new ADR with the trigger that justified it.

---

## 5. Cloudflare deployment topology (NAV-006)

### Root directory per Worker

Each app deploys its own Worker with its own `wrangler.jsonc` at the app root. Workers Builds connects the same repository to each Worker and sets the root directory.

```
apps/shell/wrangler.jsonc        root: apps/shell
apps/clarify/wrangler.jsonc      root: apps/clarify
apps/navigate/wrangler.jsonc     root: apps/navigate
apps/prevent/wrangler.jsonc      root: apps/prevent
```

**Each app uses the Cloudflare Vite plugin's single-project layout** — one `wrangler.jsonc`, one package.json, SPA + Worker built together. Verify against your guard-before-assets requirement in Phase 0–1; if it doesn't fit, that is the one legitimate argument for splitting web and worker workspaces, and the ADR should note the reason.

### Build watch paths

Workers Builds defaults to includes `[*]` and excludes `[]`, so **every commit builds every Worker unless configured otherwise**. Configure per Worker.

**Excludes are evaluated before includes.** Whether large pushes bypass path filtering must be verified against the current Cloudflare watch-paths documentation before being encoded in an ADR.

Two layers of filtering: watch paths decide **whether a build starts**; Turborepo filtering decides **which tasks run inside a build**.

### Environments vs Previews

Use **Wrangler environments** for persistent Workers; **Previews** for per-branch/per-PR URLs.

### Service bindings are non-inheritable

Bindings must be redeclared in every named environment. A binding to `<worker-name>` in environment `staging` uses `service: "<name>-staging"`.

- **Naming convention:** `<app>-worker-<env>`, e.g. `prevent-worker-staging`, `access-worker-staging`.
- Every new environment requires explicit binding declarations in every dependent Worker.
- Missing binding fails at request time, not deploy time, unless asserted in a startup check. Add one.

### SPA routing and local development

React SPA Workers set `assets.not_found_handling = "single-page-application"`. Protected routes must pass the Worker before asset fallback.

**Open question — asset guard scope.** Should the SPA's static assets (HTML, JS, CSS) sit behind the session guard, or only the data routes? For a health product this should be decided deliberately, not by accident. Recommendation: guard the shell HTML; allow JS/CSS through (no health data); data routes always guarded. Record in NAV-006.

---

## 6. Application architecture

### Per-app shape

```
apps/<app>/
├── src/             React + TS + Vite SPA
├── worker/          Worker entry, createProductWorker wrapper
├── wrangler.jsonc
├── vite.config.ts
└── package.json
```

The Worker is not a second backend. It is the app's protected edge.

### Transition from existing Workers

Current Workers return HTML directly from `page(env, "Your workspace", workspaceHtml)`. The monorepo introduces a React SPA. Port:

- **Keep:** `createProductWorker` for the wrapper — configuration checks, cookie parsing, callbacks, session, logout, security headers.
- **Replace:** the final `return page(env, "Your workspace", …)` with asset serving from the SPA.
- **`workspaceHtml`:** becomes either a pre-SPA fallback (visible during load) or is removed entirely.

This is real Phase 1 work, not copy-paste. **Parity gates per product:** rendered-DOM equivalence (where applicable), CSP parity, no new external requests, handoff flow re-tested, `X-Robots-Tag: noindex` preserved.

**Never ship a combined bundle.** A Clarify customer's browser must not download Prevent's application code just because they share a source repo. Share at source level (`packages/*`), never at bundle level. Each product's deployed JS is its own.

### Access boundary

Access remains the identity and entitlement authority. `createProductWorker` provides fixed app identity, host checks, the Access service binding, callback redemption, host-only cookie, session check, logout and restricted read forwarding. **Nothing in this proposal reimplements or replaces it.**

`packages/access-client`, when created, is a thin typed helper — session bootstrap, CSRF bootstrap, allow-listed deep-link return, typed session error states.

**Client is non-authoritative.** Any permission or entitlement decision rendered in the client must come from the Access response, never from client-side computation or cache. Feature visible only when the server says so. This matters especially for `apps/shell`, whose whole job is showing state; the temptation to compute it locally is real and wrong.

### Records boundary — three things often conflated

| Thing | Status | Consequence |
|---|---|---|
| **Unification** — one authoritative store | **Already exists: Records.** | Nothing to build. |
| **Migration** — replacing `pg` with D1/R2 | **Not proposed.** | Separate workstream. |
| **Shared DB client** — a package every Worker imports to talk to the database | **Refused.** | Bypasses identity mapping, per-record authority, origin/CSRF. |

**Boundary in one sentence:** *packages may contain API clients that talk to the Records HTTP boundary, but no package may contain a PostgreSQL/pg client or execute SQL.*

### App-to-app boundaries

- Four current Workers (shell, clarify, navigate, prevent); Recognise and Protect when their product work begins.
- Cross-app links are navigation or contextual previews — not shared record writes.
- No app imports another app's source.
- Clarify and Navigate do not inherit Prevent's record semantics.

---

## 7. Shared packages

### `packages/contracts` — product-side layer, not the authority

**The authoritative definitions live upstream**, in the services that own them:

- **From Records (pinned dependency on `@heartfirst/contracts`):** permission matrix, `SR-*` types, error codes, permission evaluator surfaces.
- **From Access (pinned dependency, or via `access-client`):** session shape, CSRF interface, deep-link return contract.

**The monorepo's `packages/contracts` adds:**

- Content front-matter schemas (per-product)
- Catalog shapes for the shell
- Product-side view wrappers (e.g. a `ProductCatalogView` combining entitlement state and content reference)
- Synthetic fixtures built on the consumed types
- Assertion helpers

**Anti-purpose:** never a duplicate of the permission matrix or `SR-*` types. Two sources of truth for security-relevant surfaces is a security bug, not a maintenance problem.

**Structure:** `src/types/` (pure TS, zero runtime) and `src/runtime/` (Zod schemas, validators). Subpath exports: `@navigator/contracts/types` and `@navigator/contracts/runtime`. One package, two entrypoints — prevents a Worker that imports a type from pulling in a validation library.

**Version:** 0.x unstable until frozen. README states the freezing policy. Session-shape types are pinned to the currently deployed Access version, with a comment saying so, so the deprecation path is visible from the first commit.

### Other packages

- **`packages/design-tokens`** — semantic CSS variables, light/dark, theme init, print styles. No React components.
- **`packages/test-support`** — fixture builders, boundary doubles (including failure cases), clock/ID injection, assertion helpers ("no record created by browsing", "revision unchanged", "no cross-subject leak"). Test-only; excluded from bundles by build config.
- **`packages/content-pipeline`** — front-matter validation, status enforcement, release filtering, content manifest emission. Per-product schema.
- **`packages/config-{eslint,ts,vitest}`** — one per tool category.

### `packages/ui` — starts empty

Populate only when a primitive has two confirmed consumers: labelled field wrapper, dirty guard, save-state acknowledgement, error summary, disclosure/accordion, revision badge.

**Anti-purpose:** no page layouts, no product-specific forms, no form engine, no "card and button kit" for visual consistency alone.

**Cost-of-abstraction note in README:** copying a `Button` a third time feels like a DRY violation; extracting too early is worse because it forces Clarify and Prevent to share constraints their workflows don't share. Name this explicitly.

### `packages/access-client` — starts empty

Created when a second consumer needs the same code. **`apps/shell` is expected to trigger extraction before Clarify**; this is the rule honoured, not a deviation.

---

## 8. Worksheet pattern and the form-engine question (NAV-004)

### What is shared: a page pattern

> introduction and summary → "read more" accordion → worksheet

That structure is genuinely shared. It is not a field schema, and it does not justify a form engine.

### `WorksheetLayout`

A component with slots for intro, read-more accordions, worksheet body and actions. Owns heading hierarchy, summary placement, accordion behaviour and accessibility, spacing, print. Does not own field definitions, validation, conditional visibility, submission semantics, or the meaning of Unknown vs absent vs To discuss.

Each worksheet body is a specific component.

### Why not a schema-driven engine yet

A form engine is reasonable when form behaviour is genuinely field-level. It becomes poor when meaning is carried by lifecycle and authority:

- Unknown, absent and To discuss are three states, not one.
- Saved, reported sent, received and agreed are four independent operations.
- One Action identity must survive across home, Results and programme.
- Family outreach must not appear as a Briefing candidate by default.
- Unit-dependent comparison depends on *missing* information.

A config language expressive enough to encode these becomes a small programming language; one that cannot encode them flattens the semantics the W05 review established.

### Decision gate for revisiting

Revisit only if **all** hold:

1. Three worksheets share the same *field-level* behaviour.
2. The shared behaviour includes conditional visibility or derived values currently duplicated.
3. The semantics can be expressed in configuration without product-specific escape hatches.
4. The engine can be tested through the same contract fixtures as hand-built forms.
5. The engine's accessibility and error behaviour matches the hand-built baseline.

---

## 9. Content architecture

```
content/
├── shell/          catalog copy — marketing schema
├── clarify/        per-product schema
├── navigate/       per-product schema
└── prevent/        health-guidance schema
```

Front matter per item:

```yaml
id: PF-C26
title: Family communication
status: draft | approved | deferred
provenance: Manual MC9
reviewer: pending
clinical_review: pending
release_eligible: false
```

The pipeline validates, rejects unknown status, excludes non-release-eligible items from production. Content approval is separate from code review.

### Two W05 carry-forwards

**1. Completion-language governance.** Five confirmed locations (MC10 L548, MC12 L171, SC7 L252, MC10 L566, T5 L298). Working assumption for remaining files: every "finish", "close", "stabilize", "safe", "protected", "improved" or "prevented" is suspect until read in context.

**2. Minimum-day boundary is a contract constraint.** The product must not suggest a reduced dose or frequency, silently alter a monitoring schedule, or present language implying clinical modification of a prescribed instruction.

### MC19 activity survival — open reconciliation

The 10-week calendar is not compressed into 30 days; sequencing prerequisites discarded. Activities tied to specific weeks are now untethered. Per-activity reconciliation: available-when-relevant, or dropped with the calendar. W05 follow-up.

### 9.5 Static estate (`sites/`)

The sales funnel, thank-you pages, Risk Atlas and free briefing live on Systeme.io. Recurring bugs (footer contrast, theme defaults, missing label toggles) are exactly the drift that `packages/design-tokens` would prevent — if there is a build step that produces paste-ready blocks from the tokens.

```
sites/
├── systeme/
│   ├── header.html
│   ├── footer.html
│   └── body-blocks/
└── package.json
```

A **parallel small workstream**, not Phase 0. Without it, the monorepo reads as serving only the Workers when a third of the visible surface is static pages and it drifts today.

### Recognise as possibly static

Recognise may be static content plus a local-only interactive layer, no authenticated Worker. Do not assume `apps/recognise` without checking.

---

## 10. Testing, CI, and operational disciplines

### 10.1 Test layers

| Layer | Tool | Location |
|---|---|---|
| Contracts (types + runtime) | Vitest | `packages/contracts` |
| Shared primitives and `WorksheetLayout` | Vitest + RTL | `packages/ui` |
| App UI | Vitest + RTL | `apps/*/src` |
| Worker boundaries | Vitest Workers pool / Miniflare | `apps/*/worker` |
| Records contract | Node tests + consumer/provider fixtures | Records repo + `packages/contracts` |
| Cross-app journeys | Playwright | `tests/` |
| Accessibility | Automated + keyboard/screen-reader | App and `packages/ui` |
| Editorial/evidence | Content pipeline + human review | `content/` + `review/` |

**Test split by ownership.** Access's `tests/shared-product-worker.test.mjs` tests `createProductWorker` and stays in Access. Existing `tests/prevent-shell.test.mjs` tests Prevent-specific behaviour and moves to `apps/prevent/` in the monorepo. Split before porting to avoid a both-need-it problem.

**Evidence levels:** every result states whether it is synthetic, local provider or deployed integration.

### 10.2 CI shape

On PR:
1. `npm ci`
2. `turbo run typecheck lint test build --filter='...[origin/main]'`
3. `syncpack list-mismatches`
4. `dependency-cruiser`
5. Secrets grep (from Records `security.test.mjs` pattern)
6. `wrangler deploy --dry-run` bundle size check per affected Worker
7. `wrangler.jsonc` binding target verification
8. Affected Playwright suites

On merge to `main`, mandatory full run before Workers Builds deploys.

**Required status checks are repo-level, not path-level.** `CODEOWNERS` provides path-specific *review*; CI cannot. A plan that assumes "packages/* requires an extra CI check" is built on a GitHub mechanism that does not exist. All PRs run the same required checks; stricter approval for `packages/*` comes via `CODEOWNERS` routing.

### 10.3 Deploy trigger model

**Workers Builds is the deploy trigger. `turbo deploy` is manual/emergency recovery only.**

Watch paths and root directories are designed for Workers Builds; two pipelines invite double deploys, races, and drift between what CI tested and what deployed. The emergency path is documented in the runbook.

**Tests gate the Workers Builds deploy** because the Workers Builds step runs `turbo run test build --filter=...`.

**Where Cloudflare API tokens live:** Workers Builds configuration, not CI, not `.env`. CI does not deploy; it does not need deployment tokens.

### 10.4 Watch-path matrix

| Change path | Builds |
|---|---|
| `apps/<app>/**` | that app's Worker |
| `content/<app>/**` | that app's Worker |
| `packages/**` | all Workers |
| `sites/**` | none (or CI-only) |
| `tests/**`, `docs/**`, `review/**` | none |

**Excludes evaluated before includes.** Large pushes may bypass path filtering — verify in Cloudflare's watch-paths documentation before encoding the number; plan release timing accordingly.

### 10.5 Bundle and compatibility checks

- **Bundle size per affected Worker:** `wrangler deploy --dry-run`, fail if compressed script exceeds a threshold (start at 3MB; verify current platform limit before committing the ADR).
- **`nodejs_compat` discipline:** shared packages prefer Web Standard APIs (`crypto.subtle`, `TextEncoder`) over Node APIs.
- **`tsc --noEmit` as a separate Turbo task**, not bundled into `build`. Type-checking cache invalidates on a different axis than build.

### 10.6 Security and secret hygiene

- **Secrets grep from day one**, porting Records' `security.test.mjs` discipline.
- **Binding target verification in CI:** parse all `wrangler.jsonc` and assert service bindings resolve.
- **Startup binding assertion** per Worker: fail-fast on missing binding at boot.
- **`npm audit --audit-level=critical`**, with root `overrides` rationale documented per pin.
- **Nothing belonging to Access (Stripe, Resend, peppers) appears in the monorepo** — not even in CI variables.

### 10.7 Rollback and compatibility

Five independently deployed Workers sharing contract types mean a rolled-back Worker can speak an older wire format than peers.

**Rule:** contract changes are backward-compatible within a deploy window, using **expand → migrate → contract**:

1. **Expand:** add the new field/operation; both old and new clients work.
2. **Migrate:** all consumers use the new shape; old shape still supported.
3. **Contract:** remove the old shape after the deploy window.

**Rollback runbook states the compatibility floor per Worker.** Stated at deploy time, not discovered during an incident.

### 10.8 SPA asset guard question

See §5. Recommendation: guard shell HTML; allow JS/CSS through; data routes always guarded. Decide deliberately, record in NAV-006.

---

## 11. Ownership and dependency rules (NAV-009)

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

**Dependency graph, enforced in lint:**

```
apps/* → packages/ui → packages/design-tokens
apps/* → packages/contracts → @heartfirst/contracts (from Records)
apps/* → packages/test-support (dev)
packages/* ↛ apps/*
apps/a ↛ apps/b
```

`dependency-cruiser` for architecture rules; `eslint-plugin-import` for dependency declaration. No relative imports across package boundaries; import by package name. Package names use `@navigator/*` scope and are never bare identifiers that collide with browser globals.

### Contract change evidence

A change to `packages/contracts` — or a bump of `@heartfirst/contracts` — must cite the authorizing Records/Access evidence or gate document in its commit or PR. This operationalizes "shared change control" rather than leaving it as a phrase.

### ADR namespacing across repos

Records uses `docs/decisions/0001-…`. Prefix per repo: `NAV-001`, `ACC-001`, `REC-0001`. Applies in ADR filenames and cross-references.

---

## 12. Delivery phases (preserving A1/A2/B1/C)

### Phase 0 — Skeleton and Prevent adoption proof

**What to build:**

- Workspace, Turborepo, TS project references, ESLint boundaries, `packageManager` pin, `engine-strict=true`, root `overrides`, CODEOWNERS
- `packages/contracts` (0.x unstable, error-code enums, session-shape pinned to deployed Access version, entitlement stub, subpath exports)
- `packages/test-support`, `packages/design-tokens`, `packages/content-pipeline`
- `packages/ui` and `packages/access-client` stay empty
- NAV-001, NAV-002, NAV-003, NAV-008 written (others in parallel)

**The Prevent adoption proof:**

- Move the existing Prevent Worker into `apps/prevent/` **unchanged** — no SPA yet, no product work
- Replace bun lockfile with root npm lockfile; adjust build scripts if needed
- **Add one import from `packages/contracts`** (e.g. `SHELL_VERSION` constant) that flows into a response header
- Deploy via Workers Builds to `prevent-staging.shyntesy.com` — the existing Access staging binding is already wired

**Done when:**

1. The existing Prevent Worker builds from `apps/prevent/` and deploys to staging.
2. The deployed response contains the constant imported from `packages/contracts` — workspace resolution works from a subdirectory root.
3. **Bumping the constant, pushing, and observing the deployed response change** — a contract change reaches its consumer.
4. Watch paths do not build unrelated Workers (add a trivial `apps/navigate/` shell to test filtering without deploying).

**Not done when:** only the pipeline is proven. The contract constant in deployed output is not ceremony; it is the point.

**No new Access work required.** The existing Prevent staging Worker already has DNS, Access origin registration, and named binding configured — the same binding the adoption re-uses.

### Phase 1 — Prevent SPA

Port the Prevent Worker's HTML response to SPA asset serving:

- Keep `createProductWorker` unchanged
- Replace `return page(env, "Your workspace", workspaceHtml)` with SPA asset serving
- Add Vite + React + TypeScript layer
- Split tests: Access-owned `shared-product-worker.test.mjs` stays in Access; `prevent-shell.test.mjs` moves to `apps/prevent/`
- Parity gates: CSP preserved, `X-Robots-Tag: noindex` preserved, handoff flow re-tested, no new external requests

Then build the first two or three Prevent worksheets as specific components. `packages/ui` still empty except for primitives with two confirmed uses.

**Done when:** Prevent passes its B1 structure gate in the monorepo, against synthetic adapters, with the evidence level stated. Parity gates pass.

### Phase 2 — Shell, then Clarify, then Navigate

**Phase 2a — Shell, static catalog.** Public catalog page, sign-in entry, no entitlement state. Built new (from existing `navigator.html` as reference), deployed to `my.shyntesy.com`. Can be built before Access entitlement work completes.

**Phase 2b — Shell, signed-in state.** Catalog shows what the user owns, from Access responses. Client non-authoritative.

**Phase 2c — Shell, account surface.** Settings, sign-out, whatever Access supports.

**Phase 2d — Clarify adoption.** Adopt the existing Clarify Worker, convert to SPA, parity gates. `WorksheetLayout` extracted when Clarify's second worksheet shares the page pattern with Prevent's.

**Phase 2e — Navigate adoption.** Same pattern.

`packages/access-client` extraction likely happens in Phase 2a–2b, when the shell becomes the second consumer.

**Measurement point:** after Clarify's second worksheet, measure actual shared code. That number replaces the "48%" hypothesis.

### Phase 3 — Recognise and Protect

Scaffolded when their product work begins. Recognise may be static-first — verify before assuming `apps/recognise`.

### Phase 4 — Connected operations and publication

Connect Access/Records per app at C. Publication gating. Cross-app journey tests where apps genuinely interact.

---

## 13. ADRs to write

1. **NAV-001 — Package manager: npm workspaces.** Rationale, disciplines, revisit trigger, migration path, bun migration note.
2. **NAV-002 — Monorepo topology.** Access and Records outside; Navigator inside; service boundaries; existing Workers adopted.
3. **NAV-003 — Records is a service, not a package.** No shared DB client; API clients allowed; contracts consumed from Records.
4. **NAV-004 — Worksheet layout before form engine.** Decision gate.
5. **NAV-005 — Content publication gating.** Front-matter schema, release manifest.
6. **NAV-006 — Deployment topology.** Root directory per Worker, watch paths, environments vs Previews, deploy trigger model, watch-path matrix, rollback compatibility, SPA asset guard decision.
7. **NAV-007 — Dependency boundaries and operational disciplines.** Enforced rules, `nodejs_compat`, bundle size, secrets grep, ADR namespacing, client non-authoritative rule.
8. **NAV-008 — Naming hierarchy and host topology.** HeartFirst/Navigator/my/products; four product subdomains plus my; sales URL story; View as orientation not dashboard; §21.10 resolution.
9. **NAV-009 — App-to-app and package boundaries.** No cross-app imports; package single-role; contract change evidence; never a combined bundle.
10. **NAV-010 — Static estate.** `sites/` producing paste-ready Systeme.io blocks from design tokens.

---

## 14. Questions that need decisions

**Repository and integration**

1. **Intended repository, branch and stable Access checkpoint** for the Phase 0 Prevent adoption.
2. **How is `@heartfirst/contracts` published from Records** — package registry, git tag, or workspace-internal link? At least provisional answer needed before Phase 0's contract import works.
3. **Root `overrides` ownership.**

**Deployment**

4. **Environment names and binding names** per app and per environment.
5. **Previews vs environments** — which persistent environments exist, are per-PR Previews enabled?
6. **Observability** — what is shared, how is health data kept out of logs?
7. **SPA asset guard scope** — HTML guarded, JS/CSS through, data routes always? Or all behind guard?

**Contracts**

8. **Contract versioning and consumer-driven tests** — changelog, deprecation window, fixture sync, rollback compatibility floor.

**Product and worksheet**

9. **Field-level shapes of the first three Clarify and first three Navigate worksheets.**
10. **Does any product need conditional field visibility that `WorksheetLayout` + primitives cannot express?**
11. **Is "read more" per-worksheet content or shared guidance?**
12. **Does Clarify need records at all, or is it primarily educational?**
13. **MC19 activity survival** — per-activity reconciliation.

**Content and static estate**

14. **Named content owners and clinical reviewers** per product.
15. **Release inventory and publication gate** per product.
16. **`sites/` scope** — which Systeme.io surfaces does the pipeline cover first?

**Out of scope for this proposal but gating go-live**

- **Day-one delivery.** The sales page promises a workspace; the workspace arrives later. Do not take payment for something that doesn't exist yet.
- **GDPR and health data.** Consent, DPIA, processor agreements, data-region, retention, export/erasure, log redaction — go-live gates with Records and legal.

**Deliberately not in this section:** Access entitlement semantics, Stripe/Systeme.io integration, webhook contracts, payment mechanics, ledger design.

---

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Premature abstraction | Rule of Three; measure reuse at Phase 2 |
| Shared DB client creep | NAV-003; contracts has no I/O |
| Duplicated permission matrix in monorepo | Contracts consumes `@heartfirst/contracts`; never copies |
| App-to-app coupling | `dependency-cruiser` in CI |
| Form engine becoming a framework | `WorksheetLayout` first; decision gate |
| Phantom dependencies under npm hoisting | `import/no-extraneous-dependencies` in CI |
| Dependency version drift | `syncpack` in CI; root `overrides` documented |
| Missing binding in a new environment | Naming convention + startup assertion + CI verification |
| Rollback producing wire-format skew | Expand → migrate → contract; compatibility floor in runbook |
| Bundle size creep under monorepo hoisting | Bundle size check per affected Worker |
| Combined bundle leaking product code | Never ship combined bundle rule in NAV-009 |
| Client computing entitlement | Client non-authoritative rule in NAV-007 and NAV-008 |
| Secrets in client-reachable code | Records secrets-grep ported to CI; Access secrets never in monorepo |
| Unreviewed content reaching production | Front-matter validation + build-time exclusion |
| Contract drift from Records | Consumer-driven tests; contract changes cite Records evidence |
| Shell drifting into a fourth product | Platform-vs-product distinction in NAV-008; View as orientation not dashboard |
| CI cost growth | Turborepo affected-only + Workers Builds watch paths |
| Static pages drifting | `sites/` from design tokens |
| SPA conversion breaking parity | Parity gates per product (CSP, DOM, handoff, noindex) |

---

## 16. What to do next, in order

1. **Write NAV-001, NAV-002, NAV-003, NAV-008.**
2. **Settle the deploy trigger decision** — Workers Builds primary, `turbo deploy` emergency — and record in NAV-006.
3. **Draft the watch-path matrix** (§10.4) before wiring Workers Builds.
4. **Confirm how `@heartfirst/contracts` is consumed from Records** (Q2). Five minutes; determines whether Phase 0's contract import can land.
5. **Sketch the first three Clarify worksheets at field level.**
6. **Create `packages/contracts` (0.x, subpath exports), `packages/test-support`, `packages/design-tokens`, `packages/content-pipeline`.**
7. **Adopt the existing Prevent Worker into `apps/prevent/` unchanged; add a contract import; deploy via Workers Builds.** Bump the constant, observe the change. Phase 0 closed with evidence.
8. **Phase 1: convert Prevent's HTML response to SPA asset serving.** Parity gates.
9. **Phase 2a–2c: build `apps/shell` in three sub-deliverables.**
10. **Phase 2d–2e: adopt Clarify, then Navigate.**
11. **Extract `WorksheetLayout`** when the second worksheet needs it.
12. **Add Recognise and Protect** when their product work begins.

The monorepo is the right container. What makes it work is the discipline that has governed the source review: share what is genuinely shared, name what is not, and never let a convenient abstraction override a product distinction.
