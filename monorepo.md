# HeartFirst Navigator — Monorepo Proposal

**Draft v0.3 · 31 October 2026 · Architecture proposal; no implementation, contract or clinical approval**

## Changes in this revision

| Change | Reason |
|---|---|
| **Name: HeartFirst Suite → HeartFirst Navigator** | HeartFirst is the unbounded mission; Navigator is the bounded product family. Dropping "Suite" avoids redundancy. Recorded as ADR-008. |
| **Host topology fixed: separate subdomains** | navigator.shyntesy.com (platform), clarify/navigate/prevent.shyntesy.com (products). Cookie isolation for health data; host-check product identity preserved. |
| **`apps/navigator` added as platform shell** | Sign-in entry, product catalog, entitlement state, account routes, cross-product navigation. Not a fourth product in the same sense as Clarify/Navigate/Prevent. |
| **Recognise and Protect as placeholders** | Future products; architecture must enable addition without assuming a shape. Not planned. |
| **Access/Records/Stripe/Systeme.io content removed** | Those are separate workstreams. This proposal covers the monorepo only. Where the monorepo must consume an interface those workstreams define, that is noted as an interface point, not an Access decision. |
| **Two ADRs added** | ADR-008 (naming hierarchy and hosts); ADR-009 (app-to-app and package boundaries). |

---

## 1. Recommendation in one page

Adopt a monorepo for the Navigator product family — **Clarify, Navigate, Prevent, plus the Navigator platform shell** — with **Access and Records remaining independent services outside it**. Use **npm workspaces + Turborepo**, TypeScript project references, dependency-boundary linting, and a committed root lockfile.

```
navigator/
├── apps/
│   ├── navigator/{web,worker}   platform: sign-in, catalog, account, routes
│   ├── clarify/{web,worker}
│   ├── navigate/{web,worker}
│   ├── prevent/{web,worker}
│   ├── recognise/               placeholder (scaffold when product work begins)
│   └── protect/                 placeholder (scaffold when product work begins)
├── packages/
│   ├── contracts/               wire types, schemas, fixtures
│   ├── design-tokens/           semantic CSS variables
│   ├── test-support/            boundary doubles, fixture builders
│   ├── content-pipeline/        front-matter validation, release filtering
│   ├── access-client/           thin typed client over Access routes (created when warranted)
│   └── config-{eslint,ts,vitest}/
├── content/
│   ├── navigator/  clarify/  navigate/  prevent/
├── review/                      source dispositions, coverage ledger
├── tests/                       cross-app journey evidence
├── docs/adr/
├── turbo.json
├── package.json
├── package-lock.json            one lockfile at root
└── CODEOWNERS
```

**Shared packages start with five: contracts, design-tokens, test-support, content-pipeline, and config-*.** `packages/ui` and `packages/access-client` start empty and are created when a second consumer demonstrably needs them (Rule of Three).

**Four explicit refusals**, each for a reason that has been argued and stands:

1. **No shared database client.** Records stays a service. Products call it through the Access Worker's service binding. A shared `packages/storage` importing `pg` would move the trust boundary into four applications that can each get it slightly wrong.
2. **No generic form engine.** The worksheet structure shared across products is a page pattern, not a field schema. `WorksheetLayout` first. Schema-driven engine deferred until three worksheets share *field-level* behaviour.
3. **No app-to-app imports.** `apps/clarify` never imports `apps/prevent/src`. Shared code moves to `packages/`; runtime coupling across apps is forbidden.
4. **No "common" or "misc" package.** Every package has one role and a stable public export.

**What this proposal does not change:** the delivery order. Prevent remains the first connected implementation. The Navigator shell, Clarify, Navigate, Recognise and Protect are scaffolded when their product work begins. The monorepo is the container, not the schedule. A1 → A2 → B1 → C continues to govern.

**Scope boundary.** Access, Records, Stripe, Systeme.io, entitlement semantics and payment mechanics are separate workstreams. This proposal covers the monorepo only. Where the monorepo must consume an interface those workstreams define, it is noted as an interface point. Access decisions are not made here and are not pre-empted here.

