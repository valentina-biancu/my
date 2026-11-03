/**
 * apps/navigate — trivial filtering shell (Phase 0 Checklist, criterion 4).
 *
 * NOT an adoption (NAV-002, Adoption, not migration): no wrangler config,
 * no Workers Builds connection, no deploy. It exists so the scaffold
 * commits a two-app graph — the boundary cruise and CI-level affected
 * filtering have a second app to bite on — and graduates into the real
 * navigate adoption when that phase begins.
 */
export default {
  fetch(): Response {
    return new Response("ok");
  },
};
