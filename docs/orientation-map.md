# Orientation map

**Snapshot · 5 November 2026 · claims carry evidence labels — see the key
below. Verify before relying on this for deployment decisions.**

Evidence key, used throughout: **verified from source** (checked against a
pinned commit or an owner-supplied archive — the reference is named with the
claim); **owner-reported** (stated by the owner or in the owner-supplied
review of this map, 5 November 2026 — not independently checked from here);
**proposed** (a recommendation awaiting a decision); **unverified** (recorded
as a checkpoint, not established). Unlabelled summary claims inherit the
evidence of the documents they cite.

Re-verify by: `git log --oneline -3` and the Actions run for the current green
commit; `wrangler deployments list` (or the Cloudflare dashboard) against each
host in §8; `ls apps/` before citing scaffold state. This document describes a
point in time, not a living truth — the header date is what keeps it honest.

Orientation, not a runbook: the estate table, the Access route table, the
customer journey as numbered steps, who owns what, and the open decisions in
the order they'll bite. Drawn from the repo at `e3348ad`, the ADR set
(`docs/adr/`), the Phase 0 execution pack, Access contract v1.1, the rescued
Access source and the Prevent planning pack — and corrected against the
review of this map, 5 November 2026.

## 1. The estate at a glance

| World | Hosts / material | Role |
|---|---|---|
| Sales | `shyntesy.com` (Systeme.io funnel + product sales pages); `heartfirst.shyntesy.com` (static mission page) | sells; never authenticates |
| Access | `access-staging.shyntesy.com` — the recorded staging checkpoint (§8); production hostname unverified | identity, sessions, entitlements, purchase fulfilment, product handoff |
| Products | the `my` monorepo — shell, clarify, navigate, prevent | product experiences; enforce access through the shared Access contracts |
| Records | `github.com/valentina-biancu/records` — repository identified; current inspection blocked by connection permissions | authoritative customer records and record-level permissions — a central runtime service, not a product |
| Development (supporting) | GitHub (canonical) · the dev sandbox (a rollback-prone working surface) · frozen zips · this map | a supporting environment — nothing here serves customers |

**Access never sells. Access owns identity and entitlements; products enforce
access through the shared Access contracts.** That is the whole
architecture in one line. Sales URLs and product URLs are disjoint
(NAV-008): no redirects to confuse crawlers, no host checks duplicated.

The preview panel (rendered by the sandbox environment) is not a deployed
product — it is a development surface for reviewing work in progress.
Nothing shown there is reachable by a customer.

## 2. Who owns what (NAV-003)

| Component | Responsibility |
|---|---|
| `my` monorepo | Product experiences, shared design, content and product-side contracts |
| Access service | Identity, sessions, entitlements and forwarding authorised operations |
| Records service | Authoritative customer records and record-level permissions |
| AWS KMS | Encryption-key protection being prepared for Records |

Access and Records stay outside the product monorepo; the monorepo consumes
their contracts, never their databases. KMS integration belongs on the
Records side — it is not added independently to Clarify, Navigate or Prevent,
and the monorepo does not replace or invalidate that work.

## 3. The customer journey, formalised

1. **Buy** — `shyntesy.com/{product}` (Systeme.io, outside the monorepo) → Stripe checkout.
2. **Fulfil** — Stripe → `POST /api/webhooks/stripe` (Access) → entitlement granted; the Resend webhook tracks delivery.
3. **Land** — `GET /thank-you?session_id=…` handles the thank-you race (`pending` / `ready` / `manual_review` / `not_found`); may poll `GET /api/purchase-status` for at most 60 s.
4. **Email** — Access sends the magic link via Resend. (Email is Resend, not SES — see §9, item 7.)
5. **Sign in** — `GET /magic?token=…&return_to=…` renders a confirmation page; a same-origin POST consumes the token (mail-scanner safe) → Access session, host-only cookie → redirect to `/products`.
6. **Hand off** — the customer selects "Open {product}" → `POST /api/handoffs` (checks session + entitlement) → a random, single-use ticket with a 60-second lifetime and approved target origin → 303 to `{product}.shyntesy.com/auth/callback?ticket=…`.
7. **Open a product session** — *(current mechanism — owner-reported, map review 5 November 2026)* the product reaches Access through its **`PreventAccess` service binding** and uses the **product-session operations documented in the Access repository**: *redeem* consumes the handoff server-side and establishes the product session; *check* revalidates it on protected routes; *revoke* ends it at logout.
8. **Clean URL** — the product redirects to a clean URL with no ticket in it: `Referrer-Policy: no-referrer`, no third-party assets while a ticket was present.