---

## 2. Naming and topology (ADR-008)

### The hierarchy

```
HeartFirst        mission — unbounded. Stays at heartfirst.shyntesy.com
  Navigator       product family — bounded. navigator.shyntesy.com
    Clarify       product
    Navigate      product
    Prevent       product
    Recognise     product (future — free intro, not planned now)
    Protect       product (future — possibly subscription, not planned now)
```

"Navigator" as family name and "Navigate" as product name is accepted with disambiguation by convention: *Navigator* is the family/platform/repo; *Navigate* is the product. This collision is judged cheap compared to renaming the product.

### Hosts and deployment mapping

| Host | Content | Monorepo origin |
|---|---|---|
| `navigator.shyntesy.com` | Platform: sign-in entry, product catalog, account routes, cross-product navigation | `apps/navigator/{web,worker}` |
| `clarify.shyntesy.com` | Clarify product | `apps/clarify/{web,worker}` |
| `navigate.shyntesy.com` | Navigate product | `apps/navigate/{web,worker}` |
| `prevent.shyntesy.com` | Prevent product | `apps/prevent/{web,worker}` |

Future Recognise and Protect take their own subdomains, on the same pattern.

Separate subdomains were chosen because:

- Cookies are host-scoped. Clarify (least sensitive) cannot exfiltrate a session that reads Prevent (most sensitive).
- Host-based product identity in Access `product-worker.ts` is preserved. No route-based disambiguation is introduced.
- Route shadows between products are impossible: three hosts, three independent Workers, three independent deploys.
- Optionality for future products, which may need their own auth surface.

### `apps/navigator` is the platform, not a fourth product

Its distinct jobs:

- Sign-in entry and account routes.
- Product catalog with per-product state.
- Cross-product navigation.
- Consumes `packages/access-client` more heavily than any single product does.

Its distinct rules:

- **Content-pipeline treatment:** catalog copy, not health records. The pipeline's content schema for `content/navigator/` is a marketing-catalog schema, not the health-guidance schema used for `content/prevent/` etc.
- **Ownership:** platform, not product. `CODEOWNERS` maps accordingly.
- **Dependency posture:** it is expected to be the first or second consumer of `packages/access-client`, and possibly of shared UI primitives that are genuinely navigational (breadcrumbs, product selector) rather than worksheet-shaped.

### Recognise and Protect

Not planned now. They influence the monorepo in one way only: **`apps/` and `content/` are structured so that adding them is a new entry, not a restructure.** That means:

- The workspace globs (`apps/*`, `content/*`) already match new directories.
- `CODEOWNERS` is path-based and will accept new entries.
- The content pipeline validates per-directory schema; new products add a schema, not a pipeline rewrite.

Nothing else about them is decided.

---

## 3. What a monorepo solves, and what it does not

### It solves

- **Contract coherence.** One `packages/contracts` with consumer-driven fixtures prevents incompatible interpretations of the same wire format.
- **One test universe.** Shared fixtures and boundary doubles across apps. Without this, each app invents its own fixtures and they drift.
- **Atomic change.** A contract change and its consumers land in one commit; CI proves compatibility before deployment.
- **Consistent tooling.** One ESLint preset, one TS base config, one Vitest setup.
- **Publication gating.** One content pipeline; unreviewed material cannot reach production in any product by accidental bundling.
- **Boundary discipline.** The dependency graph is enforced in lint. App-to-app imports, speculative shared packages and circular dependencies are caught, not just discouraged.

### It does not solve

- **Product semantics.** Sharing infrastructure does not make products the same. Clarify and Prevent remain different products; their shared surface may be the shell and design language, not the record layer.
- **AI cost.** The cost of writing products comes from re-deciding semantics, not re-typing markup. Contracts and fixtures are the lever.
- **The reuse percentage.** Nobody has measured reuse across products that do not exist. At Phase 1 (Prevent only), reuse is zero. The "48%" is a hypothesis to be measured after the second product exists.

