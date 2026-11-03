# my

The product-family monorepo: `apps/shell` (my.shyntesy.com) beside
`apps/clarify`, `apps/navigate` and `apps/prevent` — with `apps/recognise`
and `apps/protect` arriving when their product work begins. The family
reads as *my* clarify, *my* navigate, *my* prevent.

**Three things stay outside, on purpose:** **Access** (sign-in,
entitlement, purchase, handoff) and **Records** (the authoritative
health-record store) remain independent services — this repo consumes
their contracts, never their databases (NAV-003) — and the **Systeme.io
sales funnel** at `shyntesy.com` stays where it is, fed by `sites/`
paste-ready blocks (NAV-010).

Git remote: `shyntesy/my` (private). The `NAV-*` ADR prefix predates the
rename from "Navigator" and is retained as an identifier (NAV-008).

## Current phase — Phase 0

Skeleton + the Prevent adoption proof. **Prevent is adopted**
(`apps/prevent`, unchanged, from the field zip v0.1.0 — tagged
`pre-monorepo/prevent`) and carries `X-Shell-Version` from
`@my/contracts` on every response; the local gates and the wrangler
dry-run are green. What remains is the dashboard side: repoint the
Workers Builds connection to `apps/prevent` and observe the deployed
header — then Phase 0 closes (Worker Adoption Runbook §5). The trivial
`apps/navigate` filtering shell (no wrangler config, no connection)
is present from the scaffold commit — it is not an adoption and
deploys nothing (Phase 0 Checklist, criterion 4). The execution pack is
`docs/phase-0/` — checklist, decision sheet, scaffold spec, adoption
runbook. `packages/ui` and `packages/access-client` are intentionally
absent until two consumers exist (NAV-009).

## Quickstart

Node 24 per `.nvmrc` (the pin); the npm it bundles (floor:
`engines.npm >= 11`). No `packageManager` pin — the Node pin determines
the npm version (NAV-001).

```bash
npm install        # first run only: generates package-lock.json (committed)
npm ci             # every later install — exact lockfile replay, what CI runs
npm run verify     # the full gate as one chain — stops at the first failure
npm run dev -w apps/prevent   # local dev: vite + the workerd emulator
```

`verify` runs the turbo gates (`typecheck && lint && test && build`),
then `verify:deps` (syncpack lint + depcruise over `apps packages` —
the navigate shell and prevent), then `verify:secrets` and
`verify:bindings`. Each part also runs on its own, e.g.
`npm run verify:bindings`.

CI (`.github/workflows/ci.yml`) runs the same checks as separate job
steps — pull requests run turbo affected-filtered against `origin/main`,
pushes to `main` run the full graph. **CI never deploys** — Workers
Builds owns deploys, with the A1 full-run gate inside the deploy
command on `main` (NAV-006).

## Where things live

| Path | What |
|---|---|
| `apps/*` | One Worker per app — shell, clarify, navigate, prevent |
| `packages/contracts` | Product-side types + runtime validation; one package, two entrypoints — `@my/contracts/types`, `@my/contracts/runtime` (NAV-003) |
| `packages/design-tokens` | Semantic CSS variables, light/dark, print |
| `packages/test-support` | Test-only fixtures and assertion helpers (empty at Phase 0, by design) |
| `packages/content-pipeline` | Front-matter validation, release filtering, manifest emission (NAV-005) |
| `content/*` | Per-product content — arrives with content work |
| `sites/` | Paste-ready Systeme.io blocks from design tokens (NAV-010) |
| `tests/` | Cross-app journey suites (Phase 4) |
| `docs/adr/` | Decision records NAV-001 … NAV-011 |
| `docs/glossary.md` | Working vocabulary — read this first if any name here is unfamiliar |
| `docs/phase-0/` | Phase 0 execution pack |
| `docs/watch-path-matrix.md` | Which change paths build which Workers |

## Decisions, by topic

The ADR set in `docs/adr/` governs. Start with NAV-002 (topology) and
NAV-008 (naming and hosts).

**Topology and naming**

| ADR | Title |
|---|---|
| NAV-002 | Monorepo topology — what lives inside, adoption cutover rule |
| NAV-008 | Naming hierarchy and host topology — the `my` rename, host map |

**Boundaries and contracts**

| ADR | Title |
|---|---|
| NAV-003 | Records is a service, not a package |
| NAV-009 | App-to-app and package boundaries |
| NAV-011 | Contract versioning — semver, deprecation windows, changelogs |

**Build and deploy**

| ADR | Title |
|---|---|
| NAV-001 | Package manager: npm workspaces + Turborepo |
| NAV-006 | Deployment topology — root dir per Worker, asset guard, rollback |

**Product and content**

| ADR | Title |
|---|---|
| NAV-004 | WorksheetLayout before any form engine; Clarify's Records posture |
| NAV-005 | Content publication gating |
| NAV-010 | Static estate: `sites/` |

**Operations**

| ADR | Title |
|---|---|
| NAV-007 | Dependency boundaries and operational disciplines |

Decision prefixes across the family: `NAV-*` (this repository), `ACC-*`
(Access), `REC-*` (Records) — NAV-007.