Steps 1–6 follow Access contract v1.1 (§5). Step 7 records the **current**
product-session mechanism for Prevent; v1.1's own shape for the same step
(`POST /internal/handoffs/redeem` per §9.4, then a product-issued session) is
the **earlier handoff generation**. Keep the two distinct when reading older
material, and check the Access repository's current contract before
implementing product-side code — this surface cannot (cloning requires
credentials, §5).

Step 6 is the security architecture in miniature: **the product never
receives the Access session cookie** — the ticket is redeemed server-side
through the service binding and removed from the URL. The one-time ticket
and the product-session token it yields are themselves sensitive bearer
credentials. Their rules differ: the **handoff ticket is single-use and
short-lived** — consumed once at redemption; the **product-session token
is reused across authorised requests** until it expires or is revoked.
Both must be excluded from logs, and neither is ever left in the URL.
This is why Prevent has no password field, and why it never will.

## 4. The Access route table — historical, unreconciled

**Label: historical / unreconciled.** This table was extracted from the
rescued Access SPA and reflects that vintage only. The Access repository
(`github.com/valentina-biancu/access`, §5) contains a Worker implementation
and the later product-session work (§3); it cannot be inspected from this
surface, so the table below has **not** been checked against a pinned Access
commit. Until it is, do not treat its routes, HashRouter behaviour, page
count, table count or webhook implementation as statements about current
Access.

Page routes (rescued SPA, `HashRouter`):

| Route | Page | Guard | Purpose |
|---|---|---|---|
| `/` | RootRedirect | — | authenticated → `/products`; otherwise → `/recover` |
| `/thank-you` | ThankYouPage | public | post-purchase status (the thank-you race) |
| `/check-email` | CheckEmailPage | public | "your secure access email is on its way" |
| `/magic` | MagicConfirmPage | public | magic-link redemption, two-phase |
| `/recover` | RecoveryPage | public | recovery request; the response never reveals whether the email exists |
| `/help/access` | HelpAccessPage | public | help surface |
| `/products` | ProductsPage | SessionGuard | entitlement catalog; "Open {product}" begins the handoff |
| `*` | fallback | — | redirect to `/` |

API surface (rescued-source vintage; the verb/auth matrix in Access contract
v1.1 is itself the earlier contract generation): `/api/checkout`, `/api/magic`,
`/api/recovery`, `/api/session`, `/api/logout`, `/api/handoffs`,
`/api/purchase-status`; internal — `/internal/handoffs/redeem`,
`/internal/entitlements`, `/internal/health`; webhooks —
`/api/webhooks/stripe`, `/api/webhooks/resend`. Data layer: D1, 12-table
schema (rescued vintage). Email: Resend (`lib/resend.ts`; Svix-verified
delivery webhooks).

## 5. Repository map

| Thing | Where | State |
|---|---|---|
| Product monorepo `my` | `github.com/valentina-biancu/my`, `main` = `e3348ad` (pushed) | canonical for all product code and this doc set — verified from source |
| Access service source | `github.com/valentina-biancu/access` — repository identified (owner-reported, map review 5 November 2026); cloning from this surface requires credentials | a TypeScript Worker package (foundation v0.3.6) containing the Worker implementation and the later product-session work (§3); the rescued SPA-era copy and the owner's zips remain the locally inspectable material; outside `my` by design |
| Records service | `github.com/valentina-biancu/records` — **repository identified; current inspection blocked by connection permissions** | an ESM Node package with domain/services, adapters and tests (foundation v0.3.6); owner's side — v0.53.1 → v0.54 patch series, test-support runners, KMS/Roles Anywhere work; design exchanged |
| Older drafts (Prevent v0.1.0, Navigate v0.2, Navigator, Clarify passes) | frozen zips; the Clarify draft is the sandbox app | test fixtures — see §6 |
| Prevent planning pack (foundation v0.3.6 · W05 source findings v0.1.1 · validation matrix v0.4.5 · contract findings v0.1.5) | owner's side; exchanged 5 November 2026 | current specification basis for the Prevent replacement — see §7 |
| Sales funnel | Systeme.io | outside everything here |

