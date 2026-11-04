# `my` — Worker Adoption Runbook (bun → npm)

**Per-Worker procedure for adopting the existing Clarify, Navigate and Prevent Workers into the monorepo.** Expands NAV-001 (Bun migration) and executes NAV-002 (§Adoption, not migration); the cutover steps are §5 below.

| Worker | Phase | When |
|---|---|---|
| prevent | Phase 0 | Immediately after the scaffold commit — the adoption proof |
| clarify | Phase 2d | With SPA conversion + first worksheets |
| navigate | Phase 2e | Same pattern as Clarify |

**Prevent pass — status (2 November 2026, post-restoration):** §3 done (adoption restored at `953837c` — moves + toolchain; the field source was already npm-based, so §2 and the bun lockfile steps were moot; its sub-`package-lock.json` was not imported — second lockfile, NAV-001). §4 done (the `X-Shell-Version` proof, folded into the same restored commit; verified on the built artifact and inside the wrangler dry-run bundle). **Local dev verified** — the restored adoption folds in the lost history's named follow-ups: the vite plugin no longer restates `nodejs_compat` (miniflare aborted dev startup), and wrangler 4.114.0 + vite plugin 1.47.0 (the Clarify field-proven combination) replaces the field's 4.92.0, whose May-era emulator predates the app's own 2026-07-25 compatibility date — build/test/deploy never start the dev runtime, which is why the original adoption gates stayed green while `npm run dev` failed. Security bumps folded in as well (next 16.4.4, eslint-config-next 16.4.4, vite 8.3.5 — clears the critical audit finding that would have failed CI on first push). All gates re-verified green after restoration. §1 pre-flight remains **open at the cutover**: the deployed version is not locally verifiable — check Workers Builds history before repointing (§5.2). §5 pending: the connection repoint, A1-gated deploy command, first build, and the SHELL_VERSION bump observation are the dashboard-side steps that close Phase 0.

**Restoration record (2 November 2026):** the original repository history — scaffold `d9b4f50`, adoption `7b54de4`, proof `1a35492`, docs `975fbbf`, dev fixes `8f6062d`/`ea956b9`, runbook notes `be7bf56`, tooling `7826173`/`33dc463`, security `cf891ec`/`1bb78da`, and the `pre-monorepo/prevent` tag — was lost to a workspace rollback on the development platform. The tree was restored the same day in three commits (`e65c7fd` scaffold, `953837c` adoption, `2726cc2` tooling + docs) from three sources: the archived first-generation scaffold zip, the Prevent field zip v0.1.0 (md5 `31176f82…` — now also the frozen pre-adoption source, standing in for the lost tag), and the session record. File count matches the lost tree exactly (77); all gates re-run green. If a copy of the final pre-rollback generation exists (the 195,509-byte scaffold zip, md5 `91ba1918…`, or a pushed GitHub remote), it supersedes this restoration as the authoritative source.

**Second and third restore events (2 November 2026, later the same day):** a second workspace rollback destroyed the platform-side `my/` clone together with the panel artefacts built around it (scaffold zip, scripts, doc mirrors, download endpoint). Recovery redefined the architecture instead of replaying it: the owner's GitHub remote — by then carrying the CI-fix series that repaired the restored tree's lockfile, typecheck gate and wrangler config — became the canonical lineage; the platform-side clone was re-cloned from it and has since been kept a pristine downstream mirror (fetch-only), with the scaffold zip regenerated deterministically from its HEAD. A third event then replaced `my/` with a synthetic-commit tree (no remote, UUID commit messages, mixed content state); recovery was a single re-clone, confirmed lossless by the zip fingerprint check. The GitHub-canonical posture is the durable answer to this platform's rollback pattern: loss now costs one command, not one restoration. **A fourth event (same evening) reverted the whole platform workspace to an earlier restore point, taking the panel and the then-unpushed doc drafts with it; the drafts reached the owner in time — this commit series is their canonical landing — and the platform side recovered by re-clone and regeneration, with no loss of record.**

