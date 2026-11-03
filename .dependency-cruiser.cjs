/** Enforces the NAV-009 boundaries and the NAV-007 dependency graph.
 *
 * Scope: `depcruise apps packages`. `tests/` is deliberately outside
 * the cruise — the cross-app journey suites (Phase 4) are consumers
 * of everything by design, not graph members under the app boundary
 * rules.
 */
module.exports = {
  forbidden: [
    {
      name: "no-app-to-app",
      severity: "error",
      comment: "apps/a ↛ apps/b — shared code moves to packages/",
      from: { path: "^apps/[^/]+" },
      to: { path: "^apps/[^/]+$", pathNot: "^apps/[^/]+/.*" },
    },
    {
      name: "no-packages-to-apps",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-cross-package-relative",
      severity: "error",
      comment: "Import by @my/* name, never relative across boundaries",
      from: { path: "^(apps|packages)/[^/]+" },
      to: { path: "^(apps|packages)/[^/]+", pathNot: "^$1" },
    },
    {
      name: "no-db-client-in-packages",
      severity: "error",
      comment: "NAV-003: no pg client, no SQL, outside apps' own Workers",
      from: { path: "^packages/" },
      to: { dependencyTypes: ["npm", "npm-dev", "npm-optional", "npm-peer"], path: "^(pg|postgres|mysql|sqlite3)$" },
    },
  ],
};