**Honest framing:** the monorepo's value in Phase 0–1 is **discipline** — contracts, fixtures, boundaries, content gating — not reuse. Reuse becomes measurable at Phase 2.

---

## 4. Tooling: npm workspaces (ADR-001)

**Decision: npm workspaces + Turborepo.** Recorded as ADR-001.

| Consideration | Assessment |
|---|---|
| Consistency with Access and Records | Both already use npm. One package manager across the platform. |
| Cloudflare Workers Builds | Supports any package manager; the monorepo mechanism depends on per-Worker root directory, not the package manager. |
| Team friction | Documented history of abandoning pnpm. On a small team, tooling friction compounds. |
| pnpm's real advantages | Strictness, `workspace:` publish rewriting, graph-aware `--filter`, fast installs. The first is reproducible with a lint rule; the others matter at twenty-plus packages, not eight. |
| Migration cost later | `pnpm import` reads `package-lock.json`. A repo this size migrates in an afternoon — and with the disciplines below, with zero cleanup. |

### Four disciplines that recover pnpm's benefits

**1. Every package declares every dependency it imports.** Enforce with `eslint-plugin-import`'s `no-extraneous-dependencies` in workspace resolution mode. Closes the phantom-dependency gap that pnpm catches structurally.

**2. Turborepo for affected-only tasks.** `turbo run test --filter='...[origin/main]'`. Prefer package-level tasks over root tasks so Turborepo parallelises and caches per package.

**3. Pin the toolchain.** Root `package.json`: `"packageManager": "npm@<version>"` and `engines.node`. A `.nvmrc`. The Cloudflare build image defaults to npm 10.9.2; pin explicitly so local and CI agree.

**4. `syncpack` for internal version consistency.** `npm version --workspaces` does not cascade internal dependency bumps; `syncpack` reads the workspaces field for npm and enforces consistency across packages. Run as a CI check, not just a fixer.

### Root package.json shape

```json
{
  "private": true,
  "workspaces": ["apps/*", "apps/*/web", "apps/*/worker", "packages/*", "tests"],
  "packageManager": "npm@10.9.2",
  "engines": { "node": ">=22.13.0" },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint && dependency-cruiser",
    "check:deps": "syncpack list-mismatches",
    "affected": "turbo run test build --filter='...[origin/main]'"
  },
  "overrides": { "/* documented security pins */": "" },
  "devDependencies": {
    "turbo": "<pinned>",
    "syncpack": "<pinned>",
    "dependency-cruiser": "<pinned>"
  }
}
```

**Lockfile discipline:** one `package-lock.json` at root, committed. CI uses `npm ci`, never `npm install`. A second lockfile anywhere is a bug.

**Internal dependency versions:** use `"*"` (universally supported by npm workspaces) or `"workspace:*"` if the pinned npm version supports it — verify against the pinned version rather than assuming. Packages are not published to a registry; semver here is changelog and consumer-awareness discipline.

**Root `overrides`:** pin transitive dependencies with security advisories in one place. Document each override with a rationale and a revisit trigger — an override that outlives its advisory becomes silent version skew. Keep `npm audit --audit-level=critical` in CI.

**If you ever revisit pnpm:** `rm -rf node_modules package-lock.json && pnpm import && pnpm install`. Record as a new ADR with the trigger that justified it.

---

## 5. Cloudflare deployment topology

### Root directory per Worker

Each Worker is its own deployable with its own `wrangler.jsonc`. Workers Builds connects the same repository to each Worker and sets the **root directory to where that Worker's `wrangler.jsonc` lives**.

```
apps/navigator/worker/wrangler.jsonc   root directory: apps/navigator/worker
apps/clarify/worker/wrangler.jsonc     root directory: apps/clarify/worker
apps/navigate/worker/wrangler.jsonc    root directory: apps/navigate/worker
apps/prevent/worker/wrangler.jsonc     root directory: apps/prevent/worker
```

