# Glossary

Working vocabulary for the `my` monorepo and its surroundings. A five-minute orientation for a first-time reader; the ADRs remain authoritative where this table and they differ.

| Term | Meaning |
|---|---|
| **Shyntesy** | The company. Owns the whole estate; `shyntesy.com` is the marketing root. |
| **HeartFirst** | The mission — cardiovascular prevention. `heartfirst.shyntesy.com` carries mission/about/research. Not a product, not this repo. |
| **`my`** | This monorepo — the product family. Named for `my.shyntesy.com`, the family's top-level surface (NAV-008). |
| **shell** | The platform app at `my.shyntesy.com`: catalog, account, cross-product navigation. A peer of the products in `apps/` — not their container. |
| **Navigator** | Retired name of this monorepo, pre-rename. Removed to end the three-letter collision with Navigate; the `NAV-*` ADR prefix survives it — it is an identifier, not a name (NAV-008). |
| **Clarify** | Product — five-stage educational flow preparing the health-team conversation. `clarify.shyntesy.com`. Takes no Records dependency at adoption (NAV-004). |
| **Navigate** | Product — interpreting results into a programme. `navigate.shyntesy.com`. |
| **Prevent** | Product — prevention execution. `prevent.shyntesy.com`. Its existing Worker is the Phase 0 adoption proof. |
| **Recognise / Protect** | Future products. `apps/` and `content/` are structured so each is a new entry when its product work begins. |
| **Access** | Independent service outside the monorepo: sign-in, entitlement, purchase, handoff tickets. ADR prefix `ACC-*`. |
| **Records** | Independent service outside the monorepo: the authoritative health-record store. Publishes `@heartfirst/contracts`. ADR prefix `REC-*`. |
| **Systeme.io** | Host of the sales funnel at `shyntesy.com` — outside the monorepo; fed by `sites/` paste-ready blocks (NAV-010). |
| **`NAV-*` / `ACC-*` / `REC-*`** | ADR prefixes: this monorepo / Access / Records (NAV-007). Cross-references cite them; they never expand to anything. |
| **`@my/*`** | Workspace package scope — this repository only. |
| **`@heartfirst/*`** | Upstream package scope — published types from Records (and from Access, once `access-client` is extracted). The scope universe is exactly these two (NAV-003). |
| **Workers Builds** | Cloudflare's repository-connected deploy trigger — the only deploy trigger; `turbo deploy` is break-glass (NAV-006). |
| **Watch paths** | Per-Worker include/exclude globs deciding whether a commit builds that Worker (Watch-Path-Matrix.md). |
| **Adoption** | A Worker entering `apps/` by cutover: pre-adoption source tagged and frozen, Workers Builds connection repointed, parity gates closed — never parallel-running deploy sources (NAV-002). |