The same runbook serves all three; only the phase and parity gates differ. Phase 0 adoption is **unchanged** — no SPA, no product work, no dependency upgrades beyond what the toolchain requires.

## 1. Pre-flight: source ≥ deployed (the silent-rollback guard)

**The local Worker source is outdated relative to what is currently deployed — this is expected and is fine, but it must be handled explicitly, not discovered after cutover.**

The adoption repoints the Worker's deploy source to the monorepo. From that moment, the monorepo's copy *is* what deploys. If the local source predates the currently deployed version, the first monorepo deploy is a **silent rollback** — production loses fixes it had.

For each Worker, before adoption day:

- [ ] **1.1 Determine what is actually deployed.** Workers Builds build history (if the Worker builds from a repo) or the last manual `wrangler deploy` record. Note version, date, and source commit if identifiable.
- [ ] **1.2 Compare with the local source.** If local ≥ deployed: proceed. If local < deployed: **recover the deployed source first** (from the Worker's current build repo at its deployed commit, or reconstruct and verify), and make that the adopted source.
- [ ] **1.3 Record the reconciliation.** The adoption commit message names the deployed version it supersedes: `adopt prevent: supersedes deployed <version/commit>, source <repo@commit>, tag pre-monorepo/prevent`.
- [ ] **1.4 If reconciliation is impossible** (source of the deployed version cannot be recovered), say so in the commit message and treat the adoption as also being a product decision — the team accepts what the local source contains. Never silent.

## 2. Bun inventory (per Worker, before touching anything)

NAV-001 (Bun migration): verify rather than assume bun was only the package manager.

- [ ] `grep -rn "bun" <worker>/package.json` — scripts (`bun build`, `bun run`, `bun test`, `bunx`), and `packageManager` field if present
- [ ] Check for both lockfile forms: `bun.lock` **and** `bun.lockb`
- [ ] `grep -rn "Bun\." <worker>/src <worker>/worker` — runtime API use (`Bun.file`, `Bun.write`, `Bun.serve`…). Expected: none. If found: replace with Web Standard APIs (`fetch`, `File`/`Blob`, `TextEncoder` — NAV-007, nodejs_compat discipline) **in a separate pre-adoption commit**, tested against the deployed behaviour
- [ ] Check CI files, `Dockerfile`-adjacent scripts, README instructions for bun invocations
- [ ] Note any `bunfig.toml`

## 3. Migration steps (adoption commit)

- [ ] **3.1** Move the Worker's source into `apps/<app>/` **unchanged** — file moves only, no edits in the same commit. (Git rename detection keeps history.)
- [ ] **3.2** Delete `bun.lock` and `bun.lockb`. **A second lockfile anywhere in the repository is a defect** (NAV-001, Disciplines).
- [ ] **3.3** Replace bun script invocations with the npm-toolchain equivalents:
  - `bun build …` → the Vite/Wrangler build the app already has, or `wrangler deploy --dry-run` for verification
  - `bun run <script>` → `npm run <script>` (or nothing — Turbo orchestrates from root)
  - `bun test` → `vitest` (per Proposal §10.1; port the test files' runner imports in this commit)
- [ ] **3.4** Add `"name": "@my/<app>"`, `"private": true`, `"version": "0.1.0"` to the app's `package.json` so the workspace accepts it; internal dependencies (if any) use `"*"`, never `workspace:*` (NAV-001, Disciplines).
- [ ] **3.5** `npm install` at root — the app's dependencies enter the single root lockfile. (No Corepack step: no `packageManager` pin, per NAV-001's review amendment — the Node pin determines the npm version.)
- [ ] **3.6** `turbo run typecheck lint test build` from root — the app enters the graph. Fix boundary violations surfaced by dependency-cruiser / `import/no-extraneous-dependencies` in **follow-up commits**, each named (e.g. `prevent: declare react dependency`) — these are the phantom-dependency cleanups the boundary lint exists to catch (NAV-007, `import/no-extraneous-dependencies`).
- [ ] **3.7** `npx wrangler deploy --dry-run` in `apps/<app>/` — bundle builds from the subdirectory root. This is the local rehearsal of Phase 0's done-criterion 1.
- [ ] **3.8** `node scripts/verify-bindings.mjs` — the app's `wrangler.jsonc` passes binding-naming verification (NAV-006, Service bindings are non-inheritable).

## 4. The contract import (Phase 0 proof, Prevent only)

- [ ] **4.1** Add one import to the Prevent Worker: `import { SHELL_VERSION } from "@my/contracts/types"` and emit it as a response header (e.g. `X-Shell-Version: SHELL_VERSION`) on the workspace response. This is the entire product-side change of Phase 0.
- [ ] **4.2** Verify locally: the header appears in the dev response.
- [ ] **4.3** Commit separately: `prevent: emit SHELL_VERSION from @my/contracts` — so the proof diff is one readable commit, not buried in the adoption.

## 5. Deploy-source cutover (NAV-002 §Adoption, not migration, executed)

- [ ] **5.1** Tag and freeze the pre-adoption source: `pre-monorepo/<app>`. From this point it is not a deploy source; deploying from it is a defect (NAV-002, §Adoption, not migration). Record the tag in the adoption commit message.
- [ ] **5.2** Repoint the Worker's Workers Builds connection to the monorepo — root directory and watch paths per Watch-Path-Matrix.md (Config sketch). **Verified 2 November 2026:** `npm ci` run with root directory `apps/prevent` replays the root lockfile (npm walks up to the workspace root) and creates no second lockfile — root-dir-per-Worker is safe under npm workspaces; `npx turbo` and `npx wrangler` likewise resolve by walking up from the app directory.
- [ ] **5.3** Deploy command carries the A1 gate (NAV-006, Deploy trigger model): unfiltered `turbo run typecheck lint test build` before `wrangler deploy` on `main`.
- [ ] **5.4** Trigger one build; verify the deployed output.
- [ ] **5.5** Phase 0 done-criteria 2–3: the deployed response contains `X-Shell-Version`; **bump `SHELL_VERSION`, push, observe the deployed header change** — a contract change reaches its consumer.
- [ ] **5.6** Watch-path proof: a docs-only commit builds nothing; a `packages/contracts` change builds Prevent only. The two-Worker exclusion proof (a Clarify change does not build Prevent) lands at Phase 2d, when Clarify's connection exists — **no placeholder app** (Checklist criterion 4, amended relative to v0.5 §12).

## 6. What is deliberately NOT done at adoption

- **No SPA conversion** — that is Phase 1+ work with parity gates (NAV-002, §Adoption, not migration: CSP parity, `X-Robots-Tag: noindex` preserved, handoff re-tested, no new external requests).
- **No dependency upgrades** — versions enter the root lockfile as the app declares them; upgrades are their own commits with their own review.
- **No product work, no refactors, no "while we're here"** — the adoption commit is auditable as *moves plus toolchain*, nothing else.
- **No Access changes** — the existing staging binding, DNS and origin registration are reused as-is (Checklist, Notes).

## 7. Emergency path (unchanged)

`turbo deploy -F <app>-worker` remains break-glass (NAV-006, Deploy trigger model — the emergency path lives here, in the runbook): a Cloudflare API token held outside CI, the operator runs the checks the pipeline would have run, every emergency deploy is followed by a written note and a green next normal deploy.

## 8. Phase 2d–2e additions (Clarify, Navigate)

The same runbook plus, at their phases:

- SPA conversion parity gates (§6 above, inverted into requirements)
- Test-ownership split: Access's `shared-product-worker.test.mjs` stays in Access; the product's own shell tests move to `apps/<app>/` — split before porting (NAV-007)
- `packages/access-client` extraction when the shell's need becomes the second consumer (NAV-009, Package roster)
- The two-Worker watch-path exclusion proof (§5.6) becomes provable