Per-Worker deploy via Turborepo: `turbo deploy -F prevent-worker`.

### Build watch paths

Workers Builds defaults to includes `[*]` and excludes `[]`, so **every commit builds every Worker unless configured otherwise**. Configure per Worker.

Two caveats worth knowing:

- **Excludes are evaluated first, then includes.** A path matching both is excluded.
- **Path matching is bypassed** when a push contains zero file changes, or 3000+ file changes / 20+ commits. A large merge redeploys every Worker. Plan release timing accordingly; do not treat as a bug.

Two layers of filtering do different jobs and both are needed: watch paths decide **whether a build starts**; Turborepo filtering decides **which tasks run inside a build**.

### Environments vs Previews

Use **Wrangler environments** for persistent Workers (staging, dev) and **Previews** for per-branch or per-PR URLs. Do not use environments as a preview mechanism.

### Service bindings are non-inheritable

Bindings and environment variables must be redeclared in every named environment. A service binding to a Worker in a specific environment uses `<worker-name>-<environment-name>` because a Worker with environment `staging` deploys as `<name>-staging`.

Practical consequences:

- **Naming convention:** `<app>-<worker>-<env>`, e.g. `prevent-worker-staging`, `access-worker-staging`, `records-worker-staging`.
- Every new environment requires explicit binding declarations in every Worker that talks to another. This is the most common monorepo-plus-Workers mistake; put it in the deployment runbook.
- A missing binding fails at request time, not deploy time, unless you assert bindings in a startup check. Add one.

### SPA routing and local development

React SPA Workers set `assets.not_found_handling = "single-page-application"`. Protected routes must pass the Worker before asset fallback.

The Cloudflare Vite plugin runs the Worker in the Workers runtime locally, with HMR and local binding emulation. Document the one-command local path in the README; if it takes three terminals, developers will stop running it.

---

## 6. Application architecture

### Per-app shape

```
apps/<app>/
├── web/       React + TS + Vite SPA
└── worker/    protected shell, API composition, service adapters, wrangler.jsonc
```

The Worker is not a second backend. It is the app's protected edge: validates the Access session, applies app identity, forwards authorised operations to Records through a service binding, and serves the SPA behind the guard.

### Access boundary

Access remains the identity and entitlement authority. The existing `createProductWorker` pattern provides fixed app identity, host checks, the Access service binding, callback redemption, host-only secure cookie, session check, logout and restricted read forwarding. **Nothing in this proposal reimplements or replaces it.**

`packages/access-client`, when created, is a thin typed client helper — session bootstrap, CSRF bootstrap, allow-listed deep-link return, typed session error states. It calls the Access Worker; it does not issue tokens, set cookies, or decide entitlement.

**Extraction timing.** The plan is Prevent-first, Clarify-second. `apps/navigator` is a heavier consumer of the client than any product, so it may become the second consumer and trigger extraction earlier and on a different second consumer than the plan assumes. This is not a deviation; the extraction rule is being honoured.

### Records boundary — three things often conflated

| Thing | Status | Consequence |
|---|---|---|
| **Unification** — one authoritative store for personal records | **Already exists: Records.** | Nothing to build. Apps read and write through it. |
| **Migration** — replacing `pg` with D1/R2 | **Not proposed.** | A database change with its own migration, authority and test plan. Belongs to the Records workstream. |
| **Shared DB client** — a package every Worker imports to talk to the database | **Refused.** | Bypasses Access-to-Records identity mapping, per-record authority, origin/CSRF and server-owned identity fields. |

Records is a service, not a workspace package. No app Worker imports its `pg` client or its internals. The shared artifact is `packages/contracts`, which describes wire shapes, not the database.

**Authored assets vs user documents.** If R2 is ever used for authored templates and design assets, keep that distinct from user-document storage. The no-upload boundary for user documents is a separate Records decision, not a monorepo one.

### App-to-app boundaries

