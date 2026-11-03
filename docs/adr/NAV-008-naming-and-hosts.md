# NAV-008 — Naming hierarchy and host topology

**Status:** Accepted — includes the monorepo rename recorded in §Rename record
**Date:** 2 November 2026
**Source:** Monorepo Proposal v0.5 §2, amended by the rename decision
**Related:** NAV-002 (topology) · NAV-006 (asset guard) · NAV-009 (boundaries) · ACC-* (Access contract)

---

## Context

Names are security and clarity surfaces here: hosts are cookie-scoped, Access `createProductWorker` keys on host identity, and the ADR set must cross-reference unambiguously. A family name that sits three letters from a product name invites the wrong repo, the wrong import and the wrong host.

## Decision

### The hierarchy

```
HeartFirst        mission — unbounded.      heartfirst.shyntesy.com
  my              product family.           my.shyntesy.com
    shell         the shell app — a peer.   my.shyntesy.com
    Clarify       product.                  clarify.shyntesy.com
    Navigate      product.                  navigate.shyntesy.com
    Prevent       product.                  prevent.shyntesy.com
    Recognise     product (future).         recognise.shyntesy.com
    Protect       product (future).         protect.shyntesy.com
```

`my` is the product family; the shell is its home surface at `my.shyntesy.com`. **The shell and the products are siblings, not nested** — the shell routes to products, it does not contain them. (The earlier tree nested products under the shell, implying containment — the exact drift the platform-vs-product rule guards against: `apps/shell` creeping toward a fourth product that owns the others. In `apps/`, shell sits beside clarify, navigate and prevent as a peer workspace.) The family still reads naturally — **my clarify, my navigate, my prevent** — and the marketing entry point stays `shyntesy.com` (Systeme.io, outside the monorepo).

### Rename record

**The monorepo is named `my`.** It was previously named "HeartFirst Navigator"; that name is retired and scrubbed from the estate. Rationale:

1. **The top level should read as the family of what sits below it** — my clarify, my navigate, my prevent — the way users will encounter the products.
2. **It removes a three-letter collision with the Navigate product.** "Navigator" vs "navigate" was a standing source of confusion and a genuine security risk: the wrong repo, the wrong import path, the wrong host in a config review.
3. **`my` already carried minimal "view" functionality** (the shell's orientation surface), so the name now covers family and shell without inventing a new word.
4. **It matches the deployed host**: `my.shyntesy.com` is the shell; the repository is its source of truth.

Conventions that follow from the rename:

- Repository root directory: **`my/`**
- Git remote: **`shyntesy/my`** — intentional. `my` as a directory and repository name is unusual (a pronoun, not a name), which is the point: it reads as the family modifier above its apps, not as a product. If the first push lands under a different remote, record the divergence here.
- Package scope: **`@my/*`** (e.g. `@my/contracts/types`, `@my/contracts/runtime`)
- Upstream published types from Records keep their own scope: `@heartfirst/contracts` — unchanged, not ours to rename.
- **ADR prefix `NAV-` is retained.** It predates the rename and is an identifier, not a name; keeping it preserves cross-references from Access (`ACC-*`) and Records (`REC-*`) documents. The prefix is three letters that no longer expand to anything.
- If an app is ever extracted to its own repository, it takes a **`my-<app>`** name — the family relation survives the split.

### Hosts and deployment mapping

| Host | Content | Monorepo origin |
|---|---|---|
| `shyntesy.com` | Sales funnel root (family marketing) | Systeme.io — not in monorepo |
| `shyntesy.com/{clarify,navigate,prevent}` | Product sales pages | Systeme.io — not in monorepo |
| `heartfirst.shyntesy.com` | Mission / about / research | Static — outside scope |
| `my.shyntesy.com` | Post-purchase personal shell: catalog, account, cross-product navigation | `apps/shell` |
| `clarify.shyntesy.com` | Clarify product | `apps/clarify` |
| `navigate.shyntesy.com` | Navigate product | `apps/navigate` |
| `prevent.shyntesy.com` | Prevent product | `apps/prevent` |

Separate product subdomains because:

- **Cookies are host-scoped.** Clarify (least sensitive) cannot exfiltrate a session that reads Prevent (most sensitive).
- **Host-based product identity in Access `createProductWorker` is preserved**, not reimplemented.
- **Route shadows between products are impossible.**
- **Optionality** for future products with different auth surfaces.

### URL story — sales paths stay; subdomains are post-purchase

- `shyntesy.com` remains the marketing entry — no redirect, no migration.
- `shyntesy.com/{product}` remains the product sales page — no redirect, no migration.
- Post-purchase, Access redirects to `{product}.shyntesy.com`.
- The current shyntesy.com landing page — **`navigator.html`, the existing static orientation page** (proposal §2), *not* the Systeme.io funnel surface, which is untouched — becomes `apps/shell` deployed to `my.shyntesy.com`: **a new build, not a port.** The old page is the design reference and the predecessor, not a file that moves.

This resolves the previous open question about SEO and Access host checks: sales URLs and product URLs are disjoint. No redirect exists to confuse crawlers, and no host check is duplicated.

### `apps/shell` is the platform, not a fourth product

Jobs:

- Post-purchase personal destination (sign-in is Access's, not the shell's).
- Product catalog with per-product state.
- Cross-product navigation.
- Account routes.
- Consumes `packages/access-client` more heavily than any single product.

Rules:

- **Content-pipeline schema is a marketing-catalog schema**, not health-guidance (NAV-005).
- **Ownership is platform.** `CODEOWNERS` maps accordingly.
- **Not a landing page to fill.** Orientation is **View** — discrete, present everywhere, not a dashboard. The shell exists to route, not to accumulate.
- **`X-Robots-Tag: noindex` from day one.**
- **Client is non-authoritative** (NAV-007). The shell renders catalog and entitlement state from Access responses; it never computes entitlement itself, never caches it as an authority.

**Route list before build.** The shell serves both public routes (catalog, sign-in entry) and guarded routes (account, entitlement state), so the asset guard is a **route list, not a boolean** (NAV-006). The public/guarded route list is enumerated **before the shell is built** and recorded here as Appendix A.

### Appendix A — shell route list (schema fixed; rows fixed before Phase 2a)

| Route | Method | Access | Session | Notes |
|---|---|---|---|---|
| `/` | GET | public | optional | Catalog; entitlement enrichment only when signed in |
| `/account/**` | GET | guarded | required | Settings, sign-out |

*Rows above are illustrative; the full list is fixed before Phase 2a.* `Access` is `public` or `guarded`; `Session` is `none`, `optional` or `required` — the catalog is public yet session-optional, account surfaces are session-required.

### Recognise and Protect

Not planned now. `apps/` and `content/` are structured so that adding them is a new entry. Recognise may be static-first — do not assume `apps/recognise` without checking (NAV-010).

### Contract resolution

This decision resolves **Contract v1.1 §21.10** — whether Clarify exposes its callback directly or is refactored into a shared monorepo/deployment. Both are now answered: each product Worker keeps its own callback (via `createProductWorker`), and they live in a shared monorepo.

## Consequences

- One word — `my` — covers family, shell host and repository; nothing in the estate sits three letters from `navigate` except `navigate` itself.
- The sales surface (Systeme.io) is untouched; the monorepo owns only post-purchase hosts.
- The shell's failure mode — drifting into a fourth product — is guarded by the platform-vs-product distinction and View-as-orientation.

## Revisit trigger

A future product that cannot live under the `my` family reading (different audience, different auth surface) → new ADR before its host or app name is chosen.