**Remote divergence (to record in NAV-008, which asked for it):** NAV-008 and
the README specify the remote as `shyntesy/my` (private); the actual remote
is `github.com/valentina-biancu/my`. Confirm the intended visibility (the
owner has described the repo as public) and record the divergence.

## 6. Baseline labels — what governs and what doesn't

**Authoritative — build from these:**

- The ADR set `NAV-001…NAV-011` (`docs/adr/`), all accepted
- The Phase 0 execution pack (`docs/phase-0/`)
- Access Architecture & Contract v1.1 (`ACC-*`) — a baseline subject to the
  later product-session amendments documented in the Access repository
  (§3: the `PreventAccess` redeem/check/revoke operations supersede the
  contract's §5.4 handoff steps and §9.4 private product contract for the
  current Prevent integration; check the Access repository's current
  contract before implementing product-side code)
- The current product specifications as re-issued (e.g. the Clarify Experience
  & Functional Specification; the Prevent planning pack — foundation v0.3.6
  and W05 source findings, §7)
- The Records design (`REC-*`, v0.54 patch series + the KMS checkpoint in §7)

**Test fixtures — they impose no requirements:**

The drafts of **Prevent, Clarify, Navigate and Navigator are historical
material, not baselines.** They predate the Access/Records decisions. Their
architecture, design, content and features do not constrain the current
build; any reuse must be justified against the current specifications, not
assumed because code exists.

- `apps/prevent` — the field-era Prevent app, adopted unchanged as the Phase 0
  mechanics proof. Standalone access-code login; signed `heartfirst_prevent_session`
  cookie whose payload is `prevent:<expiry>` — product and expiry, no customer
  identity; working data in browser localStorage (`heartfirst-prevent-v1`);
  not saved to Records and not protected by the Records/KMS work. Its
  successful build demonstrates the monorepo's mechanics; it establishes
  nothing about current Prevent functionality or integration readiness.
- The Clarify draft (the sandbox app) — obsolete design, content and features,
  **with one explicit exception below**.
- The Navigate draft (Worker v0.2 zip) — obsolete.
- The Navigator draft (`navigator.html` / `heartfirst-navigator.zip`) —
  obsolete as a product; retained as the design reference for `apps/shell`
  ("a new build, not a port", NAV-008).
- `apps/navigate` — not a draft at all: a trivial filtering shell that returns
  `ok`, present so CI-level affected filtering has a second app to bite on.
  No wrangler config, no Workers Builds connection, deploys nothing.

The phase plan's "adopt the existing *X* Worker" language (proposal §12, the
runbook's Worker table) predates this ruling: at those phases the work is now
replacement per the current specifications, with the runbook's mechanics
(cutover procedure, parity-gate thinking, test-ownership split) still
applying. The deployment question for each product is whether the replacement
implements the intended Access/Records integration — not whether it preserves
the obsolete app's behaviour.

**Clarify's security hardening — the carry-forward requirement
(owner-required).** When the Clarify draft is reviewed: identify the
protections and tests, preserve their security purpose, and adapt their
implementation to the agreed Access/Records architecture. That requirement is
the owner's and carries forward regardless of what the inventory below finds.

**Starting inventory — not yet a verified catalogue.** The items below were
visible in the draft material. Each still needs its actual owner (Clarify or
Access), its evidence (code and tests) and its current disposition recorded
before replacement work relies on it. Several look like Access-side
mechanisms — for those, preservation means the product keeps consuming the
Access contracts correctly, not that Clarify re-implements them:

- The handoff ticket is never accepted from the URL alone — server-side
  redemption through the Access service binding *(Access-side mechanism)*
- Product session expiry derived from Access `session_not_after`, never
  self-issued *(Access-side issuance; the product's derivation is what to
  verify)*
- CSRF protection and rate limiting on mutating routes *(owner to attribute)*
- Tokens stored only as keyed hashes; single-use, expiring *(owner to
  attribute)*
- `Referrer-Policy: no-referrer`; no third-party assets while a ticket is in
  the URL *(product-side obligation, contract v1.1 §5.4)*
- Indexing blocked (robots endpoint, `noindex` posture) *(owner to attribute)*
- Two-phase magic-link consumption — the GET never performs an
  entitlement-changing action *(Access-side mechanism)*