- Five Workers (navigator, clarify, navigate, prevent, and future recognise/protect), five identities, five hostnames.
- Cross-app links are navigation or contextual previews — not shared record writes.
- No app imports another app's source. A capability needed by two apps moves to `packages/`, not a sibling.
- Clarify and Navigate do not inherit Prevent's record semantics. If they need records, they need their own contract mapping, decided with Records.

---

## 7. Shared packages

### Start with five

**`packages/contracts`** — wire types, runtime schemas, synthetic fixtures, error-code enums, explicit "not applicable" placeholders for unresolved contracts. **Anti-purpose:** no I/O, no network calls, no authority decisions, no database schema. Created first, before any product screen.

**`packages/design-tokens`** — semantic CSS variables, light/dark, theme initialisation (persist only the non-sensitive preference), print styles. No React components.

**`packages/test-support`** — fixture builders, boundary doubles implementing the accepted contract **including failure cases**, clock/ID injection, assertion helpers for recurring properties ("no record created by browsing", "revision unchanged", "no cross-subject leak"). Test-only; excluded from bundles by build configuration.

**`packages/content-pipeline`** — front-matter validation, status enforcement, release filtering, content manifest emission. Per-product schema (catalog vs health-guidance). This is the build-boundary enforcement that publication gates require.

**`packages/config-{eslint,ts,vitest}`** — one package per tool category. Never a single "config" package.

### `packages/ui` — starts empty

Populate only when a primitive has two confirmed consumers. Likely candidates as work proceeds:

- Labelled field wrapper.
- Dirty-state guard.
- Save-state acknowledgement.
- Error summary with focus management.
- Disclosure/accordion — needed by `WorksheetLayout`.
- Revision badge / source-revision display.

**Anti-purpose:** no page layouts, no product-specific forms, no form engine, no "card and button kit" for visual consistency alone. Visual consistency comes from tokens; component sharing comes from repeated behaviour.

### `packages/access-client` — starts empty

Created when a second consumer needs the same code. Thin wrapper over Access routes only. Extraction may be triggered by `apps/navigator` rather than by a second product.

### Extraction rule

**Rule of Three** — three concrete implementations showing the same pattern before extraction. Two may be enough for a low-risk layout shell (`WorksheetLayout`, for instance); never for a field-level abstraction or a client library.

---

## 8. Worksheet pattern and the form-engine question (ADR-004)

### What is shared: a page pattern

> introduction and summary text → "read more" accordion → worksheet

That structure is genuinely shared across the products. It is not a field schema, and it does not justify a form engine.

### `WorksheetLayout`

```tsx
<WorksheetLayout
  intro={…}
  readMore={[
    { title: "How to use this tool", children: … },
    { title: "Getting the most out of it", children: … },
  ]}
  worksheet={<ClarifyContextWorksheet />}   // product-specific
  actions={…}
/>
```

**The layout owns:** heading hierarchy, summary placement, accordion behaviour and accessibility, consistent spacing, print behaviour, optional "what you will leave with" block.

**The layout does not own:** field definitions, validation, conditional visibility, submission semantics, or the meaning of Unknown vs absent vs To discuss.

Each worksheet body is a specific component. Bodies can differ completely while the shell stays consistent. This delivers most of the repetition reduction with almost none of the abstraction risk.

### Why not a schema-driven engine yet

A form engine is reasonable when form behaviour is genuinely field-level and data-driven. It becomes poor when meaning is carried by lifecycle and authority rather than field values:

- Unknown, absent and To discuss are three states, not one.
- Saved, reported sent, received and agreed are four independent operations.
- One Action identity must survive across home, Results and programme.
- Family outreach must not appear as a Briefing candidate by default.
- Unit-dependent comparison depends on *missing* information.

A config language expressive enough to encode these becomes a small programming language; one that cannot encode them flattens the semantics the W05 review established.

### Decision gate for revisiting

Revisit only if **all** hold:

