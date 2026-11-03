# @my/test-support

Test-only; excluded from every app bundle by build config (NAV-009, Package roster).

Arrives with the tests that need it — fixture builders, boundary doubles
(including failure cases), clock/ID injection, and the assertion helpers
for the family invariants: "no record created by browsing", "revision
unchanged", "no cross-subject leak" (NAV-009, Package roster). Empty at Phase 0 is
correct, not a gap: no tests, no fixtures.