Open item: the draft lives on a rollback-prone dev sandbox (seven events to
date). Capture the hardening inventory — code and tests, with per-item
ownership and evidence — in the repo before replacement work begins, or it is
one rollback away from being lost.

## 7. Where things stand

| Area | Status |
|---|---|
| Monorepo Phase 0 | **CI green at `e3348ad` (HEAD, pushed — docs-only atop the code-fix series `004c1ba`/`7ea5bf7`; confirm the Actions run when citing). 3 of 4 done-criteria blocked on cutover** (runbook §5). CI's `wrangler deploy --dry-run` in `apps/prevent` proves the Next/RSC app bundles cleanly through Wrangler — the deepest unknown before cutover is resolved. |
| Prevent product | **Deployed source at `prevent-staging.shyntesy.com`: unverified** — match the Cloudflare deployment version to source before citing. Two separate things must not be conflated: (1) the **obsolete monorepo fixture** `apps/prevent` (field-era, §6 — a mechanics proof only); (2) the **protected, Access-connected shell foundation** (owner-reported, map review 5 November 2026: the current product Worker serving its fixed workspace at `/` behind a Worker guard, with session, CSRF and logout handling — preserved as a design specimen per foundation v0.3.6). Which source the staging host actually runs is the unverified part. The new Prevent — built from the current specifications, Access/Records-integrated — replaces whatever is there only after passing the checks in the cutover preference below. |
| `apps/clarify` | Not in the repo. Planned as `apps/clarify` (Phase 2d). |
| `apps/shell` | Not in the repo. Planned as `apps/shell` (Phase 2a–2c: static catalog → signed-in state → account surface), serving `my.shyntesy.com`; built new, with `navigator.html` as design reference. |
| `apps/navigate` | Trivial filtering shell; deploys nothing. The real Navigate work is Phase 2e; the draft is a fixture. |
| Access service | Staging deployed and exercised end-to-end (purchase → Resend email → magic link → products → handoff attempt) — owner-reported. Repository identified: `github.com/valentina-biancu/access` (§5); source outside `my` by design. |
| Records + AWS KMS | Staging authentication **passed** (owner-reported) — IAM Roles Anywhere accepted the staging reader cert and issued temporary credentials for the staging KMS reader role. Synthetic decrypt + denial tests (decrypt succeeds; wrong context / altered ciphertext / encryption attempt rejected) are **prepared but unconfirmed**. Live Records integration incomplete. The diagnostic scripts were laptop-local — the real service must not depend on them. Monorepo fit: code in the repo (products, Records contracts, components, backend integration); private keys, passphrases and temporary credentials stay outside. |
| Known issue | Expiry timestamp display off by one hour (winter-time / DST handling; not yet fixed). |

**Before any cutover: identify the deployed source, then reconcile.** The
Access binding is a distinction between two source configurations, not
evidence of dashboard-only configuration: it is **declared in
`products/prevent/wrangler.jsonc` in the Access repository**
(owner-reported, map review 5 November 2026) and **absent from the obsolete
`apps/prevent/wrangler.jsonc` in `my`**, which declares only `DB` (D1,
placeholder) and `ASSETS`. Which source — if either — is what
`prevent-staging.shyntesy.com` runs is the unverified part. Match the
Cloudflare deployment version to source first; the binding question (carry
the Access repository's declaration forward per NAV-006 — service bindings
are non-inheritable and redeclared per environment — or let the Access
handoff return with the replacement build) then attaches to the right
artefact, and must not be silent.

**Cutover — review recommendation, 5 November 2026, awaiting adoption.**
The review's reasoning: the fixture's lack of authority does not make an
interruption to the existing Access-connected staging journey harmless.
The recommendation: **preserve the protected shell until its replacement
passes the handoff, session, logout and readiness checks**, with a separate
fixture deployment to prove monorepo mechanics if needed. It supersedes the
earlier framing — repoint the Workers Builds connection to `apps/prevent`
so the fixture becomes the deploy source at cutover — but receiving a
review does not itself approve an architectural decision: adopt or reject
explicitly before sequencing cutover work.