1. Three worksheets share the same *field-level* behaviour, not just page structure.
2. The shared behaviour includes conditional visibility or derived values currently duplicated in code.
3. The semantics can be expressed in configuration without product-specific escape hatches.
4. The engine can be tested through the same contract fixtures as hand-built forms.
5. The engine's accessibility and error behaviour matches the hand-built baseline.

| Approach | Best for | Cost | Risk | Now? |
|---|---|---|---|---|
| Hand-built forms | Product-specific semantics | Low per form; visible duplication | Low | Start here |
| `WorksheetLayout` + primitives | Shared page scaffold, different bodies | Low–medium | Low; layout is a stable abstraction | **Recommended** |
| Schema-driven engine | Genuinely shared field behaviour | High to build and change | High; wrong abstraction expensive | Deferred |

---

## 9. Content architecture

```
content/
├── navigator/       catalog copy — marketing-catalog schema
├── clarify/         per-product schema
├── navigate/        per-product schema
└── prevent/         health-guidance schema
```

Each item carries front matter:

```yaml
id: PF-C26
title: Family communication
status: draft | approved | deferred
provenance: Manual MC9
reviewer: pending
clinical_review: pending
release_eligible: false
```

The pipeline validates the schema, rejects unknown status values, and excludes non-release-eligible items from production builds. Content approval is separate from code review: a file may merge as `draft` and cannot publish until reviewer and clinical fields are accepted.

### Two W05 carry-forwards that belong here

**1. Completion-language governance.** Five confirmed locations now use completion wording that can imply a clinical state from organisational completion (MC10 L548, MC12 L171, SC7 L252, MC10 L566, T5 L298), each with a different contextual disposition. The working assumption for remaining files is: every "finish", "close", "stabilize", "safe", "protected", "improved" or "prevented" is suspect until read in context. The pipeline enforces "unreviewed cannot publish"; the review-status field is load-bearing.

**2. The minimum-day boundary is a contract constraint, not only a content disposition.** The product must not suggest a reduced dose or frequency, silently alter a monitoring schedule, or present language implying clinical modification of a prescribed instruction. That constrains which Action fields and presentations are permissible — including "take it easier" or "skip if tired" phrasing. This belongs in the relevant Records/Access contract work; noted here as a downstream constraint on any arrangement editor.

### MC19 activity survival — open reconciliation question

The 10-week calendar is correctly not compressed into 30 days, and sequencing prerequisites are discarded. But activities tied to specific weeks (domains, multipliers, stack, conversation prep, family) are now untethered. Per-activity reconciliation — available-when-relevant, or dropped with the calendar — remains open. It lands in the content inventory as a W05 follow-up, not a monorepo decision.

---

## 10. Testing and CI

| Layer | Tool | Location |
|---|---|---|
| Contracts and semantic rules | Vitest | `packages/contracts` |
| Shared primitives and `WorksheetLayout` | Vitest + RTL | `packages/ui` |
| App UI | Vitest + RTL | `apps/*/web` |
| Worker boundaries | Vitest Workers pool / Miniflare | `apps/*/worker` |
| Records contract | Node tests + consumer/provider fixtures | Records repo + `packages/contracts` |
| Cross-app journeys | Playwright | `tests/` |
| Accessibility | Automated + keyboard/screen-reader | App and `packages/ui` |
| Editorial/evidence | Content pipeline + human review | `content/` + `review/` |

**CI shape:**

- `npm ci` → `turbo run lint test build --filter='...[origin/main]'` → `syncpack list-mismatches` → `dependency-cruiser` → affected Playwright suites.
- Mandatory full-run fallback on `main` and before release.
- Each Worker deploys independently through Workers Builds with its own root directory and watch paths.
- A contract-breaking change fails consumer tests in the same PR, before deployment.
- No database migration runs from an app build. Records owns migrations.

**Evidence levels carry forward:** every result states whether it is synthetic, local provider or deployed integration. A green synthetic test does not close a live-operation gate.

---

## 11. Ownership and dependency rules (ADR-009)

