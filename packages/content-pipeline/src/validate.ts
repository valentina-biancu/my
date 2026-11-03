import { frontMatterSchema } from "@my/contracts/runtime";

/** NAV-005 (Pipeline behaviour): validate + release-filter. The pipeline does NOT approve —
 *  approval is a named human in front matter; this verifies the names
 *  exist and the states are honest (NAV-005, Ownership). */
export function releaseEligible(fm: unknown): boolean {
  const parsed = frontMatterSchema.safeParse(fm);
  if (!parsed.success) return false;
  const { status, reviewer, clinical_review, release_eligible } = parsed.data;
  return status === "approved"
    && reviewer !== "pending"
    && clinical_review !== "pending"
    && release_eligible === true;
}