**The new Prevent's specification basis (exchanged 5 November 2026).** The
Prevent planning pack — foundation v0.3.6, W05 main-source findings v0.1.1,
validation matrix v0.4.5, contract findings v0.1.5 — is the current
specification material for the replacement. Load-bearing points for the
estate: the foundation rules **React + TypeScript + Vite with an explicit
Cloudflare Worker server boundary** (Next.js not required — the fixture's
Next/vinext framework does not carry forward; NAV-006's Vite single-project
layout is unaffected); the **30-Day Heart Risk Action Programme — an extensive
programme, not one of the four tools — is essential** (owner ruling,
5 November 2026; the foundation's "optional structured route" phrasing
was about the customer's entry route — start with the 30-Day programme
or with a core tool — not about the programme being an optional
resource) and **replaces the discarded "session" concept**;
programme activities reference canonical Action Plan and Results Record
entries, and **programme-specific state and review records require the agreed
Records mapping** (e.g. the 30D-11 programme review) — the estate's
Access-forwarded Records path is unchanged, and legitimate programme
persistence is not excluded; and the W05→W06 source-review pass proceeds
independently of the cutover and AWS tracks (no shared-repository or AWS
work required for it).

## 8. Deployment checkpoint

CI-green and deployed are different facts. Deployment from the monorepo has
not been verified in this review. Confirm the Workers Builds connection and
deployed commit in Cloudflare. Deployed-source claims below carry their own
labels.

| Host | Content | Deployed | Source | Verify |
|---|---|---|---|---|
| `shyntesy.com` | Sales funnel | Systeme.io | Systeme.io | — |
| `heartfirst.shyntesy.com` | Mission page | static | outside scope | — |
| `access-staging.shyntesy.com` | Access (staging) | Worker + D1 — owner-reported | manual/dashboard — confirm | `wrangler deployments list` / dashboard |
| Access (production) | — | **unverified** | — | hostname not recorded; confirm before citing |
| `prevent-staging.shyntesy.com` | Prevent (staging) | deployed — **source unverified** | candidates: the Access repository's `products/prevent` configuration (binding declared there) or the obsolete `my` fixture (§7); match the Cloudflare deployment version to source | Workers Builds history (runbook §1.1) + version match |
| `my` · `clarify` · `navigate` · `prevent`.shyntesy.com | products + shell | not yet | `apps/*` at their phases | — |
| GitHub `my` | source of truth | `main` = `e3348ad`, pushed | — | Actions green run |

## 9. Open decisions, in the order they'll bite

1. **Deployed-source identification at `prevent-staging.shyntesy.com`**
   (§7) — match the Cloudflare deployment version to source; the Prevent
   deployment story hangs off this. Bites first.
2. **Phase 0 cutover — review recommendation awaiting adoption** (§7) —
   runbook §5 mechanics still apply (A1-gated deploy, `SHELL_VERSION` bump,
   observe the deployed header). The review recommends preserving the
   protected Access-connected staging shell until the replacement passes
   the handoff, session, logout and readiness checks, with a separate
   fixture deployment for monorepo mechanics if needed. Owner adoption
   decision and timing both pending.
3. **Records runtime location and credential path** (the `REC-*` ADR to
   write when that work resumes): decide **where the Records workload runs
   and how it obtains AWS credentials**. Roles Anywhere is the credential
   approach tested so far — confirm its suitability against the chosen
   Records runtime and credential-delivery design; hosting outside AWS does
   not, by itself, make this particular mechanism mandatory. The staging
   cert work carries forward. Everything else on that track hangs off this.
4. **Access on the forwarding path** — whether Access sees plaintext health
   payloads or forwards blind; and the hot-path shape (envelope encryption
   with cached data keys if per-read KMS round trips are too slow). Same ADR.
5. **Clarify hardening inventory** — catalogue with per-item ownership and
   evidence before the draft sandbox is lost or replaced (§6).
6. **Environments vs Previews** (proposal §14 Q5) — before Phase 1.
7. ~~**IAM: keep or close**~~ — **resolved: keep.** The AWS work is the
   Records encryption track (KMS + IAM Roles Anywhere). It is independent of
   the monorepo and of the email path — email is Resend, and it works. Parked
   with its value intact; resumes with item 3.
8. **Expiry timestamp display** (winter-time / DST) — small; fix before the
   next time the flow is demonstrated.

---

*Snapshot discipline: when this map is next edited, re-date the header,
re-verify the load-bearing cells (green commit, deployed hosts, scaffold
state), re-label any claim whose evidence has changed, and strike anything
the world has passed by. Do not let claims age in place.*