| Area | Owner |
|---|---|
| `apps/navigator` | Platform |
| `apps/clarify`, `apps/navigate`, `apps/prevent` | Respective product teams |
| `packages/contracts` | Platform + Records owners; shared change control |
| `packages/design-tokens` | Design/platform |
| `packages/test-support` | Platform/QA |
| `packages/content-pipeline` | Platform + content owners |
| `content/navigator` | Platform |
| `content/{clarify,navigate,prevent}` | Respective product + content reviewers |
| `review/` | Prevent content owner |

`CODEOWNERS` maps by path.

**Dependency graph, enforced in lint rather than documentation:**

```
apps/* → packages/ui → packages/design-tokens
apps/* → packages/contracts
apps/* → packages/test-support (dev)
packages/* ↛ apps/*
apps/a ↛ apps/b
```

`dependency-cruiser` for architecture rules (forbidden, allowed, orphan detection); `eslint-plugin-import` for dependency declaration. Different questions; both needed. No relative imports across package boundaries; import by package name.

---

## 12. Delivery phases (preserving A1/A2/B1/C)

### Phase 0 — Skeleton

Workspace, Turborepo, TS project references, ESLint boundaries, `packageManager` pin, root `overrides`, CODEOWNERS. Create `packages/contracts`, `packages/test-support`, `packages/design-tokens`, `packages/content-pipeline`. `packages/ui` and `packages/access-client` stay empty. Write ADR-001 through ADR-009.

**Done when:** an empty app builds, tests and deploys a guarded static shell through the existing Access pattern, and a contract change is seen by its consumers.

### Phase 1 — Prevent first

`apps/prevent/web` and `apps/prevent/worker` in the monorepo, reusing `createProductWorker`. First two or three Prevent worksheets as specific components. `packages/ui` still empty except for primitives with two confirmed uses.

**Done when:** Prevent passes its B1 structure gate in the monorepo, against synthetic adapters, with the evidence level stated.

### Phase 2 — Navigator shell, then Clarify, then Navigate

`apps/navigator` scaffolded when hub work begins. Because it is a heavier client consumer, extraction of `packages/access-client` may happen here rather than at Clarify. Clarify and Navigate scaffolded in turn; `WorksheetLayout` extracted at the second worksheet sharing the page pattern.

**Measurement point:** after Clarify's second worksheet, measure actual shared code. That number replaces the "48%" hypothesis.

### Phase 3 — Recognise and Protect

Scaffolded when their product work begins. Recognise is likely the simplest — a good candidate for the first "add a product to the monorepo" test.

### Phase 4 — Connected operations and publication

Connect Access/Records per app at C. Add publication gating. Add cross-app journey tests where apps genuinely interact. Add observability and operational runbooks.

---

## 13. ADRs to write

1. **ADR-001 — Package manager: npm workspaces.** Rationale, disciplines, revisit trigger, migration path.
2. **ADR-002 — Monorepo topology.** Access and Records outside; Navigator inside; service boundaries.
3. **ADR-003 — Records is a service, not a package.** No shared DB client; contracts describe the wire, not the database.
4. **ADR-004 — Worksheet layout before form engine.** Decision gate and revisit conditions.
5. **ADR-005 — Content publication gating.** Front-matter schema, release manifest, separation of editorial and code review.
6. **ADR-006 — Deployment topology.** Root directory per Worker, watch paths, environments vs Previews.
7. **ADR-007 — Dependency boundaries.** Enforced rules, tooling, exception process.
8. **ADR-008 — Naming hierarchy and host topology.** HeartFirst/Navigator/products; four subdomains; Navigator/Navigate disambiguation; apps/navigator as platform shell.
9. **ADR-009 — App-to-app and package boundaries.** No cross-app imports; package single-role rule; dependency graph.

---

## 14. Questions that need decisions

**Repository and integration**

1. **Intended repository, branch and stable Access/Records checkpoint** — needed before shared Worker changes land.
2. **How are Access and Records consumed** — service binding only, versioned package, or coordinated source dependency?
3. **Root `overrides` ownership** — who owns the security-pin list and its revisit triggers?

**Deployment**

4. **Environment names and binding names** per app and per environment, given bindings are non-inheritable.
5. **Previews vs environments** — which persistent environments exist, and are per-PR Previews enabled?
6. **Observability** — what is shared, and how is health data kept out of logs and traces?

**Contracts**

7. **Contract versioning and consumer-driven tests** — changelog, deprecation window, fixture sync process.
8. **Which operations are available per app** — this is a Records question in its substance but the shape of the answer determines the contracts package; note as interface, not decision.

**Product and worksheet**

9. **Field-level shapes of the first three Clarify and first three Navigate worksheets** — whiteboard sketches are enough; this is the evidence the form-engine question needs.
10. **Does any product need conditional field visibility that `WorksheetLayout` + primitives cannot express?** Document the case before building anything.
11. **Is "read more" per-worksheet content or shared guidance?**
12. **Does Clarify need records at all, or is it primarily educational?** If educational, its shared surface with Prevent may be the shell and tokens, not the record layer.
13. **MC19 activity survival** — per-activity reconciliation of activities tied to specific weeks.

**Content**

14. **Named content owners and clinical reviewers** per product.
15. **Release inventory and publication gate** per product.
16. **How is deferred content represented and prevented from bundling** — front-matter status plus build-time filter, confirmed as the mechanism.

**Deliberately not in this section:** Access entitlement semantics, Stripe/Systeme.io integration, webhook contracts, payment mechanics, ledger design. Those belong to the Access and Records workstreams and are being handled there.

---

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Premature abstraction | Rule of Three; concrete implementations first; measure reuse at Phase 2 |
| Shared DB client creep | ADR-003; contracts package has no I/O; database access stays in Records |
| App-to-app coupling | `dependency-cruiser` rules in CI; no relative cross-app imports |
| Form engine becoming a framework | `WorksheetLayout` first; decision gate documented |
| Phantom dependencies under npm hoisting | `import/no-extraneous-dependencies` with workspace resolution; CI check |
| Dependency version drift | `syncpack` in CI; root `overrides` with documented rationale |
| Missing binding in a new environment | Naming convention plus startup assertion; deployment runbook |
| Large merge redeploying every Worker | Known watch-path bypass at 3000+ files / 20+ commits; release timing accounts for it |
| Unreviewed content reaching production | Front-matter validation and build-time exclusion |
| Contract drift from Records | Consumer-driven tests; shared fixtures; semver discipline |
| CI cost growth | Turborepo affected-only plus Workers Builds watch paths; full-run fallback on `main` |
| Monorepo becoming a mud ball | One-way dependency graph, package single-role rule, CODEOWNERS, no "common" package |
| Navigator shell drifting into a fourth product | Explicit platform-vs-product distinction in ADR-008 and CODEOWNERS; catalog-schema content only |

---

## 16. What to do next, in order

1. **Write ADR-001, ADR-002, ADR-003 and ADR-008.** These four unblock everything else.
2. **Sketch the first three Clarify worksheets at field level.** The evidence the form-engine decision needs; cheaper than building an engine and discovering the shapes differ.
3. **Create `packages/contracts`, `packages/test-support`, `packages/design-tokens`, `packages/content-pipeline`** before any product screen.
4. **Port Prevent into the monorepo** without changing its product semantics or its B1 gate.
5. **Scaffold `apps/navigator`** when hub work begins. Extract `packages/access-client` here or at Clarify's first worksheet, whichever comes first — Rule of Three applies.
6. **Extract `WorksheetLayout`** when the second worksheet needs the same page structure — not before.
7. **Add Clarify, then Navigate** as Workers when their product work begins. Measure actual reuse then; let the measurement replace the hypothesis.
8. **Add Recognise and Protect** when their product work begins — the monorepo should accept them as new entries, not require a restructure.

The monorepo is the right container. What makes it work is the discipline that has governed the source review: share what is genuinely shared, name what is not, and never let a convenient abstraction override a product distinction.